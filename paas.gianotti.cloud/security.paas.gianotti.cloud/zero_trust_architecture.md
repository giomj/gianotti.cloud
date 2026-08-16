# Zero trust architecture

The platform started with a perimeter: a load balancer at the edge, and inside
it, workloads that could reach each other freely. Anything that got past the
edge inherited the trust of everything behind it.

This replaces that with a model where position on the network grants nothing.
Every request is authenticated, every connection is encrypted and attributable,
and every workload can reach exactly the things it was declared to need.

## The five decision points

Zero trust is usually drawn as a policy engine and an enforcement point. In a
real Kubernetes platform there are several of each, operating at different
layers, and it matters which one catches what.

```
   Person                                  Workload
     │                                        │
     ▼                                        ▼
 ┌────────────────┐                   ┌──────────────────┐
 │ Keycloak       │  who you are      │ ServiceAccount   │  what you are
 │ + oauth2-proxy │  MFA, groups      │ + mesh identity  │  cert per workload
 └───────┬────────┘                   └────────┬─────────┘
         │                                     │
         ▼                                     ▼
 ┌────────────────┐                   ┌──────────────────┐
 │ ingress-nginx  │  where you enter  │ Linkerd authz    │  who may call whom
 └───────┬────────┘                   └────────┬─────────┘
         │                                     │
         └──────────────┬──────────────────────┘
                        ▼
              ┌──────────────────┐
              │ NetworkPolicy    │  what may route at all
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ Kyverno          │  what may exist in the first place
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ Falco            │  what actually happened
              └──────────────────┘
```

The layering is deliberate. NetworkPolicy is enforced by the CNI on the node, so
it holds for traffic that never touches a mesh proxy — including traffic from a
compromised pod that has disabled its own sidecar. Mesh authorization is
enforced by the proxy and knows workload identity, which the CNI does not. Pod
Security Admission is enforced by the API server itself, so it survives Kyverno
being unavailable. Each layer covers a failure mode of the one above.

## What each layer does

### Identity — who is asking

Human access to the admin console runs through oauth2-proxy in front of
Keycloak. An operator must authenticate, be a member of `platform-admins`, and
have enrolled TOTP. The console previously sat behind HTTP basic auth, which is
a shared secret with no identity, no second factor, and no way to revoke one
person's access without rotating it for everyone.

Sessions are deliberately short. Access tokens expire in five minutes, idle
sessions in thirty, and refresh tokens are single-use. Revoking an account takes
effect in minutes rather than at the next login, which is what tenet 3 of NIST
SP 800-207 — per-session access — means in OIDC terms.

End users are not forced into TOTP. Someone signing in through Google already
carries Google's authentication strength, and requiring TOTP on consumer signups
trades a lot of conversion for little marginal security. If end users ever reach
regulated data, that calculation changes.

### Workload identity — what is asking

Every pod gets a certificate derived from its ServiceAccount, issued by a mesh
CA whose root Terraform generates and whose intermediate is short-lived. Two
pods in the same namespace are distinguishable to the policy layer, so
"compromise one workload, reach its neighbours" stops being free.

This is why Kyverno rejects pods using the `default` ServiceAccount. Workloads
sharing an identity cannot be told apart, which makes per-workload authorization
decorative.

### Network — what may route

Every namespace denies all ingress *and* all egress. Then, explicitly:

- DNS, because nothing resolves without it
- inbound HTTP from the ingress controller only
- outbound to the managed database, on its port, on the VPC range only
- outbound to Keycloak on 8080, for JWKS
- outbound HTTPS to the internet, only for namespaces that declared they need it

Egress default-deny is the half people skip, and it is the half that matters
after a compromise. An attacker in a container that cannot open outbound
connections cannot pull a second stage, cannot exfiltrate, and cannot phone
home.

The internet egress rules exclude `169.254.0.0/16` and the RFC1918 ranges. That
exclusion is the SSRF and cloud-metadata guard: a workload with a legitimate
reason to call an external API cannot use that same rule to reach the metadata
endpoint or pivot to another namespace.

### Admission — what may exist

Kyverno evaluates everything entering the cluster: memory limits required, no
`:latest`, images only from allowlisted registries, no host namespaces or
hostPath, no default ServiceAccount, no API token mounted unless the workload
actually calls the API. With a cosign key configured, unsigned images are
rejected outright.

Pod Security Admission enforces `restricted` at the same time. Kyverno gives
better messages and covers more ground; PSA is enforced by the API server and
cannot be bypassed by taking Kyverno down.

New namespaces automatically receive a deny-all NetworkPolicy through a Kyverno
generate rule, so there is no window in which a namespace exists but is
unsegmented.

### Detection — what happened

Zero trust assumes breach, which means prevention failing is an expected state
rather than a surprise. Falco watches syscalls on every node with rules written
for this platform specifically: a shell in an application container, a read of a
service account token, a connection to the metadata endpoint, a package manager
running at runtime, a write below a system directory on a supposedly read-only
filesystem.

Several rules exist specifically to catch a *control* failing rather than an
attacker succeeding. If "service account token read" fires, an admission policy
has been bypassed. If "metadata endpoint contacted" fires, NetworkPolicy is not
being enforced. Those are the alerts worth waking up for.

## Deliberate trade-offs

**Linkerd over Istio.** Three `s-2vcpu-4gb` nodes cannot comfortably carry an
Envoy sidecar per pod plus an Istio control plane. Linkerd's proxy costs a
fraction of that. The trade is that request-level JWT authorization happens in
the application rather than the mesh — acceptable here because the API already
verifies tokens against the realm JWKS. If you later need claims-based
authorization at the mesh or multi-cluster federation, Istio ambient mode is the
migration target.

**Mesh enforcement is off by default.** `mesh_enforce_authz` starts `false`.
Turning on default-deny before the authorization policies are applied and
verified takes the platform down. Apply the policies, confirm traffic flows,
then flip it.

**Admission policies default to Enforce.** The opposite call, because a policy
in Audit mode that nobody reads is a control on paper only. If a rollout starts
failing, the failure is loud and the message says why. Run one apply in Audit
first if you are retrofitting onto existing workloads.

**Kyverno fails open.** If the admission controller is unavailable, admission
continues rather than the cluster freezing. On a three-node platform the
availability risk of failing closed outweighs the security benefit; the
compensating control is Kyverno's background scan, which reports anything
admitted while it was down.

## Deploying it

```bash
cp terraform/03-security/terraform.tfvars.example terraform/03-security/terraform.tfvars
# fill in cluster_name, vpc_name, database_cluster_name, domain

terraform -chdir=terraform/03-security init
terraform -chdir=terraform/03-security apply

bash scripts/security-bootstrap.sh
bash scripts/verify-controls.sh
```

Then, in order:

1. Add administrators to the `platform-admins` group in Keycloak and re-run
   `security-bootstrap.sh` so they are required to enrol TOTP.
2. Confirm every service is healthy with the mesh policies applied, then set
   `mesh_enforce_authz = true` and re-apply.
3. Sign your images, set `cosign_public_key`, and re-run the bootstrap.
4. Narrow `admin_console_allowed_cidrs` from `0.0.0.0/0`.
5. Read `docs/compliance-mapping.md`, particularly the two findings at the top
   and gap G-1, which is a one-line fix.

## Rotation and expiry

| Item | Lifetime | Action |
| --- | --- | --- |
| Mesh trust anchor | 1 year | Staged rotation; see the Linkerd docs before doing it in production |
| Mesh issuer | 90 days | Re-apply stage 03, or adopt `security/linkerd/cert-manager-rotation.yaml` for automatic 48-hour rotation |
| TLS certificates | 90 days | Automatic via cert-manager |
| Keycloak admin password | Manual | Rotate after initial setup; the bootstrap password should not be permanent |
| Database roles | Manual | Rotate at least annually and after any suspected exposure |

`terraform -chdir=terraform/03-security output` prints the mesh expiry dates. Put
them in a calendar; an expired mesh issuer stops all in-mesh traffic.
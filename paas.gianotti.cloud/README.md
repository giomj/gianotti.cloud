# Platform on DigitalOcean Kubernetes

Everything needed to go from an empty DigitalOcean account to a running
three-node platform: a private network, a DOKS cluster, a managed Postgres
cluster, one namespace per application wired to its own database, public
ingress with automatic TLS, and an identity service an administrator can
configure from a browser.

```
                          Internet
                             │
                    DO Load Balancer  (TCP + PROXY protocol)
                             │
                   ┌─────────┴──────────┐
                   │   ingress-nginx    │  TLS terminated here
                   └─────────┬──────────┘
                             │
   ┌──────────┬──────────┬───┴──────┬────────────────────┐
   │   api    │   web    │   jobs   │      identity      │   namespaces
   │          │          │          │  keycloak + admin  │
   └────┬─────┴────┬─────┴────┬─────┴──────────┬─────────┘
        │          │          │                │
        └──────────┴────┬─────┴────────────────┘
                        │  VPC-private, per-app credentials
              Managed PostgreSQL (firewalled to the cluster)
```

## Layout

| Path | What it is |
| --- | --- |
| `compose.yaml` | The whole platform on a laptop: Postgres, Keycloak, and every app image |
| `terraform/01-infra` | VPC, DOKS cluster, managed Postgres, per-app databases and roles, container registry |
| `terraform/02-platform` | Namespaces, database secrets, ingress-nginx, cert-manager, DNS, Keycloak, admin console |
| `terraform/03-security` | Zero trust: service mesh mTLS, admission control, segmentation, runtime detection, admin SSO |
| `admin-ui/` | Administrator console container: signups and Google sign-in |
| `apps/api` | API starter: managed database plus access-token verification |
| `apps/jobs` | Worker starter: interval loop behind a Postgres advisory lock |
| `apps/web` | Frontend starter: sign-up, sign-in, and Google via PKCE |
| `ops/` | Pinned toolchain image (terraform, kubectl, helm, doctl) |
| `k8s/apps` | Per-application manifests |
| `k8s/` | ClusterIssuer and a generic application template |
| `scripts/keycloak-bootstrap.sh` | Realm and client setup, shared by compose and the cluster |
| `security/` | Kyverno policies, mesh authorization, Falco rules |
| `docs/` | Zero trust design, and the compliance mapping with its gap register |
| `scripts/bootstrap.sh` | Runs the whole cloud sequence end to end |
| `scripts/verify-controls.sh` | Machine-checks every control and writes dated evidence |
| `.github/workflows` | Checks on every PR, build and rollout on main |

Two Terraform stages rather than one, because the Kubernetes and Helm providers
need a cluster endpoint that does not exist during the first plan. Stage 02
discovers the cluster and database by name, so the stages share no state.

## Run it locally first

Nothing but Docker required. No DigitalOcean account, no domain, no cost.

```bash
cp .env.example .env
make dev
```

| Service | Address | Notes |
| --- | --- | --- |
| Web frontend | http://localhost:3001 | Sign up, sign in, or use Google |
| API | http://localhost:3000 | `/healthz`, `/readyz`, `/api/whoami` |
| Identity admin | http://localhost:8081 | Turn on Google sign-in |
| Keycloak | http://localhost:8080 | `kcadmin` / `kcadmin` |

The compose stack runs `scripts/keycloak-bootstrap.sh` — the same file the
in-cluster Job runs — so the realm, the admin console service account, and the
public web client are configured identically to production. Signups start open
locally so there is something to test against.

To try Google sign-in locally, create an OAuth client in Google Cloud with the
redirect URI `http://localhost:8080/realms/platform/broker/google/endpoint` and
paste the credentials into the identity admin console at :8081.

`make dev-reset` deletes the database volume and starts over.

## Everything runs through the toolchain image

`ops/Dockerfile` pins terraform, kubectl, helm, and doctl. Running commands
through it means a laptop and a CI runner use identical versions:

```bash
bash scripts/ops "terraform -chdir=terraform/01-infra plan"
bash scripts/ops              # interactive shell
```

The repository mounts at `/work` and Terraform's plugin cache persists in a
named volume, so repeat `init` runs are fast.

## Prerequisites

- Docker, for the local stack and the toolchain image
- A DigitalOcean API token with read/write scope
- A domain whose nameservers point at `ns1.digitalocean.com` (and ns2, ns3)

Installing terraform, kubectl, helm, and doctl on the host is optional; every
command can go through `bash scripts/ops` instead.

## Stand it up

```bash
chmod +x scripts/*.sh scripts/ops dev/*.sh   # if your checkout lost the exec bits
export DIGITALOCEAN_TOKEN=dop_v1_...

cp terraform/01-infra/terraform.tfvars.example    terraform/01-infra/terraform.tfvars
cp terraform/02-platform/terraform.tfvars.example terraform/02-platform/terraform.tfvars
# edit both: project name, region, domain, letsencrypt_email, applications

bash scripts/bootstrap.sh
```

Roughly 15 minutes, most of it cluster and database provisioning. The script is
idempotent; re-run it after any change.

## Applications

Three starters ship in `apps/`, each a container that runs unchanged locally and
in the cluster.

**`api`** — reads `DATABASE_URL` from the namespace secret and verifies access
tokens against the realm's JWKS endpoint using only `node:crypto`. `/healthz`
answers even when the database is down, so a database blip does not restart
healthy pods; `/readyz` fails, which takes the pod out of the load balancer
instead. `npm test` covers the token paths that matter: expiry, wrong issuer,
tampered signatures, `alg: none` downgrade, and audience mismatch.

**`jobs`** — an interval loop that takes a Postgres advisory lock before each
cycle, so extra replicas are standbys rather than duplicate work. Liveness is a
heartbeat file the worker touches each cycle; a wedged worker stops touching it
and gets replaced. SIGTERM finishes the current cycle before exiting.

**`web`** — static files on unprivileged nginx, with Authorization Code + PKCE
against the realm. Three entry points: create an account, sign in, or go
straight to Google with `kc_idp_hint`. Configuration is written at container
start, so one image promotes from laptop to production unchanged.

### Connecting an application to its database

Terraform creates one secret named `database` in each application namespace,
containing `DATABASE_URL` plus discrete `PG*` variables and the managed
database's CA certificate. Applications consume it with `envFrom`:

```yaml
envFrom:
  - secretRef:
      name: database
```

Each application gets its own database and its own role. Nothing is shared, and
the database firewall accepts connections only from the cluster over the VPC.

`k8s/apps/*.yaml` holds the manifests, templated with envsubst. Add a new
application by adding it to `applications` in both `terraform.tfvars` files and
copying `k8s/example-app.yaml`.

## Continuous integration

`ci.yml` runs on every pull request: Terraform fmt and validate for both stages,
a syntax pass over every JavaScript and shell file, a build of all four images,
and — the useful one — it brings the full compose stack up and asserts the realm
resolves, the admin console reaches Keycloak, the API is ready and rejects
unauthenticated calls, and the frontend serves its runtime config.

`deploy.yml` runs on main: builds and pushes images tagged with the commit SHA,
applies the platform stage with the new admin console image, then rolls out the
applications and waits for each deployment.

Set these repository variables and secrets:

| Kind | Name |
| --- | --- |
| Secret | `DIGITALOCEAN_ACCESS_TOKEN` |
| Variable | `DO_CLUSTER_NAME`, `DO_DATABASE_CLUSTER_NAME`, `DO_REGISTRY_NAME` |
| Variable | `PLATFORM_DOMAIN`, `LETSENCRYPT_EMAIL` |

## Security

`terraform/03-security` turns the platform from perimeter-defended into zero
trust. Nothing about position on the network grants access.

```bash
cp terraform/03-security/terraform.tfvars.example terraform/03-security/terraform.tfvars
make security
make verify
```

What it adds:

- **Mutual TLS everywhere.** Linkerd issues each pod a certificate derived from
  its ServiceAccount. Workloads are cryptographically distinguishable, so
  authorization can be per-workload rather than per-network-location.
- **Default-deny networking, both directions.** Every namespace denies all
  ingress and all egress, then re-opens exactly what was declared. Egress rules
  exclude link-local and RFC1918, which is what stops a compromised container
  reaching the cloud metadata endpoint or pivoting sideways.
- **Admission control.** Kyverno rejects privileged pods, host namespaces,
  mutable tags, unknown registries, the default ServiceAccount, and unsigned
  images. Pod Security Admission enforces `restricted` underneath as a backstop
  the API server itself applies.
- **Runtime detection.** Falco on every node, with rules written for this
  platform. Several exist to catch a *control* failing rather than an attacker
  succeeding — if "metadata endpoint contacted" fires, NetworkPolicy is not
  being enforced.
- **Admin access through the platform's own identity provider.** The console
  moves off HTTP basic auth and behind oauth2-proxy: authenticate to Keycloak,
  be in `platform-admins`, have TOTP enrolled.

`docs/zero-trust-architecture.md` explains the layering and the trade-offs.

### Verifying it

A control that is configured but not verified is a claim. `make verify` checks
what can be checked from inside the cluster and writes a dated evidence file
mapped to PCI DSS, NIST 800-53, CISA ZTMM, and the Kubernetes STIG. It runs in
CI on every deploy and the evidence is retained for a year.

### Compliance

`docs/compliance-mapping.md` is the full mapping and gap register. Two findings
there change the picture and are worth knowing before you plan around this:

- **DigitalOcean is not FedRAMP authorised.** For DoD or federal work, no amount
  of STIG hardening inside the cluster produces an ATO on a non-authorised
  provider. The STIGs remain useful as a hardening benchmark; the authorisation
  path is not available without moving providers.
- **DigitalOcean's PCI validation is an SAQ-A for its own administrative
  environment**, not a Level 1 service provider AOC covering customer
  infrastructure. You cannot inherit CDE controls here the way you can on AWS,
  Azure, or GCP. The recommendation is to keep cardholder data off the platform
  entirely by using a hosted payment page, which reduces scope to SAQ-A and
  makes most of Requirements 3, 4, 9, and 10 stop applying to your systems.

The honest summary of maturity, using CISA's four stages: **Initial trending
Advanced**, strong on Networks, Applications, and Automation, weak on Devices
and Data. The gap register lists twelve items with effort estimates; G-1 is a
one-line fix worth doing today.

## Configure identity

Open the admin console at `https://identity-admin.<your domain>`:

```bash
terraform -chdir=terraform/02-platform output -raw admin_console_username
terraform -chdir=terraform/02-platform output -raw admin_console_password
```

The console does two things.

**Signups.** Toggle whether people can create their own accounts, whether the
email address doubles as the username, whether email confirmation is required,
and whether the sign-in page offers password reset.

**Google sign-in.** In the Google Cloud console, create an OAuth 2.0 client of
type *Web application* and add this authorised redirect URI:

```bash
terraform -chdir=terraform/02-platform output -raw google_redirect_uri
# https://id.<domain>/realms/platform/broker/google/endpoint
```

Paste the client ID and secret into the console and save. A "Sign in with
Google" button appears on the sign-in page immediately. Optionally restrict it
to a single Google Workspace domain.

The bootstrap job also creates a public PKCE client called `web` with redirect
URIs for the apex and www hosts, which is what the frontend starter uses. Change
`web_redirect_uris` in `terraform.tfvars` if your frontend lives elsewhere.

Behind the console, Keycloak's own admin console stays available at
`https://id.<domain>/admin` for anything the operator console does not cover:

```bash
terraform -chdir=terraform/02-platform output -raw keycloak_admin_password
```

### Sending mail

Email confirmation and password reset both need SMTP, which is realm
configuration rather than infrastructure. Set it under *Realm settings → Email*
in the Keycloak admin console before turning either option on, or people will
sign up and never receive the message.

## What is deliberately left to you

- **SMTP.** No mail provider is assumed.
- **Backups beyond the managed defaults.** DigitalOcean takes daily database
  backups with 7-day retention. Longer retention or off-provider copies are a
  separate decision.
- **Observability.** `metrics.enabled` is on for ingress-nginx and Keycloak, but
  nothing scrapes them yet. Add Prometheus when you know what you want to alert on.
- **Device trust.** The platform has no knowledge of the machines operators use.
  This is the largest remaining zero trust gap; see G-6 in the compliance
  mapping.
- **Log retention and SIEM.** Detections are forwarded but not correlated or
  retained for 12 months; see G-4.

## Costs, roughly

Three `s-2vcpu-4gb` nodes, a single-node `db-s-1vcpu-2gb` Postgres, one load
balancer, and a basic registry land near USD 150/month at list price. An HA
control plane and a database standby add meaningfully to that; both are
one-line changes in `terraform.tfvars`.

## Tearing it down

```bash
terraform -chdir=terraform/02-platform destroy
terraform -chdir=terraform/01-infra destroy
```

Stage 02 first, so the load balancer and certificates are released before the
cluster disappears.
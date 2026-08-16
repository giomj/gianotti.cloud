#!/usr/bin/env bash
#
# Applies the parts of the zero trust architecture that depend on CRDs, which
# Terraform cannot plan before those CRDs exist.
#
#   1. Kyverno admission policies
#   2. Linkerd per-workload authorization policies
#   3. Keycloak identity hardening
#
# Run after `terraform -chdir=terraform/03-security apply`. Idempotent.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECURITY="$ROOT/terraform/03-security"
PLATFORM="$ROOT/terraform/02-platform"

log()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m    %s\033[0m\n' "$*"; }
die()  { printf '\033[31mError: %s\033[0m\n' "$*" >&2; exit 1; }

for tool in kubectl terraform envsubst; do
  command -v "$tool" >/dev/null 2>&1 || die "$tool is not installed."
done

APPLY_MESH_POLICIES="${APPLY_MESH_POLICIES:-1}"
APPLY_KEYCLOAK_HARDENING="${APPLY_KEYCLOAK_HARDENING:-1}"

# --- 1. Admission policies ---------------------------------------------------

if kubectl get crd clusterpolicies.kyverno.io >/dev/null 2>&1; then
  log "Applying admission policies"

  kubectl -n kyverno rollout status deploy/kyverno-admission-controller --timeout=300s

  FAILURE_ACTION="$(kubectl -n kyverno get configmap platform-policy-settings -o jsonpath='{.data.failureAction}' 2>/dev/null || echo Audit)"
  REGISTRIES_CSV="$(kubectl -n kyverno get configmap platform-policy-settings -o jsonpath='{.data.allowedRegistries}' 2>/dev/null || echo 'registry.digitalocean.com/*')"
  COSIGN_PUBLIC_KEY="$(kubectl -n kyverno get configmap platform-policy-settings -o jsonpath='{.data.cosignPublicKey}' 2>/dev/null || echo '')"

  # Kyverno patterns treat " | " as OR inside a single value.
  ALLOWED_REGISTRIES_YAML="$(echo "$REGISTRIES_CSV" | sed 's/,/ | /g')"

  export FAILURE_ACTION ALLOWED_REGISTRIES_YAML COSIGN_PUBLIC_KEY

  for policy in "$ROOT"/security/kyverno/0[123]-*.yaml; do
    echo "  $(basename "$policy")"
    envsubst < "$policy" | kubectl apply -f -
  done

  if [ -n "$COSIGN_PUBLIC_KEY" ]; then
    echo "  04-image-signatures.yaml"
    # Indent the PEM to sit correctly under the YAML block scalar.
    COSIGN_PUBLIC_KEY="$(echo "$COSIGN_PUBLIC_KEY" | sed 's/^/                      /' | sed '1s/^ *//')"
    export COSIGN_PUBLIC_KEY
    envsubst < "$ROOT/security/kyverno/04-image-signatures.yaml" | kubectl apply -f -
  else
    warn "No cosign public key configured; image signature enforcement is OFF."
    warn "Set cosign_public_key in terraform/03-security/terraform.tfvars to close this gap."
  fi

  echo
  echo "  Policies now active (failureAction=$FAILURE_ACTION):"
  kubectl get clusterpolicy -o custom-columns=NAME:.metadata.name,BACKGROUND:.spec.background,ACTION:.spec.validationFailureAction --no-headers | sed 's/^/    /'
else
  warn "Kyverno CRDs not found; skipping admission policies."
fi

# --- 2. Mesh authorization ---------------------------------------------------

if [ "$APPLY_MESH_POLICIES" = "1" ] && kubectl get crd servers.policy.linkerd.io >/dev/null 2>&1; then
  log "Applying mesh authorization policies"

  kubectl -n linkerd rollout status deploy/linkerd-destination --timeout=300s
  kubectl apply -f "$ROOT/security/linkerd/authorization-policies.yaml"

  echo
  warn "Traffic is still permitted by default. Verify every service is healthy,"
  warn "then set mesh_enforce_authz = true and re-apply stage 03 to deny by default."
else
  warn "Linkerd policy CRDs not found; skipping mesh authorization."
fi

# --- 3. Identity hardening ---------------------------------------------------

if [ "$APPLY_KEYCLOAK_HARDENING" = "1" ]; then
  log "Hardening the Keycloak realm"

  REALM="$(terraform -chdir="$PLATFORM" output -raw identity_url 2>/dev/null >/dev/null && \
           terraform -chdir="$PLATFORM" output -json 2>/dev/null | \
           python3 -c 'import json,sys; print(json.load(sys.stdin).get("keycloak_realm",{}).get("value","platform"))' 2>/dev/null || echo platform)"
  REALM="${REALM:-platform}"

  ADMIN_GROUP="$(grep -E '^\s*admin_group' "$SECURITY/terraform.tfvars" 2>/dev/null | cut -d'"' -f2 || echo platform-admins)"
  ADMIN_GROUP="${ADMIN_GROUP:-platform-admins}"

  ADMIN_HOST="$(terraform -chdir="$PLATFORM" output -raw admin_console_url 2>/dev/null || echo '')"
  PROXY_SECRET="$(terraform -chdir="$SECURITY" output -raw admin_proxy_client_secret 2>/dev/null || echo '')"

  kubectl -n identity delete configmap keycloak-harden --ignore-not-found >/dev/null
  kubectl -n identity create configmap keycloak-harden \
    --from-file=harden.sh="$ROOT/scripts/keycloak-harden.sh" >/dev/null

  kubectl -n identity delete job keycloak-harden --ignore-not-found >/dev/null

  KEYCLOAK_IMAGE="$(kubectl -n identity get deploy keycloak -o jsonpath='{.spec.template.spec.containers[0].image}')"

  cat <<JOB | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: keycloak-harden
  namespace: identity
spec:
  backoffLimit: 3
  template:
    metadata:
      annotations:
        linkerd.io/inject: disabled
    spec:
      restartPolicy: OnFailure
      volumes:
        - name: script
          configMap:
            name: keycloak-harden
            defaultMode: 0555
      containers:
        - name: kcadm
          image: ${KEYCLOAK_IMAGE}
          command: ["/bin/bash", "/scripts/harden.sh"]
          volumeMounts:
            - name: script
              mountPath: /scripts
              readOnly: true
          env:
            - name: KEYCLOAK_URL
              value: http://keycloak.identity.svc.cluster.local:8080
            - name: REALM
              value: "${REALM}"
            - name: ADMIN_GROUP
              value: "${ADMIN_GROUP}"
            - name: REQUIRE_MFA
              value: "true"
            - name: ADMIN_PROXY_CLIENT_ID
              value: "admin-console-proxy"
            - name: ADMIN_PROXY_CLIENT_SECRET
              value: "${PROXY_SECRET}"
            - name: ADMIN_PROXY_REDIRECT_URI
              value: "${ADMIN_HOST}/oauth2/callback"
            - name: KEYCLOAK_ADMIN
              valueFrom:
                secretKeyRef:
                  name: keycloak-bootstrap-admin
                  key: username
            - name: KEYCLOAK_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: keycloak-bootstrap-admin
                  key: password
          resources:
            requests: { cpu: 50m, memory: 256Mi }
            limits: { memory: 512Mi }
JOB

  kubectl -n identity wait --for=condition=complete job/keycloak-harden --timeout=600s \
    || { kubectl -n identity logs job/keycloak-harden --tail=50; die "Realm hardening failed."; }

  kubectl -n identity logs job/keycloak-harden --tail=40
fi

log "Security bootstrap complete"

cat <<'NEXT'

Before this counts as deployed:

  1. Add your administrators to the platform-admins group in Keycloak, then
     re-run this script so they are required to enrol TOTP.

  2. Run the control verification and read the report:

       bash scripts/verify-controls.sh

  3. When every service is healthy with the mesh policies applied, set
     mesh_enforce_authz = true and re-apply stage 03. Until then the mesh
     encrypts and authenticates but does not deny.

  4. Sign your images and set cosign_public_key, or admission is trusting
     whatever lands in the registry.
NEXT
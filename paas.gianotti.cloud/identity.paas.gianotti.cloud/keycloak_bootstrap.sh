#!/usr/bin/env bash
#
# Brings a Keycloak instance to the state the platform expects:
#
#   - the end-user realm exists
#   - a confidential service-account client the admin console uses
#   - a public PKCE client the web frontend uses
#
# Idempotent. The local compose stack and the in-cluster Job both run this file,
# so development and production cannot drift apart.
#
# Required:  KEYCLOAK_URL REALM KEYCLOAK_ADMIN KEYCLOAK_ADMIN_PASSWORD
#            CLIENT_ID CLIENT_SECRET
# Optional:  REALM_DISPLAY_NAME WEB_CLIENT_ID WEB_REDIRECT_URIS WEB_ORIGINS
#            REGISTRATION_ALLOWED

set -euo pipefail

KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"

for required in KEYCLOAK_URL REALM KEYCLOAK_ADMIN KEYCLOAK_ADMIN_PASSWORD CLIENT_ID CLIENT_SECRET; do
  if [ -z "${!required:-}" ]; then
    echo "Missing required variable: $required" >&2
    exit 2
  fi
done

REALM_DISPLAY_NAME="${REALM_DISPLAY_NAME:-$REALM}"
REGISTRATION_ALLOWED="${REGISTRATION_ALLOWED:-false}"

# --- Wait for Keycloak -------------------------------------------------------

hostport="${KEYCLOAK_URL#*://}"
hostport="${hostport%%/*}"
host="${hostport%%:*}"
port="${hostport##*:}"
[ "$port" = "$host" ] && port=80

echo "Waiting for Keycloak at $host:$port"
for _ in $(seq 1 120); do
  if (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null; then
    exec 3>&- 2>/dev/null || true
    break
  fi
  sleep 5
done

# The port opens before the admin API is usable, so retry the login itself.
for attempt in $(seq 1 30); do
  if "$KCADM" config credentials \
      --server "$KEYCLOAK_URL" \
      --realm master \
      --user "$KEYCLOAK_ADMIN" \
      --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "Could not log in to Keycloak at $KEYCLOAK_URL after 30 attempts." >&2
    exit 1
  fi
  sleep 5
done

echo "Connected to $KEYCLOAK_URL"

# --- Realm -------------------------------------------------------------------

if "$KCADM" get "realms/$REALM" >/dev/null 2>&1; then
  echo "Realm $REALM already exists; leaving its settings alone."
else
  echo "Creating realm $REALM"
  "$KCADM" create realms \
    -s realm="$REALM" \
    -s enabled=true \
    -s displayName="$REALM_DISPLAY_NAME" \
    -s sslRequired=external \
    -s registrationAllowed="$REGISTRATION_ALLOWED" \
    -s registrationEmailAsUsername=true \
    -s loginWithEmailAllowed=true \
    -s duplicateEmailsAllowed=false \
    -s resetPasswordAllowed=true \
    -s rememberMe=true \
    -s verifyEmail=false \
    -s bruteForceProtected=true
fi

# --- Admin console service account -------------------------------------------
# Lives in the master realm and holds the master `admin` role, which is what
# lets it manage other realms.

CID="$("$KCADM" get clients -r master -q clientId="$CLIENT_ID" --fields id --format csv --noquotes 2>/dev/null | tr -d '\r' | head -n1)"

if [ -z "$CID" ]; then
  echo "Creating service-account client $CLIENT_ID"
  "$KCADM" create clients -r master \
    -s clientId="$CLIENT_ID" \
    -s enabled=true \
    -s publicClient=false \
    -s standardFlowEnabled=false \
    -s directAccessGrantsEnabled=false \
    -s serviceAccountsEnabled=true \
    -s secret="$CLIENT_SECRET"
else
  echo "Rotating secret for existing client $CLIENT_ID"
  "$KCADM" update "clients/$CID" -r master \
    -s serviceAccountsEnabled=true \
    -s secret="$CLIENT_SECRET"
fi

"$KCADM" add-roles -r master \
  --uusername "service-account-$CLIENT_ID" \
  --rolename admin

# --- Public web client -------------------------------------------------------

if [ -n "${WEB_CLIENT_ID:-}" ]; then
  # Comma-separated env values become JSON arrays for kcadm.
  to_json_array() {
    local out="" item
    IFS=',' read -ra parts <<< "$1"
    for item in "${parts[@]}"; do
      item="$(echo "$item" | tr -d '[:space:]')"
      [ -z "$item" ] && continue
      out="$out,\"$item\""
    done
    echo "[${out#,}]"
  }

  REDIRECTS="$(to_json_array "${WEB_REDIRECT_URIS:-http://localhost:3001/*}")"
  ORIGINS="$(to_json_array "${WEB_ORIGINS:-+}")"

  WID="$("$KCADM" get clients -r "$REALM" -q clientId="$WEB_CLIENT_ID" --fields id --format csv --noquotes 2>/dev/null | tr -d '\r' | head -n1)"

  if [ -z "$WID" ]; then
    echo "Creating public client $WEB_CLIENT_ID"
    "$KCADM" create clients -r "$REALM" \
      -s clientId="$WEB_CLIENT_ID" \
      -s enabled=true \
      -s publicClient=true \
      -s standardFlowEnabled=true \
      -s directAccessGrantsEnabled=false \
      -s serviceAccountsEnabled=false \
      -s "redirectUris=$REDIRECTS" \
      -s "webOrigins=$ORIGINS" \
      -s 'attributes."pkce.code.challenge.method"=S256' \
      -s 'attributes."post.logout.redirect.uris"=+'
  else
    echo "Updating redirect URIs for $WEB_CLIENT_ID"
    "$KCADM" update "clients/$WID" -r "$REALM" \
      -s "redirectUris=$REDIRECTS" \
      -s "webOrigins=$ORIGINS" \
      -s 'attributes."pkce.code.challenge.method"=S256'
  fi
fi

echo "Bootstrap complete."
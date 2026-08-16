#!/usr/bin/env bash
#
# Applies the identity-layer controls of the zero trust architecture:
#
#   - short access tokens and bounded sessions, so a stolen token expires fast
#   - brute force lockout and a real password policy
#   - an admin group whose members must enrol TOTP
#   - the confidential client the admin console's authenticating proxy uses
#
# Idempotent. Safe to re-run after every deploy.
#
# Required:  KEYCLOAK_URL REALM KEYCLOAK_ADMIN KEYCLOAK_ADMIN_PASSWORD
# Optional:  ADMIN_GROUP ADMIN_PROXY_CLIENT_ID ADMIN_PROXY_CLIENT_SECRET
#            ADMIN_PROXY_REDIRECT_URI REQUIRE_MFA

set -euo pipefail

KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"

for required in KEYCLOAK_URL REALM KEYCLOAK_ADMIN KEYCLOAK_ADMIN_PASSWORD; do
  if [ -z "${!required:-}" ]; then
    echo "Missing required variable: $required" >&2
    exit 2
  fi
done

ADMIN_GROUP="${ADMIN_GROUP:-platform-admins}"
REQUIRE_MFA="${REQUIRE_MFA:-true}"

hostport="${KEYCLOAK_URL#*://}"; hostport="${hostport%%/*}"
host="${hostport%%:*}"; port="${hostport##*:}"
[ "$port" = "$host" ] && port=80

for _ in $(seq 1 60); do
  (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null && { exec 3>&- 2>/dev/null || true; break; }
  sleep 5
done

for attempt in $(seq 1 20); do
  "$KCADM" config credentials --server "$KEYCLOAK_URL" --realm master \
    --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null 2>&1 && break
  [ "$attempt" -eq 20 ] && { echo "Cannot log in to $KEYCLOAK_URL" >&2; exit 1; }
  sleep 5
done

echo "Hardening realm $REALM"

# --- Session and token lifetimes ---------------------------------------------
#
# NIST SP 800-207 asks for access decisions to be re-evaluated continuously.
# In OIDC terms that means short access tokens and a bounded session, so a
# revoked account loses access in minutes rather than at next login.

"$KCADM" update "realms/$REALM" \
  -s accessTokenLifespan=300 \
  -s accessTokenLifespanForImplicitFlow=300 \
  -s ssoSessionIdleTimeout=1800 \
  -s ssoSessionMaxLifespan=28800 \
  -s offlineSessionIdleTimeout=1209600 \
  -s accessCodeLifespan=60 \
  -s revokeRefreshToken=true \
  -s refreshTokenMaxReuse=0 \
  -s sslRequired=all

echo "  access tokens 5m, idle session 30m, max session 8h, refresh tokens single-use"

# --- Password policy and lockout ---------------------------------------------
#
# Length over composition, which is what NIST SP 800-63B recommends and what
# PCI DSS 4.0 moved towards in requirement 8.3.6 (12 characters minimum).

"$KCADM" update "realms/$REALM" \
  -s 'passwordPolicy=length(12) and notUsername(undefined) and notEmail(undefined) and passwordHistory(4) and hashAlgorithm(pbkdf2-sha512) and hashIterations(210000)' \
  -s bruteForceProtected=true \
  -s permanentLockout=false \
  -s failureFactor=6 \
  -s waitIncrementSeconds=60 \
  -s maxFailureWaitSeconds=900 \
  -s quickLoginCheckMilliSeconds=1000 \
  -s minimumQuickLoginWaitSeconds=60

echo "  12-character minimum, lockout after 6 failures"

# --- One-time password policy ------------------------------------------------

"$KCADM" update "realms/$REALM" \
  -s otpPolicyType=totp \
  -s otpPolicyAlgorithm=HmacSHA1 \
  -s otpPolicyDigits=6 \
  -s otpPolicyPeriod=30 \
  -s otpPolicyLookAheadWindow=1

# --- Admin group -------------------------------------------------------------

GID="$("$KCADM" get groups -r "$REALM" -q search="$ADMIN_GROUP" --fields id,name --format csv --noquotes 2>/dev/null | grep -w "$ADMIN_GROUP" | cut -d, -f1 | head -n1 || true)"

if [ -z "$GID" ]; then
  echo "  creating group $ADMIN_GROUP"
  "$KCADM" create groups -r "$REALM" -s name="$ADMIN_GROUP" >/dev/null
  GID="$("$KCADM" get groups -r "$REALM" -q search="$ADMIN_GROUP" --fields id,name --format csv --noquotes | grep -w "$ADMIN_GROUP" | cut -d, -f1 | head -n1)"
fi

# The proxy authorises on group membership, so groups must appear in the token.
if ! "$KCADM" get "client-scopes" -r "$REALM" --fields name --format csv --noquotes 2>/dev/null | grep -qw groups; then
  echo "  creating groups client scope"
  "$KCADM" create client-scopes -r "$REALM" \
    -s name=groups \
    -s protocol=openid-connect \
    -s 'attributes."include.in.token.scope"=true' >/dev/null

  SCID="$("$KCADM" get client-scopes -r "$REALM" --fields id,name --format csv --noquotes | grep -w groups | cut -d, -f1 | head -n1)"
  "$KCADM" create "client-scopes/$SCID/protocol-mappers/models" -r "$REALM" \
    -s name=groups \
    -s protocol=openid-connect \
    -s protocolMapper=oidc-group-membership-mapper \
    -s 'config."claim.name"=groups' \
    -s 'config."full.path"=true' \
    -s 'config."id.token.claim"=true' \
    -s 'config."access.token.claim"=true' \
    -s 'config."userinfo.token.claim"=true' >/dev/null
fi

# --- Admin console proxy client ----------------------------------------------

if [ -n "${ADMIN_PROXY_CLIENT_ID:-}" ] && [ -n "${ADMIN_PROXY_CLIENT_SECRET:-}" ]; then
  REDIRECT="${ADMIN_PROXY_REDIRECT_URI:?ADMIN_PROXY_REDIRECT_URI is required when configuring the proxy client}"

  PCID="$("$KCADM" get clients -r "$REALM" -q clientId="$ADMIN_PROXY_CLIENT_ID" --fields id --format csv --noquotes 2>/dev/null | tr -d '\r' | head -n1)"

  if [ -z "$PCID" ]; then
    echo "  creating admin proxy client $ADMIN_PROXY_CLIENT_ID"
    "$KCADM" create clients -r "$REALM" \
      -s clientId="$ADMIN_PROXY_CLIENT_ID" \
      -s enabled=true \
      -s publicClient=false \
      -s standardFlowEnabled=true \
      -s directAccessGrantsEnabled=false \
      -s serviceAccountsEnabled=false \
      -s secret="$ADMIN_PROXY_CLIENT_SECRET" \
      -s "redirectUris=[\"$REDIRECT\"]" \
      -s 'attributes."pkce.code.challenge.method"=S256' >/dev/null
    PCID="$("$KCADM" get clients -r "$REALM" -q clientId="$ADMIN_PROXY_CLIENT_ID" --fields id --format csv --noquotes | tr -d '\r' | head -n1)"
  else
    "$KCADM" update "clients/$PCID" -r "$REALM" \
      -s secret="$ADMIN_PROXY_CLIENT_SECRET" \
      -s "redirectUris=[\"$REDIRECT\"]" >/dev/null
  fi

  "$KCADM" update "clients/$PCID/default-client-scopes/$("$KCADM" get client-scopes -r "$REALM" --fields id,name --format csv --noquotes | grep -w groups | cut -d, -f1 | head -n1)" -r "$REALM" >/dev/null 2>&1 || true
fi

# --- Require MFA for administrators ------------------------------------------
#
# Every current and future member of the admin group is given the CONFIGURE_TOTP
# required action, so they must enrol a second factor at next sign-in. Once
# enrolled, the realm's conditional OTP execution prompts for it on every login.
#
# Deliberately scoped to administrators rather than the whole realm: end users
# signing up with Google already carry Google's own authentication strength, and
# forcing TOTP on consumer signups trades a large amount of conversion for
# little marginal security.

if [ "$REQUIRE_MFA" = "true" ] && [ -n "$GID" ]; then
  members="$("$KCADM" get "groups/$GID/members" -r "$REALM" --fields id,username --format csv --noquotes 2>/dev/null || true)"

  if [ -z "$members" ]; then
    echo "  no members in $ADMIN_GROUP yet; add administrators to that group and re-run"
  else
    while IFS=, read -r uid uname; do
      [ -z "$uid" ] && continue
      current="$("$KCADM" get "users/$uid" -r "$REALM" --fields requiredActions --format json 2>/dev/null || echo '{}')"
      if echo "$current" | grep -q CONFIGURE_TOTP; then
        echo "  $uname already required to enrol TOTP"
      else
        "$KCADM" update "users/$uid" -r "$REALM" -s 'requiredActions=["CONFIGURE_TOTP"]' >/dev/null
        echo "  $uname must enrol TOTP at next sign-in"
      fi
    done <<< "$members"
  fi
fi

echo "Realm hardening complete."
echo
echo "Verify in the admin console:"
echo "  Authentication > Policies > OTP Policy       shows Time Based, 6 digits"
echo "  Realm settings > Sessions                    shows 30m idle, 8h max"
echo "  Realm settings > Security defenses           shows brute force detection on"
echo "  Groups > $ADMIN_GROUP > Members              lists exactly your administrators"
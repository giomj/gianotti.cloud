# --- Administrator access ----------------------------------------------------
#
# The admin console was behind HTTP basic auth, which is a shared secret with no
# identity, no MFA, and no revocation. Replace it with the platform's own
# identity provider: an operator authenticates to Keycloak, must be a member of
# the admin group, and must have enrolled TOTP.
#
# This is the "authenticate and authorise every request" tenet applied to the
# humans, not just the services.

resource "random_password" "admin_proxy_client_secret" {
  count   = var.enable_admin_sso ? 1 : 0
  length  = 48
  special = false
}

resource "random_password" "admin_proxy_cookie_secret" {
  count   = var.enable_admin_sso ? 1 : 0
  length  = 32
  special = false
}

resource "kubernetes_secret_v1" "admin_proxy" {
  count = var.enable_admin_sso ? 1 : 0

  metadata {
    name      = "admin-proxy-oidc"
    namespace = local.identity_ns
  }

  data = {
    client-id     = "admin-console-proxy"
    client-secret = random_password.admin_proxy_client_secret[0].result
    cookie-secret = base64encode(substr(random_password.admin_proxy_cookie_secret[0].result, 0, 32))
  }
}

resource "helm_release" "oauth2_proxy" {
  count      = var.enable_admin_sso ? 1 : 0
  name       = "admin-proxy"
  repository = "https://oauth2-proxy.github.io/manifests"
  chart      = "oauth2-proxy"
  version    = "7.7.28"
  namespace  = local.identity_ns
  atomic     = true
  timeout    = 600

  values = [yamlencode({
    config = {
      existingSecret = kubernetes_secret_v1.admin_proxy[0].metadata[0].name
      configFile = <<-CFG
        provider = "keycloak-oidc"
        oidc_issuer_url = "https://${local.identity_host}/realms/${var.keycloak_realm}"
        redirect_url = "https://${local.admin_host}/oauth2/callback"
        email_domains = ["*"]
        # Only members of the admin group get a session at all.
        allowed_groups = ["/${var.admin_group}"]
        scope = "openid email profile groups"
        cookie_secure = true
        cookie_httponly = true
        cookie_samesite = "lax"
        cookie_expire = "8h"
        cookie_refresh = "15m"
        # Pass the verified identity downstream so the console can log who acted.
        set_xauthrequest = true
        pass_access_token = false
        skip_provider_button = true
        reverse_proxy = true
        real_client_ip_header = "X-Forwarded-For"
      CFG
    }

    replicaCount = 2

    resources = {
      requests = { cpu = "20m", memory = "64Mi" }
      limits   = { memory = "128Mi" }
    }
  })]

  depends_on = [kubernetes_secret_v1.admin_proxy]
}

# Replace the ingress annotations stage 02 created. Authentication now happens
# at the proxy; the source-range allowlist stays as a second, independent gate.
resource "kubernetes_annotations" "admin_console_ingress" {
  count = var.enable_admin_sso ? 1 : 0

  api_version = "networking.k8s.io/v1"
  kind        = "Ingress"
  metadata {
    name      = "identity-admin"
    namespace = local.identity_ns
  }

  annotations = {
    "nginx.ingress.kubernetes.io/auth-type"   = null
    "nginx.ingress.kubernetes.io/auth-secret" = null
    "nginx.ingress.kubernetes.io/auth-realm"  = null

    "nginx.ingress.kubernetes.io/auth-url"    = "https://${local.admin_host}/oauth2/auth"
    "nginx.ingress.kubernetes.io/auth-signin" = "https://${local.admin_host}/oauth2/start?rd=$escaped_request_uri"
    "nginx.ingress.kubernetes.io/auth-response-headers" = "X-Auth-Request-User,X-Auth-Request-Email,X-Auth-Request-Groups"

    "nginx.ingress.kubernetes.io/whitelist-source-range" = join(",", var.admin_console_allowed_cidrs)

    # Belt and braces on an admin surface.
    "nginx.ingress.kubernetes.io/limit-rps"        = "10"
    "nginx.ingress.kubernetes.io/limit-connections" = "20"
  }

  force = true

  depends_on = [helm_release.oauth2_proxy]
}

# The oauth2-proxy callback path has to be reachable without authentication.
resource "kubernetes_ingress_v1" "admin_proxy_callback" {
  count = var.enable_admin_sso ? 1 : 0

  metadata {
    name      = "identity-admin-oauth2"
    namespace = local.identity_ns
    annotations = {
      "cert-manager.io/cluster-issuer"                    = "letsencrypt"
      "nginx.ingress.kubernetes.io/force-ssl-redirect"    = "true"
      "nginx.ingress.kubernetes.io/whitelist-source-range" = join(",", var.admin_console_allowed_cidrs)
    }
  }

  spec {
    ingress_class_name = "nginx"

    tls {
      hosts       = [local.admin_host]
      secret_name = "identity-admin-tls"
    }

    rule {
      host = local.admin_host
      http {
        path {
          path      = "/oauth2"
          path_type = "Prefix"
          backend {
            service {
              name = "admin-proxy-oauth2-proxy"
              port { number = 80 }
            }
          }
        }
      }
    }
  }

  depends_on = [helm_release.oauth2_proxy]
}

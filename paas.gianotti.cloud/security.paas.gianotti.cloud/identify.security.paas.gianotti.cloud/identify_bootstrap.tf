# Runs scripts/keycloak-bootstrap.sh inside the cluster. The same file drives the
# local compose stack, so there is one definition of "a correctly configured
# realm" rather than two that drift.

locals {
  keycloak_bootstrap_script = file("${path.module}/../../scripts/keycloak-bootstrap.sh")
  keycloak_bootstrap_hash   = substr(sha256(local.keycloak_bootstrap_script), 0, 10)

  web_redirect_uris = length(var.web_redirect_uris) > 0 ? var.web_redirect_uris : [
    "https://${var.domain}/*",
    "https://www.${var.domain}/*",
  ]
}

resource "kubernetes_config_map_v1" "keycloak_bootstrap" {
  metadata {
    name      = "keycloak-bootstrap-${local.keycloak_bootstrap_hash}"
    namespace = kubernetes_namespace_v1.identity.metadata[0].name
  }

  data = {
    "bootstrap.sh" = local.keycloak_bootstrap_script
  }
}

resource "kubernetes_job_v1" "keycloak_bootstrap" {
  metadata {
    name      = "keycloak-bootstrap-${local.keycloak_bootstrap_hash}"
    namespace = kubernetes_namespace_v1.identity.metadata[0].name
  }

  spec {
    backoff_limit = 4

    template {
      metadata {
        labels = { "app.kubernetes.io/name" = "keycloak-bootstrap" }
      }

      spec {
        restart_policy = "OnFailure"

        volume {
          name = "script"
          config_map {
            name         = kubernetes_config_map_v1.keycloak_bootstrap.metadata[0].name
            default_mode = "0555"
          }
        }

        container {
          name    = "kcadm"
          image   = var.keycloak_image
          command = ["/bin/bash", "/scripts/bootstrap.sh"]

          volume_mount {
            name       = "script"
            mount_path = "/scripts"
            read_only  = true
          }

          env {
            name  = "KEYCLOAK_URL"
            value = local.keycloak_internal
          }

          env {
            name  = "REALM"
            value = var.keycloak_realm
          }

          env {
            name  = "REALM_DISPLAY_NAME"
            value = title(var.project_name)
          }

          env {
            name  = "WEB_CLIENT_ID"
            value = var.web_client_id
          }

          env {
            name  = "WEB_REDIRECT_URIS"
            value = join(",", local.web_redirect_uris)
          }

          env {
            name  = "WEB_ORIGINS"
            value = "+"
          }

          dynamic "env" {
            for_each = {
              CLIENT_ID     = "client_id"
              CLIENT_SECRET = "client_secret"
            }
            content {
              name = env.key
              value_from {
                secret_key_ref {
                  name = kubernetes_secret_v1.admin_ui_client.metadata[0].name
                  key  = env.value
                }
              }
            }
          }

          dynamic "env" {
            for_each = {
              KEYCLOAK_ADMIN          = "username"
              KEYCLOAK_ADMIN_PASSWORD = "password"
            }
            content {
              name = env.key
              value_from {
                secret_key_ref {
                  name = kubernetes_secret_v1.keycloak_admin.metadata[0].name
                  key  = env.value
                }
              }
            }
          }

          resources {
            requests = { cpu = "50m", memory = "256Mi" }
            limits   = { memory = "512Mi" }
          }
        }
      }
    }
  }

  wait_for_completion = true

  timeouts {
    create = "15m"
  }

  depends_on = [kubernetes_deployment_v1.keycloak]
}

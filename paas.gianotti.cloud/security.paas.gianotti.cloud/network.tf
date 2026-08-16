# --- Network segmentation ----------------------------------------------------
#
# Zero trust at layer 3/4: every namespace denies all ingress and all egress,
# then re-opens exactly what the workload needs. NetworkPolicy is enforced by the
# CNI on every node, so it holds even for traffic that never reaches the mesh
# proxy — which is what makes it a real control rather than a mesh-level
# convention.

locals {
  # The managed database lives on the VPC. Egress to Postgres is allowed to the
  # VPC range on the database port only, not to the internet.
  vpc_cidr = data.digitalocean_vpc.main.ip_range
  db_port  = data.digitalocean_database_cluster.postgres.port
}

resource "kubernetes_network_policy_v1" "deny_all" {
  for_each = toset(local.all_namespaces)

  metadata {
    name      = "zt-default-deny-all"
    namespace = each.value
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress", "Egress"]
  }
}

# DNS is the one universal exception. Without it nothing resolves, including the
# database hostname.
resource "kubernetes_network_policy_v1" "allow_dns" {
  for_each = toset(local.all_namespaces)

  metadata {
    name      = "zt-allow-dns"
    namespace = each.value
  }

  spec {
    pod_selector {}
    policy_types = ["Egress"]

    egress {
      to {
        namespace_selector {
          match_labels = { "kubernetes.io/metadata.name" = "kube-system" }
        }
      }
      ports {
        port     = "53"
        protocol = "UDP"
      }
      ports {
        port     = "53"
        protocol = "TCP"
      }
    }
  }
}

# Inbound HTTP only from the ingress controller. Nothing else in the cluster can
# open a connection to an application pod.
resource "kubernetes_network_policy_v1" "allow_ingress_controller" {
  for_each = toset(local.all_namespaces)

  metadata {
    name      = "zt-allow-from-ingress"
    namespace = each.value
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress"]

    ingress {
      from {
        namespace_selector {
          match_labels = { "kubernetes.io/metadata.name" = "ingress-nginx" }
        }
      }
    }
  }
}

# Only workloads with their own database may reach Postgres, and only on its port.
resource "kubernetes_network_policy_v1" "allow_database" {
  for_each = merge(
    { for k, v in var.applications : k => k if v.create_database },
    { (local.identity_ns) = local.identity_ns },
  )

  metadata {
    name      = "zt-allow-managed-database"
    namespace = each.value
  }

  spec {
    pod_selector {}
    policy_types = ["Egress"]

    egress {
      to {
        ip_block {
          cidr = local.vpc_cidr
        }
      }
      ports {
        port     = tostring(local.db_port)
        protocol = "TCP"
      }
    }
  }
}

# Applications may reach Keycloak to fetch signing keys. They may not reach
# anything else in the identity namespace.
resource "kubernetes_network_policy_v1" "allow_identity_egress" {
  for_each = var.applications

  metadata {
    name      = "zt-allow-identity"
    namespace = each.key
  }

  spec {
    pod_selector {}
    policy_types = ["Egress"]

    egress {
      to {
        namespace_selector {
          match_labels = { "kubernetes.io/metadata.name" = local.identity_ns }
        }
        pod_selector {
          match_labels = { "app.kubernetes.io/name" = "keycloak" }
        }
      }
      ports {
        port     = "8080"
        protocol = "TCP"
      }
    }
  }
}

resource "kubernetes_network_policy_v1" "allow_identity_ingress_from_apps" {
  metadata {
    name      = "zt-allow-keycloak-from-apps"
    namespace = local.identity_ns
  }

  spec {
    pod_selector {
      match_labels = { "app.kubernetes.io/name" = "keycloak" }
    }
    policy_types = ["Ingress"]

    dynamic "ingress" {
      for_each = var.applications
      content {
        from {
          namespace_selector {
            match_labels = { "kubernetes.io/metadata.name" = ingress.key }
          }
        }
        ports {
          port     = "8080"
          protocol = "TCP"
        }
      }
    }
  }
}

# Keycloak needs the public internet to reach Google's OAuth and JWKS endpoints.
# This is the identity namespace's one internet exit, and it is HTTPS only.
resource "kubernetes_network_policy_v1" "identity_internet_egress" {
  metadata {
    name      = "zt-allow-https-egress"
    namespace = local.identity_ns
  }

  spec {
    pod_selector {}
    policy_types = ["Egress"]

    egress {
      to {
        ip_block {
          cidr = "0.0.0.0/0"
          # Never let a workload reach cluster-internal or link-local ranges
          # through the internet rule. This is the SSRF and metadata-endpoint
          # guard.
          except = [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16",
            "169.254.0.0/16",
          ]
        }
      }
      ports {
        port     = "443"
        protocol = "TCP"
      }
    }
  }
}

# Applications only get an internet exit if they were declared as needing one.
resource "kubernetes_network_policy_v1" "app_internet_egress" {
  for_each = local.internet_egress

  metadata {
    name      = "zt-allow-https-egress"
    namespace = each.key
  }

  spec {
    pod_selector {}
    policy_types = ["Egress"]

    egress {
      to {
        ip_block {
          cidr = "0.0.0.0/0"
          except = [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16",
            "169.254.0.0/16",
          ]
        }
      }
      ports {
        port     = "443"
        protocol = "TCP"
      }
    }
  }
}

# Meshed pods talk to the Linkerd control plane for identity and policy.
resource "kubernetes_network_policy_v1" "allow_mesh_control_plane" {
  for_each = var.enable_mesh ? toset(local.all_namespaces) : toset([])

  metadata {
    name      = "zt-allow-mesh-control-plane"
    namespace = each.value
  }

  spec {
    pod_selector {}
    policy_types = ["Egress"]

    egress {
      to {
        namespace_selector {
          match_labels = { "kubernetes.io/metadata.name" = "linkerd" }
        }
      }
    }
  }
}

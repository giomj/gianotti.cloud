# --- Workload identity and mutual TLS ----------------------------------------
#
# Every pod gets a cryptographic identity derived from its ServiceAccount, and
# every connection between pods is mutually authenticated and encrypted. This is
# what makes "the network is hostile" true in practice rather than aspirational:
# a workload that lands on a node cannot talk to another workload just because it
# can route to it.
#
# Linkerd rather than Istio: on three s-2vcpu-4gb nodes the proxy footprint
# matters, and Linkerd's per-proxy overhead is a fraction of Envoy's. The trade
# is that request-level JWT authorisation happens in the application rather than
# the mesh. Applications here already verify tokens against the realm JWKS, so
# that duplication is small. If the platform grows to needing mesh-level JWT
# claims-based authorisation or multi-cluster federation, Istio ambient mode is
# the migration target.

locals {
  name              = "${var.project_name}-${var.environment}"
  identity_ns       = "identity"
  identity_host     = "${var.identity_subdomain}.${var.domain}"
  admin_host        = "${var.admin_subdomain}.${var.domain}"
  all_namespaces    = concat(keys(var.applications), [local.identity_ns])
  internet_egress   = { for k, v in var.applications : k => v if v.allow_internet_egress }
}

# Root of trust for the mesh. Generated here and never leaves state; the private
# key signs only the intermediate issuer below.
resource "tls_private_key" "trust_anchor" {
  count       = var.enable_mesh ? 1 : 0
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

resource "tls_self_signed_cert" "trust_anchor" {
  count           = var.enable_mesh ? 1 : 0
  private_key_pem = tls_private_key.trust_anchor[0].private_key_pem

  subject {
    common_name = "identity.linkerd.cluster.local"
  }

  validity_period_hours = var.trust_anchor_validity_hours
  is_ca_certificate     = true

  allowed_uses = [
    "cert_signing",
    "crl_signing",
    "digital_signature",
  ]
}

resource "tls_private_key" "issuer" {
  count       = var.enable_mesh ? 1 : 0
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

resource "tls_cert_request" "issuer" {
  count           = var.enable_mesh ? 1 : 0
  private_key_pem = tls_private_key.issuer[0].private_key_pem

  subject {
    common_name = "identity.linkerd.cluster.local"
  }
}

resource "tls_locally_signed_cert" "issuer" {
  count                 = var.enable_mesh ? 1 : 0
  cert_request_pem      = tls_cert_request.issuer[0].cert_request_pem
  ca_private_key_pem    = tls_private_key.trust_anchor[0].private_key_pem
  ca_cert_pem           = tls_self_signed_cert.trust_anchor[0].cert_pem
  validity_period_hours = var.issuer_validity_hours
  is_ca_certificate     = true

  allowed_uses = [
    "cert_signing",
    "crl_signing",
    "digital_signature",
  ]
}

resource "helm_release" "linkerd_crds" {
  count            = var.enable_mesh ? 1 : 0
  name             = "linkerd-crds"
  repository       = "https://helm.linkerd.io/stable"
  chart            = "linkerd-crds"
  version          = "1.8.0"
  namespace        = "linkerd"
  create_namespace = true
  atomic           = true
}

resource "helm_release" "linkerd" {
  count      = var.enable_mesh ? 1 : 0
  name       = "linkerd-control-plane"
  repository = "https://helm.linkerd.io/stable"
  chart      = "linkerd-control-plane"
  version    = "1.16.11"
  namespace  = "linkerd"
  atomic     = true
  timeout    = 900

  values = [yamlencode({
    identityTrustAnchorsPEM = tls_self_signed_cert.trust_anchor[0].cert_pem

    identity = {
      issuer = {
        scheme = "kubernetes.io/tls"
        tls = {
          crtPEM = tls_locally_signed_cert.issuer[0].cert_pem
          keyPEM = tls_private_key.issuer[0].private_key_pem
        }
      }
    }

    # Deny by default once authorization policies are in place and verified.
    proxy = {
      defaultInboundPolicy = var.mesh_enforce_authz ? "deny" : "all-authenticated"
      resources = {
        cpu    = { request = "20m" }
        memory = { request = "32Mi", limit = "128Mi" }
      }
    }

    controllerReplicas = 2

    podMonitor = { enabled = false }
  })]

  depends_on = [helm_release.linkerd_crds]
}

# Existing namespaces belong to stage 02. Patch the injection annotation onto
# them here so security concerns stay in this stage.
resource "kubernetes_annotations" "mesh_injection" {
  for_each = var.enable_mesh ? toset(local.all_namespaces) : toset([])

  api_version = "v1"
  kind        = "Namespace"
  metadata {
    name = each.value
  }

  annotations = {
    "linkerd.io/inject" = "enabled"
  }

  force = true

  depends_on = [helm_release.linkerd]
}

# The ingress controller terminates external TLS and forwards into the mesh. It
# is meshed so that hop is encrypted and attributable too.
resource "kubernetes_annotations" "mesh_injection_ingress" {
  count = var.enable_mesh ? 1 : 0

  api_version = "v1"
  kind        = "Namespace"
  metadata {
    name = "ingress-nginx"
  }

  annotations = {
    "linkerd.io/inject"                 = "enabled"
    # nginx opens connections to backends itself, so it needs the outbound proxy
    # to skip inbound redirection on its own listening ports.
    "config.linkerd.io/skip-inbound-ports" = "80,443"
  }

  force = true

  depends_on = [helm_release.linkerd]
}

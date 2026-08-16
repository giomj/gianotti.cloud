variable "do_token" {
  type      = string
  sensitive = true
}

variable "project_name" {
  type    = string
  default = "acme"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "cluster_name" {
  description = "DOKS cluster from stage 01."
  type        = string
}

variable "vpc_name" {
  description = "VPC from stage 01. Used to scope egress rules to the private network."
  type        = string
}

variable "database_cluster_name" {
  description = "Managed Postgres cluster from stage 01."
  type        = string
}

variable "domain" {
  type = string
}

variable "applications" {
  description = "Must match stages 01 and 02."
  type = map(object({
    description     = optional(string, "")
    create_database = optional(bool, true)
    # Workloads that legitimately call third-party APIs. Everything else is
    # denied egress to the internet outright.
    allow_internet_egress = optional(bool, false)
  }))
  default = {
    api  = { description = "Public REST/GraphQL API" }
    web  = { description = "Customer-facing web frontend", create_database = false }
    jobs = { description = "Background workers and scheduled tasks" }
  }
}

variable "keycloak_realm" {
  type    = string
  default = "platform"
}

variable "identity_subdomain" {
  type    = string
  default = "id"
}

variable "admin_subdomain" {
  type    = string
  default = "identity-admin"
}

# --- Mesh -------------------------------------------------------------------

variable "enable_mesh" {
  description = "Install Linkerd and require mutual TLS between workloads."
  type        = bool
  default     = true
}

variable "mesh_enforce_authz" {
  description = <<-EOT
    Deny any in-mesh traffic not explicitly authorised. Turn this on only after
    security/linkerd/authorization-policies.yaml is applied and verified, or
    healthy traffic will be dropped.
  EOT
  type    = bool
  default = false
}

variable "trust_anchor_validity_hours" {
  description = "Mesh root CA lifetime. Rotating it is a planned, staged operation."
  type        = number
  default     = 8760
}

variable "issuer_validity_hours" {
  description = "Intermediate issuer lifetime. Re-apply before expiry, or move to the cert-manager rotation in security/linkerd/cert-manager-rotation.yaml."
  type        = number
  default     = 2160
}

# --- Admission control ------------------------------------------------------

variable "enable_admission_policies" {
  description = "Install Kyverno."
  type        = bool
  default     = true
}

variable "policy_failure_action" {
  description = "Audit reports violations, Enforce blocks them. Run Audit first, read the reports, then switch."
  type        = string
  default     = "Enforce"

  validation {
    condition     = contains(["Audit", "Enforce"], var.policy_failure_action)
    error_message = "policy_failure_action must be Audit or Enforce."
  }
}

variable "allowed_registries" {
  description = "Image registries workloads may pull from. Everything else is rejected at admission."
  type        = list(string)
  default     = ["registry.digitalocean.com/*", "quay.io/keycloak/*", "cr.l5d.io/*", "ghcr.io/kyverno/*", "docker.io/falcosecurity/*"]
}

variable "cosign_public_key" {
  description = "Cosign public key in PEM. When set, unsigned images are rejected at admission."
  type        = string
  default     = ""
}

# --- Runtime detection ------------------------------------------------------

variable "enable_runtime_detection" {
  description = "Install Falco. Costs roughly 150Mi and 100m per node."
  type        = bool
  default     = true
}

variable "alert_webhook_url" {
  description = "Where runtime alerts go (Slack, PagerDuty, SIEM). Alerts are dropped if empty."
  type        = string
  default     = ""
  sensitive   = true
}

# --- Administrator access ---------------------------------------------------

variable "enable_admin_sso" {
  description = "Put the identity admin console behind Keycloak SSO with MFA instead of HTTP basic auth."
  type        = bool
  default     = true
}

variable "admin_group" {
  description = "Keycloak group whose members may reach the admin console. Members are required to enrol TOTP."
  type        = string
  default     = "platform-admins"
}

variable "admin_console_allowed_cidrs" {
  description = "Source ranges permitted to reach the admin console, on top of SSO."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

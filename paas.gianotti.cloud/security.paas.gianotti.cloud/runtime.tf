# --- Runtime detection -------------------------------------------------------
#
# Zero trust assumes breach. Prevention controls fail; this is what notices.
# Falco watches syscalls on every node and alerts on the behaviour that follows
# a container compromise: a shell in a container, an unexpected outbound
# connection, reads of service-account tokens, writes below system directories.

resource "helm_release" "falco" {
  count            = var.enable_runtime_detection ? 1 : 0
  name             = "falco"
  repository       = "https://falcosecurity.github.io/charts"
  chart            = "falco"
  version          = "4.11.0"
  namespace        = "falco"
  create_namespace = true
  atomic           = true
  timeout          = 900

  values = [yamlencode({
    driver = {
      # Modern eBPF needs no kernel headers and no privileged init container,
      # which matters on managed nodes that get replaced on upgrade.
      kind = "modern_ebpf"
    }

    collectors = {
      kubernetes = { enabled = true }
    }

    falco = {
      json_output              = true
      json_include_output_property = true
      log_level                = "info"
      priority                 = "notice"
      buffered_outputs         = true
      # Rate limit so an alert storm cannot become the outage.
      outputs = {
        rate            = 1000
        max_burst       = 10000
      }
    }

    falcosidekick = {
      enabled = var.alert_webhook_url != ""
      config = {
        webhook = {
          address = var.alert_webhook_url
        }
      }
      webui = { enabled = false }
    }

    resources = {
      requests = { cpu = "100m", memory = "256Mi" }
      limits   = { memory = "512Mi" }
    }

    customRules = {
      "platform-rules.yaml" = file("${path.module}/../../security/falco/rules.yaml")
    }
  })]
}

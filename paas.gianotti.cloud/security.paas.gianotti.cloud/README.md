Deployed with make security && make verify. Start with the compliance mapping — two findings there matter more than anything in the code.

Two things you need to know before planning around this

DigitalOcean is not on the FedRAMP Marketplace. For DoD or federal work, no amount of STIG hardening inside the cluster produces an ATO on a non-authorized provider. The STIGs are still a fine hardening benchmark — the architecture meets most of the Kubernetes STIG's substance — but the authorization path isn't available without changing providers.

DigitalOcean's PCI validation is an SAQ-A covering its own administrative environment (an attestation that DO doesn't touch cardholder data). That is not a Level 1 service provider AOC covering your infrastructure, which is what AWS, Azure, and GCP publish. You can't inherit CDE controls here the way you can there. My recommendation is to keep cardholder data off this platform entirely via a hosted payment page — that drops you to SAQ-A and makes most of Requirements 3, 4, 9, and 10 stop applying to your systems.

What got built

Mutual TLS via Linkerd with per-ServiceAccount identity; default-deny networking in both directions per namespace, with egress rules that exclude link-local and RFC1918 (the SSRF and metadata-endpoint guard); Kyverno admission control backed by Pod Security restricted as an API-server-level backstop; Falco with rules written for this platform; and the admin console moved off HTTP basic auth onto Keycloak SSO with TOTP required.

scripts/verify-controls.sh machine-checks 16 controls and writes a dated evidence file mapped to PCI DSS v4.0.1, NIST 800-53 Rev 5, CISA ZTMM, and the K8s STIG. It runs in CI and the artifacts are retained 365 days. I tested it against a stubbed cluster and fixed two vacuous-pass bugs it exposed.

Honest maturity assessment, using CISA's four stages: Initial trending Advanced. Strong on Networks, Applications, and Automation. Weak on Devices (the platform has no knowledge of operator machines) and Data (no classification, provider-managed encryption you can't verify). Twelve gaps are registered with effort estimates — G-1 is a one-line fix worth doing today: database TLS is sslmode=require, which encrypts but doesn't authenticate the server, and the CA is already sitting in the secret.

I deliberately left mesh_enforce_authz = false. Turning on mesh default-deny before verifying the authorization policies will take the platform down.
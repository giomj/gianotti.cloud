# Compliance mapping and gap analysis

How the zero trust architecture in this repository maps to PCI DSS v4.0.1,
NIST SP 800-207 and SP 800-53 Rev 5, the CISA Zero Trust Maturity Model v2.0,
and DISA guidance — and, more usefully, where it does not.

**This is not an attestation.** No architecture makes an organisation compliant.
PCI DSS compliance is validated by a QSA or a self-assessment questionnaire
accepted by your acquirer; a federal ATO is granted by an authorising official.
What follows is a technical control mapping you can hand to an assessor as a
starting point, with the gaps stated plainly so nobody discovers them during an
audit instead.

Standard versions referenced, current as of August 2026:

| Standard | Version | Notes |
| --- | --- | --- |
| PCI DSS | v4.0.1 (June 2024) | All future-dated v4.0 requirements mandatory since 31 March 2025 |
| NIST SP 800-207 | August 2020 | Zero Trust Architecture |
| NIST SP 800-53 | Rev 5 | Security and privacy controls |
| CISA ZTMM | v2.0 (April 2023) | Still current; no v3 has been published |
| DISA Kubernetes STIG | V2R5 | Verify against public.cyber.mil before an assessment |
| DoD Zero Trust Strategy | November 2022 | 7 pillars, 152 activities, Target Level by FY2027 |

---

## Two findings that change the picture

Read these before the control tables. Both are properties of the hosting
decision, not of the architecture, and neither can be fixed by adding controls
to the cluster.

### F-1 — DigitalOcean is not FedRAMP authorised

DigitalOcean does not appear on the FedRAMP Marketplace. For any workload
subject to FISMA, CMMC, or a DoD impact level, that ends the conversation at the
hosting layer: agencies must use FedRAMP-authorised cloud services for covered
systems, and DoD workloads additionally require a provider with a DISA
Provisional Authorization at the relevant impact level (IL2 through IL6).

**What this means in practice.** The DISA STIGs remain genuinely useful as
hardening guidance, and this architecture implements much of what the Kubernetes
STIG asks for. But no amount of STIG compliance inside the cluster produces an
ATO on a non-authorised provider. If DoD or federal work is a real goal, the
platform needs to move to AWS GovCloud, Azure Government, Google Assured
Workloads, or an Oracle/IBM government region, and the Terraform in this repo
would need a provider rewrite.

If DoD work is *not* a goal and you are using DISA guidance as a hardening
benchmark — which is a reasonable thing to do — the STIG section below applies
normally and F-1 is irrelevant to you.

### F-2 — DigitalOcean's PCI validation does not cover your cardholder data

DigitalOcean's published PCI position is an SAQ-A validation describing a
zero-footprint policy for *its own* administrative environment: an attestation
that DigitalOcean does not store, process, or transmit cardholder data. That is
a statement about DigitalOcean's business, not a Level 1 service provider
Attestation of Compliance covering customer infrastructure.

This is materially different from AWS, Azure, and GCP, which publish Level 1
service provider AOCs listing which of their services are in scope. When you
build a cardholder data environment on those providers, you inherit validated
controls for physical security, hypervisor isolation, and infrastructure
management, and your QSA accepts the AOC as evidence.

**What this means in practice.** If a CDE runs on this platform, requirements
that would normally be inherited — Requirement 9 physical access, parts of
Requirements 1, 2, 11, and 12 relating to the underlying infrastructure — have
no provider attestation behind them. Your QSA will have to assess them some
other way, and may not accept a SOC 2 Type II report as a substitute.

**The recommendation is to keep cardholder data off this platform entirely.**
Use a hosted payment page or payment iframe from a validated provider (Stripe
Checkout, Adyen, Braintree) so the browser sends the PAN directly to them and it
never reaches your infrastructure. That reduces scope to SAQ-A or SAQ-A-EP, and
most of Requirements 3, 4, 9, and 10 stop applying to your systems. The
architecture below then protects everything *around* payments, which is where
your actual risk lives.

If cardholder data must be processed here, treat this document as a gap list and
engage a QSA before writing any more code.

---

## NIST SP 800-207 — the seven tenets

The tenets are the definition of zero trust; everything else is a maturity
model or a control catalogue built on top.

| # | Tenet | Implementation | Assessment |
| --- | --- | --- | --- |
| 1 | All data sources and computing services are resources | Every workload is a namespaced, labelled, individually addressable resource with its own ServiceAccount and database role | Met |
| 2 | All communication is secured regardless of network location | Linkerd mutual TLS between all meshed workloads; TLS to the public internet via cert-manager; TLS to the managed database | Met, with the caveat that database TLS defaults to `sslmode=require`, which encrypts but does not authenticate the server — see G-1 |
| 3 | Access to individual resources is granted per session | Keycloak access tokens live 5 minutes; refresh tokens are single-use; mesh authorization is evaluated per connection | Met |
| 4 | Access is determined by dynamic policy including observable client state | Policy is dynamic in that it is centrally administered and immediately effective, but it does not consider device posture, geolocation, or behavioural risk | **Partial.** This is the weakest tenet. See G-6 |
| 5 | The enterprise monitors the integrity and security posture of all owned assets | Falco on every node, Kyverno background scans, admission-time policy | Met for cluster assets. Not met for the laptops administrators use — see G-6 |
| 6 | All resource authentication and authorization is dynamic and strictly enforced before access | oauth2-proxy in front of the admin console, group membership required, TOTP required for admins; mesh authorization by workload identity | Met once `mesh_enforce_authz = true` |
| 7 | The enterprise collects as much information as possible about the current state and uses it to improve posture | Runtime detections, policy reports, verification evidence | **Partial.** Signals are collected but not correlated; there is no SIEM and no 12-month retention — see G-4 |

---

## CISA Zero Trust Maturity Model v2.0

Honest stage assessment. The model's four stages are Traditional, Initial,
Advanced, and Optimal. Most organisations sit at Traditional or Initial across
the board; claiming Optimal anywhere is usually a sign the assessment was done
by a vendor.

| Pillar | Stage | Why | What would move it up |
| --- | --- | --- | --- |
| **Identity** | Advanced | Centralised IdP, MFA required for administrators, short sessions, federated Google identity, group-based authorization | TOTP is not phishing-resistant. Move admins to WebAuthn/passkeys, add risk-based step-up on anomalous sign-ins |
| **Devices** | **Traditional** | The platform has no knowledge of the devices operators use. No inventory, no posture check, no EDR requirement, no device certificate | This is the largest single gap. Require managed devices with certificates for admin access, and gate the admin console on device posture |
| **Networks** | Advanced | Default-deny ingress *and* egress per namespace, microsegmentation by workload identity, mTLS everywhere, egress explicitly excludes link-local and RFC1918 | Add an egress proxy with per-destination allowlisting rather than "any HTTPS", and encrypt at the transport layer for all traffic including intra-node |
| **Applications & Workloads** | Advanced | Admission control enforced, immutable tags, restricted Pod Security, per-workload authorization, CI security gates | Continuous DAST against running services; signature verification is only active once a cosign key is configured |
| **Data** | **Initial** | Encryption at rest is provider-managed and unverified by you; per-app database isolation is real; no classification, no DLP, no field-level encryption, no data inventory | Classify what the platform stores, encrypt sensitive columns with keys you hold, and add automated data discovery |
| Visibility & Analytics | Initial | Runtime detection exists and alerts leave the cluster; nothing correlates events, retention is short, apiserver audit logs are unavailable | Ship to a SIEM, retain 12 months, add anomaly detection |
| Automation & Orchestration | Advanced | Everything is IaC, policy is code, CI enforces gates, controls are machine-verified | Automated response to detections, not just alerting |
| Governance | Initial | Policy as code and ownership labels are enforced at admission | Written policies, periodic access reviews, a risk register, an exception process |

**Overall: Initial trending Advanced**, held back by Devices and Data.

---

## NIST SP 800-53 Rev 5 — control mapping

Selected controls where this repository provides an implementation. Absence from
this table does not mean a control is unmet; it means the platform does not
address it and you should look elsewhere in your control set.

| Control | Title | Implementation |
| --- | --- | --- |
| AC-2 | Account Management | Keycloak realm, admin group membership, `keycloak-harden.sh` |
| AC-3 | Access Enforcement | oauth2-proxy, Linkerd AuthorizationPolicy, NetworkPolicy, Kyverno |
| AC-4 | Information Flow Enforcement | Default-deny egress with explicit per-namespace allowances |
| AC-6 | Least Privilege | Non-root containers, dropped capabilities, per-app database roles, no default ServiceAccount |
| AC-6(10) | Prohibit Non-Privileged Users from Executing Privileged Functions | Pod Security `restricted`, Kyverno privileged-container denial |
| AC-17(1) | Remote Access — Automated Monitoring/Control | Source-range allowlist plus SSO on the admin console |
| AU-2, AU-12 | Event Logging | Falco syscall events, ingress access logs, Kyverno policy reports |
| AU-6 | Audit Record Review | **Gap G-4.** No correlation or review process |
| AU-11 | Audit Record Retention | **Gap G-4.** No retention policy implemented |
| CM-2 | Baseline Configuration | Terraform state is the baseline; immutable image tags |
| CM-3, CM-5 | Configuration Change Control | Pull-request workflow, CI validation, admission control |
| CM-6 | Configuration Settings | Pod Security Admission, Kyverno, pinned chart versions |
| CM-7 | Least Functionality | No shells expected in containers, read-only root filesystems, no host namespaces |
| CP-9 | System Backup | DigitalOcean managed database daily backups, 7-day retention. **Gap G-7** for longer retention |
| IA-2(1)(2) | MFA for Privileged and Non-Privileged Accounts | TOTP enforced for the admin group. Not phishing-resistant — see G-6 |
| IA-5 | Authenticator Management | 12-character minimum, PBKDF2-SHA512 at 210,000 iterations, history, lockout |
| IA-8 | Identification of Non-Organisational Users | Google federation through Keycloak |
| IR-4, IR-6 | Incident Handling and Reporting | Falcosidekick forwarding. **Gap G-8** for a documented response plan |
| RA-5 | Vulnerability Monitoring | Trivy in CI. **Gap G-3** for runtime and authenticated scanning |
| SC-7(3)(4)(5) | Boundary Protection | Single load balancer, default-deny, split-tunnel prevention via egress exclusions |
| SC-8(1) | Transmission Confidentiality and Integrity | mTLS in the mesh, TLS at ingress, TLS to the database |
| SC-12, SC-13 | Cryptographic Key Establishment and Use | cert-manager for public certificates, Terraform-generated mesh CA. **Gap G-2** — no HSM or KMS |
| SC-23 | Session Authenticity | Mutual TLS with workload identity; PKCE for the browser flow |
| SC-28 | Protection of Information at Rest | Provider-managed encryption only. **Gap G-9** |
| SI-2 | Flaw Remediation | Renovate/Dependabot not configured. **Gap G-3** |
| SI-4 | System Monitoring | Falco with platform-specific rules |
| SI-7 | Software, Firmware, and Information Integrity | Cosign verification at admission, read-only root filesystems |
| SR-4, SR-11 | Supply Chain — Provenance and Component Authenticity | Registry allowlist, signature verification, SBOM generation in CI |

---

## PCI DSS v4.0.1 — requirement mapping

Status meanings: **Supported** means the platform implements the technical
control; **Partial** means it implements some of it; **Organisational** means the
requirement is mostly about process and the platform cannot satisfy it;
**Not addressed** means there is nothing here for it.

| Req | Title | Status | Notes |
| --- | --- | --- | --- |
| 1 | Network security controls | Supported | Default-deny NetworkPolicy per namespace, single ingress point, egress restrictions, VPC-private database with a firewall accepting only the cluster. 1.2.8 (documented configuration standards) is organisational |
| 2 | Secure configurations | Supported | No vendor defaults survive: generated passwords everywhere, Pod Security `restricted`, admission-enforced hardening. 2.2.2 (no default accounts) — verify Keycloak's bootstrap admin is rotated after setup |
| 3 | Protect stored account data | **Not addressed** | The platform stores no cardholder data and provides no PAN truncation, tokenisation, or field-level encryption. If you need Requirement 3, see F-2 and reduce scope instead |
| 4 | Strong cryptography in transit | Supported | TLS 1.2+ at ingress with HSTS, mTLS in the mesh, TLS to the database. **G-1**: database `sslmode=require` does not authenticate the server; move to `verify-full` |
| 5 | Anti-malware | Partial | Falco provides behavioural detection, which most QSAs accept for container workloads under 5.2.3 (systems not commonly affected by malware) with a documented risk analysis. There is no signature-based scanning |
| 6 | Secure systems and software | Supported | Trivy gates in CI, immutable tags, signed images, admission control, change management via pull request. 6.4.3 and 11.6.1 (payment page script integrity) only apply if you host a payment page — another reason not to |
| 7 | Need-to-know access restriction | Supported | Per-app database roles, per-workload mesh authorization, admin group membership, no shared accounts. 7.2.4 (quarterly access reviews) is organisational — **G-10** |
| 8 | Identify and authenticate users | Supported | 8.3.6 twelve-character minimum met; 8.4.2 MFA for administrative access met via TOTP; 8.6 (application and system accounts) met through per-workload identities. Note MFA is required for admins only — extend it if end users touch a CDE |
| 9 | Physical access | **Inherited, unattested** | See F-2. There is no provider AOC to inherit from |
| 10 | Log and monitor | **Partial** | Detection and forwarding exist. 10.5.1 requires 12 months of retention with 3 months immediately available — **G-4**. 10.2 requires audit logs of all access to system components, and DOKS does not expose apiserver audit logs — **G-5**. 10.6 time synchronisation is handled by the node OS |
| 11 | Test security regularly | **Partial** | 11.3.1 internal vulnerability scanning is partly covered by Trivy; 11.3.2 requires quarterly external scans by an **ASV**, which is a purchased service — **G-3**. 11.4 penetration testing is organisational — **G-11**. 11.5.1 intrusion detection met by Falco |
| 12 | Organisational policy | **Organisational** | Nothing in a repository satisfies Requirement 12. You need written policies, security awareness training, a documented incident response plan tested annually, targeted risk analyses under 12.3.1, and service-provider due diligence |

**Summary.** The platform gives you a credible technical foundation for
Requirements 1, 2, 4, 6, 7, and 8. Requirements 3 and 9 are unaddressed and,
given F-2, are strong arguments for keeping cardholder data off this
infrastructure. Requirements 10, 11, and 12 need investment beyond code.

---

## DISA

### Kubernetes STIG V2R5

Setting aside F-1, the architecture aligns with the substance of most STIG
requirement areas. Verify exact V-IDs against the current release before an
assessment rather than trusting this table.

| STIG area | Alignment |
| --- | --- |
| Namespace segmentation and default-deny networking | Met — every namespace denies ingress and egress by default |
| Privileged containers and host namespace access prohibited | Met — Pod Security `restricted` plus explicit Kyverno denials |
| Non-root execution and dropped capabilities | Met |
| Read-only root filesystems | Met for application workloads |
| Image provenance from approved registries | Met — registry allowlist enforced at admission |
| TLS on all exposed services, TLS 1.2 minimum | Met |
| Kubelet read-only port disabled, anonymous auth off | **Provider-controlled.** DOKS manages the control plane and kubelet flags; you cannot set or evidence these. This is a real STIG gap on any managed Kubernetes service |
| Audit logging of API server activity | **Not met — G-5.** DOKS does not expose apiserver audit logs |
| FIPS 140-2/140-3 validated cryptographic modules | **Not met — G-12.** Neither the node images, Linkerd's Rustls-based proxy, nor Keycloak run in FIPS mode by default |
| PKI and DoD certificate usage | Not applicable outside a DoD network; the platform uses Let's Encrypt |

### DoD Zero Trust Strategy — seven pillars

| Pillar | Coverage |
| --- | --- |
| User | Strong: federated identity, MFA for privileged users, short sessions. Missing continuous multi-factor and behavioural analytics |
| Device | **Weak.** No device inventory, no comply-to-connect, no device attestation |
| Application & Workload | Strong: admission control, signed images, per-workload authorization, secure CI |
| Data | **Weak.** No classification, labelling, rights management, or DLP |
| Network & Environment | Strong: microsegmentation, default-deny, encrypted transport |
| Automation & Orchestration | Strong: fully declarative, policy as code, machine-verified controls |
| Visibility & Analytics | Moderate: detection exists, correlation and retention do not |

Reaching DoD **Target Level** would require closing the Device and Data pillars
and, first, moving to an authorised hosting environment per F-1.

---

## Gap register

Ordered by how much risk they carry, not by how hard they are.

| ID | Gap | Affects | Effort | Fix |
| --- | --- | --- | --- | --- |
| G-1 | Database TLS does not authenticate the server (`sslmode=require`) | PCI 4.2.1, NIST SC-8(1), 800-207 tenet 2 | Low | Switch to `verify-full` and mount the CA already present in the `database` secret. A one-line change per application plus a connection test |
| G-2 | Mesh CA private key lives in Terraform state; no KMS or HSM | PCI 3.6/3.7, NIST SC-12 | Medium | Move to the cert-manager rotation in `security/linkerd/cert-manager-rotation.yaml`, and hold the trust anchor in a KMS |
| G-3 | No external ASV scanning, no runtime vulnerability scanning, no dependency update automation | PCI 11.3.2, NIST RA-5, SI-2 | Medium | Purchase ASV scanning; add Trivy operator in-cluster; enable Renovate |
| G-4 | No centralised log aggregation, correlation, or 12-month retention | PCI 10.5.1, NIST AU-6, AU-11 | Medium | Ship Falco, ingress, and application logs to a managed SIEM with 12-month retention |
| G-5 | Kubernetes API audit logs unavailable on DOKS | PCI 10.2.1, NIST AU-2, K8s STIG | **Blocked** | Not solvable on DOKS. Mitigate with Falco's Kubernetes audit plugin against admission webhooks, or move to a provider that exposes audit logs |
| G-6 | No device trust; TOTP is not phishing-resistant | ZTMM Devices, 800-207 tenet 4, DoD Device pillar | Medium | Require WebAuthn/passkeys for administrators; issue device certificates and require them at the proxy |
| G-7 | Database backups retained 7 days, provider-managed only | NIST CP-9 | Low | Add scheduled logical dumps to object storage with your own retention and a restore test |
| G-8 | No documented, tested incident response plan | PCI 12.10, NIST IR-4 | Low | Write it, run a tabletop against a Falco CRITICAL alert, record the outcome |
| G-9 | Encryption at rest is provider-managed and unverified | PCI 3.5.1, NIST SC-28 | Medium | Application-level encryption for sensitive columns with keys you control |
| G-10 | No periodic access review | PCI 7.2.4, NIST AC-2 | Low | Quarterly review of the admin group and database roles; the evidence report is a good input |
| G-11 | No penetration testing | PCI 11.4, NIST CA-8 | Medium | Annual external test plus one after significant change. DigitalOcean permits customer penetration testing of your own resources |
| G-12 | No FIPS-validated cryptographic modules | DISA STIG, FedRAMP | High | Only worth pursuing alongside F-1 |

---

## Verification cadence

A control set that is not verified decays quietly. `scripts/verify-controls.sh`
checks what can be checked from inside the cluster and writes a dated evidence
file.

| When | What |
| --- | --- |
| Every deploy | `verify-controls.sh` runs in CI; a failure blocks the deploy |
| Weekly | Review Kyverno policy reports and Falco detections |
| Quarterly | Access review (G-10), internal vulnerability scan, ASV scan if in PCI scope |
| Annually | Penetration test, incident response tabletop, mesh trust anchor rotation, review this document against current standard versions |

The evidence files are the audit trail. Keep them.
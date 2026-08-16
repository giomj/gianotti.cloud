# Alpha-Phase Hybrid Cloud Mesh — Reference Architecture

Delivered 2026-08-16 (same session as the Quantum Datacenter reference architecture). Two files produced:

1. **hybrid-cloud-mesh-network-diagram.html** — self-contained diagram (light/dark toggle), persisted as Cowork artifact `hybrid-cloud-mesh-network-diagram`.
2. **Alpha-Phase-Hybrid-Cloud-Mesh-Architecture.docx** — companion design document (10 sections + sources).

## Relationship to the Quantum Datacenter design
Standalone — not a scaled-down version of the quantum datacenter. Confirmed with the user: this Alpha-phase mesh is the near-term, deployable-now connectivity fabric; the quantum-computing-focused localized datacenter (prior deliverable) is the **Beta phase**, expected to move through roughly a **64-month procurement/sales cycle** before it's built. The two designs deliberately share IPv6 + zero-trust + BGP conventions for a consistent house style, but use distinct ULA ranges (fd10:dc01::/32 for the quantum DC, fd20:mesh::/32 here) so they can be bridged later without address collisions.

## Design summary
- **Primary path (literal chain, 5 pods)**: Edge Pod (Intel NUC, AS 65001) → Comm Closet Pod (Nutanix, AS 65002) → Equinix COLO A (Nutanix, AS 65003) → OVH Cloud (Nutanix, AS 65004) → Equinix COLO B (Nutanix, AS 65005) → parallel fork to 5 hyperscaler pods.
- **Parallel multicloud fork**: Equinix COLO B forks simultaneously to DigitalOcean (AS 65010), AWS (AS 65011, NC2), Azure (AS 65012, NC2), GCP (AS 65013), IBM Cloud (AS 65014) — five independent concurrent sessions, not a single split link.
- **Mesh redundancy** (not just a chain): Edge↔Equinix A (bypasses comm closet), Equinix A↔Equinix B (bypasses OVH), each hyperscaler pod↔Equinix A (survives COLO B outage).
- **Transport**: WireGuard is the *only* inter-pod transport — every primary and redundant link is an encrypted, key-authenticated tunnel. WireGuard public keys double as zero-trust device/pod identity; AllowedIPs scoping is the first policy-enforcement layer.
- **Routing**: per-pod eBGP mesh — every pod is its own AS (16-bit private range 65001-65014), peering eBGP over each WireGuard tunnel. Deliberately different from the quantum DC's single-AS iBGP-core model, because here every pod is a genuinely separate administrative/physical domain.
- **IPv6**: fd20:mesh::/32 ULA, /48 per pod, /127 per WireGuard tunnel interface, SLAAC disabled (explicit assignment only, for identity attribution).
- **Zero trust**: WireGuard key identity + AllowedIPs → eBGP route hygiene (max-prefix, origin-only) → Nutanix Flow (owned/colo tier) → cloud VPC/NSG/security groups + NC2 Flow (hyperscaler tier) → central WireGuard Mesh Controller acting as the NIST 800-207 PDP (same control plane that issues/rotates keys).
- **Production evolution path documented**: real hyperscaler on-ramps (AWS Direct Connect, Azure ExpressRoute AS8075, Google Cloud Interconnect AS15169, IBM Direct Link AS36351) would run alongside the WireGuard overlay, not replace it; DigitalOcean has no native BGP on-ramp so stays overlay-only even in production.

## Sources used
- Nutanix Cloud Clusters (NC2) — supported on AWS and Azure
- bella.network "Internal BGP with WireGuard"; Wiunix "WireGuard Hub and Spoke BGP FRR"; NYC Mesh WireGuard+OSPF docs — grounding for the WireGuard+BGP mesh pattern
- RFC 6996 (private 16-bit ASN range), RFC 4193 (ULA)
- NIST SP 800-207 (Zero Trust Architecture)

## Open follow-ups (not yet done)
- AS numbers, IPv6 ranges, and pod counts are illustrative for the reference design — real deployment needs actual WireGuard mesh controller software chosen (e.g. Netmaker/Headscale-style or custom FRR-based), actual Equinix Fabric port/cross-connect ordering, and real hyperscaler account-level networking setup.
- No decision yet on which mesh-controller/key-management product to standardize on.
- Beta-phase (quantum datacenter) procurement timeline (64 months) is noted as context but no milestone plan has been built yet for that cycle.
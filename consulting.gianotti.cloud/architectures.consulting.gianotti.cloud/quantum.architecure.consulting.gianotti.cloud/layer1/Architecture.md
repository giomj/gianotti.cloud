# Alpha-Phase Physical Layer — Transport Medium & Site Architecture

Delivered 2026-08-16 (same session, third deliverable set following the Quantum Datacenter and Alpha-Phase Hybrid Cloud Mesh logical designs). Three files produced:

1. **physical-layer-transport-diagram.html** — self-contained diagram, persisted as Cowork artifact `physical-layer-transport-diagram`.
2. **Alpha-Phase-Physical-Layer-Architecture.docx** — narrative design doc (7 sections + sources).
3. **Physical-Layer-Circuit-Hardware-BOM.xlsx** — procurement-ready spreadsheet (Circuit BOM, Hardware BOM, Notes & Assumptions sheets; 2 live formulas, recalculated clean).

## Scope confirmed with user
User asked for all three physical-layer angles at once: (1) L1/L2 transport spec, (2) rack & site physical layout, (3) real-world carrier/circuit procurement plan — with **illustrative/generic site names** (not real Equinix IBX codes or named metros) but **real carrier and cloud-product names** used as procurement examples.

## Design summary
- **Per-hop physical medium**: DIA (Dedicated Internet Access) fiber/broadband for internet-routed legs (Edge↔CommCloset, CommCloset↔EquinixA, EquinixA↔OVH, OVH↔EquinixB, EquinixB↔DigitalOcean) — LC duplex single-mode fiber, SFP+/10GBASE-LR, 1-10Gbps, WireGuard-encrypted over public internet. Private Equinix Fabric virtual circuits for EquinixA↔EquinixB backbone and all 4 private hyperscaler on-ramps (AWS Direct Connect, Azure ExpressRoute, Google Cloud Partner Interconnect, IBM Cloud Direct Link) — all riding **one physical Fabric port at Equinix COLO B** as separate 802.1Q-tagged virtual circuits (the normal Fabric consumption model).
- **Rack elevations** (3 site types): Edge Pod = small tamper-evident enclosure (3× NUC, switch, LTE failover router, small UPS); Comm Closet Pod = 12-24U open-frame rack (3-node Nutanix, ToR switch, patch panel, HA WireGuard gateway pair, UPS, dual DIA demarcs); Equinix COLO A/B = 42U cabinet (4-node Nutanix, redundant ToR pair, Fabric ports ×2, A+B dual-corded power, badge/biometric access).
- **Power redundancy**: single feed at Edge (accepted risk), utility+UPS at Comm Closet (2nd circuit noted as future work), full A+B redundant feeds + facility UPS/generator at both Equinix COLOs.
- **Physical security tied to zero trust**: Edge tamper/TPM attestation → feeds device-posture PEP; Comm Closet badge/camera; Equinix COLO facility-standard badge+biometric+man-trap+CCTV+ticketed cross-connects — explicitly framed as the physical analog of the logical zero-trust model, ideally feeding the same PDP.
- **Procurement guidance**: DIA circuits (2+ carrier quotes — Lumen/Zayo/Cogent/GTT or local fiber ISP), Equinix Fabric ports/virtual connections (ordered via Equinix portal, days not weeks once port exists), cloud on-ramps (ordered in each provider's console then accepted on Fabric side), cross-connects (matching orders from both parties).

## Sources used
- Equinix Fabric / Physical Interconnection product docs (equinix.com, docs.equinix.com)
- Equinix Community "Connecting Fabric Cloud Router to AWS and Azure"
- Provider docs for AWS Direct Connect, Azure ExpressRoute, Google Cloud Partner Interconnect, IBM Cloud Direct Link (noted as subject to change — check current console/docs before ordering)

## Open follow-ups (not yet done)
- No real facility/metro selected yet — this stays illustrative until real sites are chosen.
- Actual bandwidth sizing, lead times, and pricing need real quotes; figures given are planning-level.
- Phase-2 redundancy links (Edge↔EquinixA backup, hyperscaler↔EquinixA backup) are designed but explicitly flagged as deferrable past initial buildout.
# Quantum Datacenter — Reference Network Architecture

Delivered 2026-08-16. Two files produced (see conversation for the actual deliverables):

1. **quantum-datacenter-network-diagram.html** — self-contained interactive diagram (light/dark toggle), persisted as a Cowork artifact `quantum-datacenter-network-diagram`.
2. **Quantum-Datacenter-Network-Architecture.docx** — companion design document (9 sections + sources).

## Design summary

Reference-pod scale (one repeatable block, not full hyperscale rack counts).

- **Topology pattern**: Google Jupiter-style Clos — aggregation blocks (spine + leaf/ToR) fanning out from a scalable spine, split into two independently-scaled fabric domains.
- **InfiniBand fabric (data lake)**: NDR 400G, 4 spine / 8 leaf switches. Hosts VAST Data's DASE architecture — D-Nodes (DBoxes, NVMe/SCM storage), C-Nodes (stateless compute, NVMe-oF mount-all-at-boot), plus a GPU/ML rack (Ray/PyTorch) for synthesis.
- **Ethernet fabric (web front end)**: 100/400GbE, 4 spine / 8 leaf switches. Hosts Nutanix AHV/CVM clusters — Rack A (AOS storage / results landing zone), Rack B (ML-serving/inference), Rack C (K8s-on-AHV public webapps/APIs).
- **Quantum core pod**: QPU + cryostat, classical FPGA control cluster, dual-homed gateway (IB HCA + 400GbE NIC — the only L3 IPv6 boundary between the two fabrics), quantum-safe (PQC) key distribution feeding the identity fabric.
- **Border/edge pod**: 2 border routers + perimeter WAF/IPS/DDoS scrub, all zero-trust PEPs.
- **IPv6 addressing**: ULA fd10:dc01::/32 underlay throughout (fabric domain /40 → pod /48 → rack /56-64 → P2P /127 per RFC 6164); GUA /48 only for the public Nutanix front end and border external interfaces. SLAAC disabled — static/DHCPv6 only, for identity attribution.
- **Routing**: Single internal AS 4200000001 (32-bit private ASN) running iBGP with hierarchical route reflection (RR-A serves Ethernet/border, RR-B serves InfiniBand/quantum, RR↔RR session between them) — explicitly chosen over the RFC 7938 eBGP-only hyperscale pattern per the user's request. eBGP only at the edge: Border Router A ↔ AS 65551 (upstream transit), Border Router B ↔ AS 65552 (partner/peering), with RPKI + max-prefix filtering before redistribution into iBGP.
- **Zero trust (NIST SP 800-207)**: central PDP in the OOB management fabric; PEPs at every zone boundary (border, quantum gateway, VAST per-tenant view policy, Nutanix Flow microsegmentation + identity-aware proxy + WAF, management break-glass). Identity fabric via SPIFFE/SPIRE-style workload SVIDs — trust is workload-identity-based, not IP/zone-based.
- **Primary data flow (5 steps, matches diagram badges 1-5)**: Quantum → VAST (NVMe-oF/RDMA over IB) → GPU/ML synthesis (all-to-all NVMe-oF mount) → back to gateway → Nutanix AOS storage (cross-fabric PEP-enforced push) → public webapps/APIs egress via eBGP edge.
- **Scaling notes**: horizontal pod replication behind added spine/RR capacity; OCS at the spine tier recommended once scaled past a handful of pods (mirrors Jupiter's own evolution); design supports multiple quantum core pods sharing one iBGP core/PDP.

## Sources used
- Google, "Jupiter Rising" SIGCOMM 2015; Google Cloud Blog on Jupiter's evolution (OCS)
- IETF RFC 7938 (BGP in large-scale DCs) — noted as the eBGP-only alternative this design deliberately departs from
- NIST SP 800-207 (Zero Trust Architecture)
- VAST Data "AI Operating System" white paper (DASE architecture)
- Nutanix Bible / AHV-CVM architecture docs

## Open follow-ups (not yet done)
- No dark-mode-validated categorical palette run through the dataviz validator script (used the documented default palette values directly since this is a topology diagram, not a statistical chart).
- Rack counts, spine radix, and AS numbers are illustrative placeholders for a reference pod — would need real capacity planning (job sizes, QPU shot rates, expected webapp traffic) before being used as an actual build spec.
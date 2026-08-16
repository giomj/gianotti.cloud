# MG-1 — Architecture Framework

**Purpose:** define the *layered architecture* that MG-1 and its adjacent artifacts (MG-2, MG-3, MG-C1) sit inside, so that ratification does not depend on any one document. If you read only this file, you should know what MG-1 is, what it is not, who owns each layer, and where the covenant lines are.

---

## 1. Four architectural layers

MG-1 is a **stack**, not a machine. The four layers separate concerns cleanly enough that a change in one layer never silently corrupts another.

### 1.1 Physical layer — the coupling

- **What lives here.** Magnets, pole pieces, air gaps, rotors, shafts, bearings, standoffs, shims. The magnetic gear as a mechanical object.
- **Owner.** The Engineer seat.
- **Contract to the layer above.** \(\tau_{in}, \tau_{out}, \tau_{react}\) at the shaft interfaces, plus a mechanical envelope (max speed, max torque, max axial thrust).
- **Failure modes trapped at this layer.** Bolt walk-in, magnet-array polarity errors, bearing thrust overload, gap-shim mis-selection, frame creep.
- **Change control.** Anything that touches this layer requires a v-major bump in the drawing set and a re-run of Gate 0 (dry rotation + torque cell calibration).

### 1.2 Instrumentation layer — the *three-port instrument*

- **What lives here.** The two rotary torque cells, the reaction load cell, the two AS5047P encoders, the NTC thermistors, the DAQ, the wiring harness. The measurement chain.
- **Owner.** The Mathematician seat (via the uncertainty budget) + the Engineer seat (physical build).
- **Contract.** Time-tagged \(\tau_{in}(t), \tau_{out}(t), \tau_{react}(t), \omega_{in}(t), \omega_{out}(t), T_{mod}(t), T_{ambient}(t)\) with a written \(u(\cdot)\) on every channel.
- **Failure modes trapped here.** Common-mode reaction-cell drift (from arm creep), thermal drift on load cells, ground-loop noise, unsynchronised timestamps.
- **Change control.** No test session begins without a Gate 0.5 dead-weight calibration of the reaction cell.

### 1.3 Safety layer — SAFE-01

- **What lives here.** E-stops, contactors, brake resistor, hardware ratio-slip detector, hardware over-temp comparator, cover interlock, USB-PD sink-shed. **All hardware. No firmware in this layer.**
- **Owner.** The Skeptic seat (verification) + the Emperor (ratification of the chain).
- **Contract.** *SAFE-01 is the sole authority to remove torque from any rotating part of the system.* Nothing else — not the RSD estimator, not the DAQ, not the drive controller — has that authority.
- **Failure modes trapped here.** Runaway drive, thermal runaway, slip runaway, operator entry with rotor spinning, USB-PD sink saturation.
- **Change control.** Modification to any SAFE-01 wire is a Council-level change requiring re-ratification.

### 1.4 Cognition layer — RSD estimator, gates, doctrine

- **What lives here.** The RSD KLE estimator (slip observer, thermal virtual sensor); the Gate 0..4 protocols; the venture doctrine (\(P_{out} \le P_{in}\), CBJG Customs firewall, six-seat review); the notebooks, plots, and analysis.
- **Owner.** The Historian/Philosopher (doctrine) + the Physicist (models) + the Mathematician (statistics).
- **Contract.** *Observation and recommendation only. No wires cross from cognition into safety.* The estimator can raise alarms; it cannot remove torque.
- **Failure modes trapped here.** Overfitting a slip observer to noise, misinterpreting Gate 4 pass without a written uncertainty bound, marketing use of raw MG-1 data via the CBJG Customs venture wrapper.
- **Change control.** Changes to the RSD estimator require a matched change to the observer's test-set predictions; changes to doctrine require a Council session.

---

## 2. Cross-cutting concerns

### 2.1 Provenance

- **GitHub is the archive of record.** All CAD, code, notebooks, and datasets live in `giomj/dev` under `hardware/mg-1/`.
- **Notion is a live mirror** — Scribe seat maintains it, updates propagate via the existing MCP integration.
- **On disagreement, GitHub wins.** Explicit rule from the Grand Council charter ([reading-room seat map](https://app.notion.com/p/3a1b1ccc4c018139ae13e79d2d08eddb)).
- **Every Council-ratified artifact carries a `provenance` block** at the top: `origin`, `first_ratified`, `last_ratified`, `revision`, `github_commit`, `notion_page`.

### 2.2 Venture firewall

- **CBJG Customs** ([issue #15](https://github.com/giomj/dev/issues/15)) is a *venture wrapper* whose investor thesis includes "free-energy motor" language.
- **MG-1 outputs are the highest-quality technical evidence CBJG holds.** They *will* be repurposed if the firewall is unstated.
- **Covenant, hoisted into every MG artifact:**

  > No MG-1, MG-2, MG-3, or MG-C1 data (raw, plotted, or narrated) may be attached to CBJG Customs venture materials, investor communications, or public campaigns until (a) an independent calorimetry report of a ≥1 kW-class hardware iteration is signed by an outside lab, and (b) securities counsel opines on the venture materials.

- This is a Council covenant, not an engineering decision. Enforcement is by the Historian/Philosopher and the Emperor.

### 2.3 Ethics and public communication

- **The reel is a trigger, not a citation.** Primary sources (Atallah–Howe, MDPI, NSF Halbach papers) go in the drawing set; the reel gets one line in the origin story.
- **"Free-energy" language is excised, not qualified.** MG-1 is an *energy-conversion instrument*. Every artifact repeats this.
- **Slip is a safety primitive, not a defect.** The comment "if only we coupled harder, we'd get more torque" is public-good territory for a well-written FAQ; do that once, cite it, and move on.

### 2.4 Failure-mode traceability

Every failure mode in §1.1–1.4 must have:

- a **detection method** (which layer sees it),
- a **response** (which authority stops the test),
- a **log destination** (GitHub or Notion),
- a **gate that trips on it** (Gate 0..4).

The Council review demands this table be filled in by v0.2 of the drawing set. A first pass is in `MG-1_Grand_Council_Review.md` §5.

---

## 3. Interfaces (data + physical)

| Interface | Type | From → To | Contract |
|---|---|---|---|
| I-M-1 | Mechanical | HS shaft ↔ HS drive | Ø8 mm, keyed, ≤3000 rpm, ≤2 N·m |
| I-M-2 | Mechanical | LS shaft ↔ LS load | Ø10 mm, keyed, ≤667 rpm, ≤5 N·m |
| I-M-3 | Mechanical | Modulator arm ↔ reaction cell | rigid Al bar, 88 mm arm, up to 50 N |
| I-M-4 | Thermal | Modulator body ↔ NTC | Kapton-taped, T_mod ≤ 90 °C at cell |
| I-E-1 | Electrical | Drive contactor ↔ HS drive | 3-phase, 24 V DC-link, 5 A |
| I-E-2 | Electrical | PMSG ↔ rectifier | 3-phase, 30 V bus, 1 A phase |
| I-E-3 | Electrical | Buck-boost ↔ USB-PD | 5 V / 9 V / 12 V negotiated, ≤3 A |
| I-D-1 | Data | DAQ ↔ GitHub | 10 kHz CSV, hourly commits |
| I-D-2 | Data | RSD estimator ↔ DAQ | shared-memory ring buffer, 1 kHz |
| I-D-3 | Data | SAFE-01 latch ↔ log | I²C to logger, no interlock impact |
| I-C-1 | Cognition | Notion ↔ GitHub | MCP two-way, GitHub authoritative |
| I-C-2 | Cognition | Council review ↔ artifacts | ratification block on each |

---

## 4. Deployment topology

```
        ┌──────────────── benchtop (garage, tabletop) ────────────────┐
        │                                                             │
        │   MG-1 rig  ──I-D-1──▶  Local NUC (DAQ, notebook host)      │
        │       │                    │                                │
        │       │ SAFE-01            │  10 kHz sync                   │
        │       ▼                    ▼                                │
        │   Contactors +         GitHub (giomj/dev)                    │
        │   brake R                  ▲                                │
        │                            │ MCP mirror                    │
        │                        Notion Grand Council project        │
        └─────────────────────────────────────────────────────────────┘

                Off-site:
                  ┌──── IBM Quantum ────┐    ┌──── D-Wave hybrid ────┐
                  │  VQA-Poisson slice  │    │  QUBO topology opt    │
                  │  (Qiskit, IBMQ conn)│    │  (leap client)        │
                  └─────────────────────┘    └───────────────────────┘

                CBJG Customs venture wrapper:  ⊗ no direct link ⊗
```

---

## 5. Governance and change control

- **Six-seat review** for any v-major change (v0.1 → v0.2 etc.) or any change to safety/doctrine.
- **Emperor ratifies** the review outcome; conditional passes list blocking conditions with owners and gates.
- **Councillor pings by GitHub label:** `physicist`, `engineer`, `mathematician`, `historian`, `skeptic`, `scribe`. Every issue that touches an MG artifact gets tagged.
- **Reset criteria:** a Gate 4 failure (measurement suggests \(\eta > 1\) after cell swap AND dead-weight cal passed) triggers automatic re-convocation. A SAFE-01 latch event triggers automatic re-convocation. A CBJG Customs firewall breach triggers automatic re-convocation.
- **Public communication** on any MG topic passes through Historian/Philosopher review; venture communication additionally passes through Skeptic + Emperor.

---

## 6. Rulebook — one page

1. \(P_{out} \le P_{in}\) at all times. Gate 4 is contractual. No exceptions.
2. Six seats + Emperor for any v-major change. Ratification block on every artifact.
3. SAFE-01 is the sole torque-removal authority. RSD observes, never actuates safety.
4. Three ports are measured; every derived efficiency carries a written uncertainty.
5. Air-gap-critical parts are metal. Printed parts are non-critical or explicitly measurement-neutral.
6. Ferrofluid in the gap is prohibited. Ferrofluid for polarity QC is approved.
7. CBJG Customs firewall is Council-level; only calorimetry + counsel opens it.
8. GitHub wins on any GitHub/Notion disagreement.
9. Primary literature over reels. One reel citation per artifact maximum.
10. Any new venture wrapper around any MG artifact starts as an issue in `giomj/dev` with a `venture-review` label and is reviewed by all six seats before it exists in the world.

---

**End of framework.** All four artifacts (MG-1, MG-2, MG-3, MG-C1) live under this stack, share these covenants, and change only through this governance.

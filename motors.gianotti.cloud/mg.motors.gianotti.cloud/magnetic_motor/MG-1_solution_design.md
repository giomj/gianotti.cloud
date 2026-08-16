# MG-1 — Flux-Modulated Magnetic Gear Stage
### Solution Design v0.1 · CBJG LLC · Benchtop Motor Program

**Source stimulus:** Instagram reel by [scaling.larry](https://www.instagram.com/reel/DbUBWasiig4/) — "What makes magnetic gearboxes so amazing (Part 1)", a 3D-printed magnet-disc-plus-steel-bolt gearbox. Tagged #3dprinting #gearbox #science.

---

## 1. What the video actually shows

Stripped of the maker aesthetic, the device in the reel is a **coaxial/axial flux-modulated magnetic gear** — the Atallah–Howe topology, printed instead of machined:

| Video element | Engineering role |
|---|---|
| Blue disc with embedded magnets | High-speed rotor, \(p_{in}\) pole pairs |
| Orange disc with large through-holes | Modulator carrier |
| Hex bolts / nuts seated in that carrier | Ferromagnetic pole pieces that spatially modulate the field |
| Second magnet set (the "coin/washer" handling shots) | Low-speed rotor, \(p_{out}\) pole pairs |
| Purple printed base | Structural frame, bearing seats, air-gap datum |

The steel bolts are not fasteners in this context. They are the **flux modulators** — the whole trick. Ferromagnetic pole pieces interposed between two rotors create space harmonics that let a low-pole-pair rotor couple to a high-pole-pair rotor, so every magnet contributes to torque transmission rather than a single tooth pair ([University of Southampton thesis on magnetic gearing](https://eprints.soton.ac.uk/455775/1/Thesis_Thang_Van_Lang_28164431_final.pdf)). The bolt-count rule that maker builds use — "add the magnet counts and divide by two" — is exactly the academic condition \(n_s = p_{in} + p_{out}\) ([Instructables magnetic gearbox build](https://www.instructables.com/Magnetic-Gear-Box/), [Portland State comparative analysis](https://pdxscholar.library.pdx.edu/ece_fac/466/)).

### Governing relations

Modulator count for maximum coupling:
\[ n_s = p_{in} + p_{out} \]

Gear ratio with the modulator ring held stationary:
\[ G_r = -\frac{p_{out}}{p_{in}} \]

The negative sign means counter-rotation ([FEMTO-ST coaxial magnetic gear model](https://publiweb.femto-st.fr/tntnet/entries/13095/documents/author/data)). Fixing the outer rotor instead gives \(G = n_s / p_{in}\) ([UT Dallas flux-angle mapping paper](https://bpb-us-e2.wpmucdn.com/labs.utdallas.edu/dist/9/93/files/2022/07/Flux-Angle-Mapping-ECCE-2022.pdf)).

### Why it matters for CBJG

The commenters arguing "0 torque allowed" and "unlimited torque if you couple better" are both wrong, in opposite directions. Real coaxial magnetic gears reach **72–284 N·m/L** with sintered rare-earth magnets and laminated pole pieces, at **>97% efficiency above 75% of pull-out torque** ([MDPI review of magnetic gear technologies](https://www.mdpi.com/1996-1073/16/4/1721), [Atallah & Howe, high-performance magnetic gears](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182), [NSF-hosted Halbach rotor CMG paper](https://par.nsf.gov/servlets/purl/10106669)). That is transmission-grade. But torque is hard-capped by pull-out — exceed it and the gear slips harmlessly instead of shearing teeth.

That last property is the reason this belongs in the CBJG program: **pull-out slip is an inherent mechanical torque limit, and it is a genuine safety primitive.**

---

## 2. Problem statement

The benchtop program runs a 6.5" SPM hoverboard hub motor at 48 V with an STM32G474 controller and a hardware-latched safe-torque-off chain. Two gaps:

1. **No mechanical overload limit.** Today, SAFE-01 removes torque electrically. A jammed rotor or a control fault can still deliver full stall torque into the shaft and load fixture until the electrical chain trips.
2. **No speed matching for dyno work.** The hub motor is direct-drive and low-RPM. Characterizing RSD estimators across a wider speed/torque envelope means either a second machine or a ratio stage.

**MG-1 addresses both** with one contactless, printed, sub-$200 module.

---

## 3. Solution overview

A modular **axial-flux magnetic gear cartridge** that bolts between the drive motor and the dyno load partner, with **fully isolated input and output shafts** (no mechanical path, no lubricant, no wear debris) and a **calibrated, repeatable slip torque**.

```
[Hub motor] --shaft--> [ MG-1 HS rotor ]
                          ) air gap 0.8 mm
                       [ modulator ring — 11 steel bolts, FIXED to frame ]
                          ) air gap 0.8 mm
                       [ MG-1 LS rotor ] --shaft--> [Torque cell] --> [Load motor]
                              |
                       [Frame-mounted reaction arm --> static torque sensor]
```

The modulator ring is grounded to the frame, so the third reaction torque is measurable — which makes MG-1 a **three-port instrument**, not just a reducer. Measuring all three ports simultaneously gives a closed energy balance with no unmeasured path. That is directly useful to the CBJG Customs verification gate.

### Design point

| Parameter | Value | Rationale |
|---|---|---|
| HS rotor pole pairs \(p_{in}\) | 2 (4 magnets) | Low count keeps printed tolerance demands sane |
| LS rotor pole pairs \(p_{out}\) | 9 (18 magnets) | Sets the ratio |
| Modulator bolts \(n_s\) | 11 | \(n_s = p_{in} + p_{out}\) |
| Gear ratio | **4.5 : 1**, counter-rotating | Non-integer → reduced cogging beat |
| Active OD | 90 mm | Fits existing bench fixture |
| Air gap (each side) | 0.8 mm nominal | Printed-part realism; 0.5 mm is a stretch goal |
| Magnets | N42 NdFeB, 20 × 10 × 5 mm axial | Off-shelf, cheap |
| Modulator poles | M8 × 40 low-carbon steel bolts | Direct lift from the video |
| Target pull-out torque (LS side) | ≥ 1.5 N·m | See §5 |
| Max input speed | 3000 rpm → 667 rpm out | Eddy-loss bounded, see §6 |

---

## 4. Mechanical design

**Frame:** printed PETG or ASA, not PLA. Magnetic gears run warm from eddy heating and PLA creeps at 55 °C; a crept air gap means a collapsed gap means a magnet crash. Non-negotiable.

**Rotors:** printed carriers with press-fit magnet pockets, 0.15 mm interference, cyanoacrylate backup. **Every magnet pocket must be keyed so it can only accept one polarity orientation.** Alternating-polarity assembly errors are the single most common failure in maker builds and are nearly invisible after glue-up.

**Air-gap control:** the gap is the whole ballgame — torque falls off steeply with it. Use metal, not plastic, for the gap-critical stack: aluminium standoffs between frame plates, 608 bearings in printed seats with a metal bearing sleeve. Add a **shim-adjustable gap** (0.1 mm shim stack) so gap-vs-torque can be swept experimentally.

**Axial thrust:** axial-flux topologies generate large static attraction between rotor and modulator. Size bearings for thrust, not just radial load, and design the frame so that **at no point during assembly can a rotor free-fly into the modulator**. Use a threaded-rod assembly jig that walks the rotors in under control.

**Containment:** the rotors carry NdFeB at up to 3000 rpm in a printed carrier. A polycarbonate burst shroud is mandatory before any run above 500 rpm, and it must be interlocked into the existing enclosure chain (ties into open build gate on issues #5/#6/#7/#13/#14).

---

## 5. Torque expectation — the honest number

Literature torque densities of 100–284 N·m/L assume sintered magnets, laminated silicon steel pole pieces, and sub-millimetre gaps ([UT Dallas / NSF Halbach CMG](https://par.nsf.gov/servlets/purl/10106669)). MG-1 has none of those. Active volume:

\[ V_A = \pi (0.045)^2 (0.020) \approx 1.27 \times 10^{-4}\ \text{m}^3 = 0.127\ \text{L} \]

Even a pessimistic printed-build density of 12–20 N·m/L predicts **1.5–2.5 N·m** at the low-speed shaft, ~0.35–0.55 N·m at the input. That is real, useful bench torque — and it is also why the "rating of 1 ft-lb" comment on the reel is roughly correct rather than an insult. The design target is set at the bottom of that band deliberately.

**Do not scale this claim by ratio.** \(P_{out} \le P_{in}\), always. Any measurement suggesting otherwise is an instrumentation error, not a discovery. This is written into the test plan as a hard falsification check (§8).

---

## 6. Loss model and the eddy-current problem

The reel's sharpest comment — "curious abt losses due to eddy currents" — identifies the real weakness. Solid steel bolts are, electromagnetically, a bad idea: eddy loss scales with the **square of conductor thickness and the square of field frequency** ([IJECE eddy-loss formulation](https://ijece.iaescore.com/index.php/IJECE/article/download/25868/15461)). In analysed coaxial gears the pole pieces alone account for ~41% of total iron loss ([COMPUMAG eddy-loss reduction study](https://www.compumag.org/Proceedings/2019_Paris/files/papers/PC-A3-16.pdf)), and solid-core pole pieces produce far larger eddy loss than hysteresis loss ([KoreaScience CMG loss analysis](https://koreascience.kr/article/JAKO201814446221029.pdf)).

Modulation frequency at the pole pieces is \(f = n_s \cdot \omega_{in}/(2\pi) \cdot p_{in}/n_s\) — practically, hundreds of Hz at 3000 rpm. Mitigations, in build order:

1. **V1 — accept it.** Solid M8 bolts. Instrument temperature with a thermistor on the modulator ring. Establish the baseline loss curve. This is the scientifically valuable step, not a compromise.
2. **V2 — segment.** Replace each bolt with a bundle of 6× M3 rods, or a stack of washers, cutting effective \(d\) by ~2.7× → eddy loss down roughly 7×.
3. **V3 — laminate.** Wire-EDM or stacked laminations from 0.35 mm M19 steel. Approaches literature efficiency.

The V1→V3 sweep, with input/output/reaction torque measured at each stage, produces a clean, publishable loss-vs-lamination dataset. That is the actual deliverable.

---

## 7. Instrumentation and control integration

| Channel | Sensor | Purpose |
|---|---|---|
| Input torque | inline rotary cell or motor \(i_q\) estimate | Power in |
| Output torque | inline cell at LS shaft | Power out |
| Reaction torque | load cell on modulator arm | Closes the balance: \(\tau_{in} + \tau_{out} + \tau_{react} = 0\) |
| Input / output speed | AS5047P encoders both shafts | Slip detection |
| Modulator temperature | NTC on ring + IR spot | Eddy heating |
| DC bus V/I | existing INA240A2 | Electrical input |

**RSD role — unchanged from program doctrine.** RSD acts as estimator, fault detector, and thermal virtual sensor. Specifically:

- **Slip observer.** Compare measured \(\omega_{out}\) against \(\omega_{in}/4.5\). Any persistent deviation = pull-out slip. Latch a fault. This is a genuinely new capability: a contactless gearbox that reports its own overload without a torque sensor.
- **Thermal virtual sensor.** Estimate modulator core temperature from speed and transmitted torque, cross-validate against the NTC. A divergence between model and sensor is itself a fault signal.
- **Information-per-joule scheduling.** The V1/V2/V3 sweep is a designed experiment; let the scheduler pick operating points.

RSD does **not** sit in the safety path. Slip detection is an observation, not an interlock. The hardware STO chain remains the only torque-removal authority, per SAFE-01.

---

## 8. Verification plan

**Gate 0 — static, no power.** Hand-turn the input. Confirm 4.5 rotations in ↔ 1 rotation out, counter-rotating. If the ratio is wrong, a magnet polarity is inverted. Stop and rebuild.

**Gate 1 — static pull-out.** Lock the output, apply a torque wrench to the input, record the breakaway angle and torque. Repeat 10×. Pull-out must be repeatable within ±10%. Record vs. shimmed air gap: 0.6 / 0.8 / 1.0 / 1.2 mm.

**Gate 2 — current-limited spin.** Bench supply, current-limited, no battery. 100 → 500 rpm. Thermal soak 20 min at each point. Watch the modulator ring temperature. Do not proceed if the printed frame exceeds 50 °C.

**Gate 3 — loaded efficiency map.** Shroud on, interlock live. Sweep speed × torque. Compute \(\eta = P_{out}/P_{in}\).

**Gate 4 — falsification check (mandatory).** Explicitly test for \(\eta > 1\) using the three-port balance with sensors cross-calibrated and swapped between ports. Expected and required result: **no excess energy, within measurement uncertainty.** Document the uncertainty band. A magnetic gear that appears over-unity is a miscalibrated torque cell — and this rig, with all three ports instrumented, is precisely the tool that proves it. Publishing that negative result strengthens the CBJG Customs verification posture far more than a hedge would.

**Exit criteria:** ratio verified, pull-out repeatable ±10%, \(\eta \ge 80\%\) at V1 in the 40–80% pull-out band, no thermal runaway at rated speed, energy balance closes within instrument uncertainty.

---

## 9. Bill of materials (indicative)

| Item | Qty | Est. |
|---|---|---|
| N42 NdFeB 20×10×5 mm | 24 | $35 |
| M8×40 low-carbon steel bolts + nuts | 11 sets | $12 |
| 608ZZ bearings | 6 | $10 |
| Aluminium standoffs, shim stock | set | $20 |
| PETG/ASA filament | ~600 g | $18 |
| Polycarbonate sheet (shroud) | 1 | $25 |
| Inline torque cell (or reuse bench cell) | 1–2 | $0–180 |
| AS5047P encoder boards | 2 | $30 |
| NTC + wiring | — | $8 |
| **Total (reusing bench sensors)** | | **~$160** |

V2/V3 modulator variants add ~$40 and ~$120 respectively.

---

## 10. Phased plan

| Phase | Scope | Gate |
|---|---|---|
| **P0 — Model** | FEA or analytical sizing; confirm \(n_s = p_{in}+p_{out}\), estimate pull-out vs gap | Predicted pull-out ≥ 1.5 N·m |
| **P1 — Print & assemble V1** | Solid-bolt modulator, keyed magnet pockets, shim-adjustable gap | Gate 0 + Gate 1 pass |
| **P2 — Instrument** | Three-port sensing, RSD slip observer, thermal virtual sensor | Gate 2 pass |
| **P3 — Characterise** | Full efficiency map, Gate 4 falsification | Signed dataset |
| **P4 — V2/V3 modulators** | Segmented rods, then laminations | Loss-vs-lamination curve |
| **P5 — Integrate** | MG-1 as standard CBJG dyno reduction module | Interlock coverage resolved |

---

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Magnet polarity assembly error | Wrong ratio, near-zero torque | Keyed pockets; Gate 0 before glue cures fully |
| Printed frame creep → gap collapse | Rotor crash, magnet fragmentation | PETG/ASA only; metal gap-critical stack; 50 °C limit |
| Eddy heating in solid bolts | Efficiency collapse, thermal runaway | NTC monitoring; V2/V3 path pre-planned |
| Uncontained rotor burst | Injury | PC shroud + enclosure interlock before >500 rpm |
| Torque cell miscalibration | Spurious over-unity reading | Three-port balance; sensor swap between ports at Gate 4 |
| Pinched fingers during assembly | Injury | Threaded-rod assembly jig; never hand-mate rotors |
| Scope creep into "free energy" framing | Program credibility | §5 and Gate 4 are contractual, not advisory |

---

## 12. What this unlocks

Beyond the dyno stage: an inherently torque-limited, contactless, lubricant-free coupling with a measurable third port. That is a **mechanically-enforced safety limit that no firmware fault can exceed** — a complement to SAFE-01, at the shaft rather than the inverter. If P3 closes cleanly, the natural follow-on is a **magnetically-geared machine**: integrating the gear stage into the hub motor's rotor rather than bolting it on, which is where the torque-density literature gets genuinely interesting.

---

### Sources

- [scaling.larry, "What makes magnetic gearboxes so amazing (Part 1)"](https://www.instagram.com/reel/DbUBWasiig4/)
- [Atallah & Howe, High-performance magnetic gears, JMMM](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182)
- [A Review of Magnetic Gear Technologies Used in Mechanical Power Transmission, MDPI Energies](https://www.mdpi.com/1996-1073/16/4/1721)
- [A High Torque Density Halbach Rotor Coaxial Magnetic Gear (NSF PAR)](https://par.nsf.gov/servlets/purl/10106669)
- [Flux Angle Mapping Coaxial Magnetic Gears for High Gear Ratios, UT Dallas](https://bpb-us-e2.wpmucdn.com/labs.utdallas.edu/dist/9/93/files/2022/07/Flux-Angle-Mapping-ECCE-2022.pdf)
- [Comparative Analysis of a Coaxial Magnetic Gearbox, Portland State](https://pdxscholar.library.pdx.edu/ece_fac/466/)
- [Modeling of a Coaxial Magnetic Gear, FEMTO-ST](https://publiweb.femto-st.fr/tntnet/entries/13095/documents/author/data)
- [A linear to rotary magnetic gear (thesis), University of Southampton](https://eprints.soton.ac.uk/455775/1/Thesis_Thang_Van_Lang_28164431_final.pdf)
- [Analysis of Eddy Current Loss Reduction, COMPUMAG 2019](https://www.compumag.org/Proceedings/2019_Paris/files/papers/PC-A3-16.pdf)
- [Eddy current loss in solid-core pole pieces, JEET/KoreaScience](https://koreascience.kr/article/JAKO201814446221029.pdf)
- [Eddy current loss formulation, IJECE](https://ijece.iaescore.com/index.php/IJECE/article/download/25868/15461)
- [Magnetic Gear Box build, Instructables](https://www.instructables.com/Magnetic-Gear-Box/)

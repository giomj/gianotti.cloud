# MG-C1 Energy Transformer — Hand-Crank USB-PD Charger

**Design status:** engineering integration specification  
**Program:** CBJG LLC / MG series  
**Companion artifacts:** *MG-1 solution design*; *MG-2 applications study*; 15-sheet drawing set (sheet 13, power flow; sheet 14, charging schematic; sheet 15, crank general arrangement); *MG-3 ferrofluid assessment*.

**Verification basis.** All MG-C1 numerical design values in this document are the locked values from the [MG-C1 power-budget calculation](file:///home/user/workspace/cad/mgc1_budget.py), the [MG-C1 BOM data](file:///home/user/workspace/bom_data.py), and the [MG-1 gate definitions](file:///home/user/workspace/MG-1_solution_design.md). External links provide technology, component, and human-factors provenance; the internal links identify the controlled design source for the exact values.

## 1. Scope and honest framing

MG-C1 turns human mechanical work into a conditioned USB-C output. It is built around MG-1, a 3D-printed flux-modulated coaxial magnetic gear using the Atallah–Howe topology: 20 HS magnets, 18 LS magnets, 11 modulator pole pieces, active volume 0.150 L, and counter-rotating ratio \(G=-4.5\). Flux-modulated magnetic gears are torque/speed transmissions; they do not create energy. [Atallah & Howe’s magnetic-gear work](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182) and [Magnomatics’ pseudo-direct-drive overview](https://www.magnomatics.com/technology/pseudo-direct-drive) are the relevant technology basis.

**Energy rule:** \(P_{\text{out}} \le P_{\text{in}}\), always. In practice, each mechanical, electrical, storage, and conversion stage consumes part of the input. The reel comment section assumed free energy; this document exists to state the opposite in numbers and to specify the test that falsifies any contrary reading. The negative gear-ratio sign denotes counter-rotation, not an energy sign change. [Atallah & Howe](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182)

MG-1 is predicted to pull out at 1.8–3.0 N·m at its low-speed (LS) port. Pull-out is useful: it is a contactless mechanical torque fuse. It is also a hard harvest limit: torque beyond pull-out produces relative slip rather than more transmitted generator torque. This is a deliberate safety-versus-power trade, not an efficiency defect to be solved in firmware. [Magnomatics describes the pseudo-direct-drive principle](https://www.magnomatics.com/technology/pseudo-direct-drive).

## 2. System architecture

```text
Hand crank
  → MG-1 low-speed port
  → MG-1 high-speed port
  → 6.5 in hub motor operated as PMSG
  → 3-phase rectifier
  → buck-boost charger
  → 4S LiFePO4 buffer + BMS
  → USB-PD source controller
  → USB-C device
```

The 6.5 in hub motor is used as a permanent-magnet synchronous generator (PMSG), with \(k_V = 13.4\ \text{rpm/V}\). The selected 6.5 in hub motor is budgeted at $106.99 from [Monster Scooter Parts](https://monsterscooterparts.com). This is a discrete gear-plus-generator implementation, not an integrated pseudo-direct-drive machine; the integrated PDD architecture is the longer-term MG-2 direction. [Magnomatics](https://www.magnomatics.com/technology/pseudo-direct-drive)

## 3. Locked design point

At 90 rpm crank speed and 2.4 N·m at the LS port,

\[
P_{\text{mech}}=\tau\omega=2.4\left(90\frac{2\pi}{60}\right)=22.6\ \text{W}.
\]

The \(-4.5\) ratio produces 405 rpm at the HS port and 0.53 N·m, with opposite rotation. The estimated generated line voltage is \(V_{\text{gen}}\approx30.2\ \text{V}\). The configuration is consistent with the normal torque/speed transformation role of a coaxial magnetic gear. [Atallah & Howe](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182)

At this point, the modulator field frequency is 74 Hz. That is only 1.8% of the rated (3000 rpm input) eddy-loss figure, because the comparison is based on the frequency-squared loss dependence. Therefore solid M8 pole pieces (V1) are adequate for MG-C1 charger duty; the laminated V2/V3 variants matter only near rated speed. Eddy-current-loss reduction by segmentation/lamination remains the appropriate high-speed path. [COMPUMAG’s eddy-current-loss study](https://www.compumag.org/Proceedings/2019_Paris/files/papers/PC-A3-16.pdf)

## 4. Efficiency budget at the design point

The following is a **design-point budget**, not a guarantee. It must be replaced by the Gate 3 measured map before product claims are made.

| Stage | Efficiency | Running output | Comment |
|---|---:|---:|---|
| Mechanical input at crank / MG-1 LS port | — | 22.60 W | 90 rpm, 2.4 N·m |
| Magnetic gear | 0.90 | 20.36 W | Low-frequency V1 operation |
| Hub motor as PMSG | 0.75 | 15.27 W | Low-speed copper-loss-dominated estimate |
| 3-phase Schottky bridge | 0.97 | 14.81 W | Approximately 30 V bus |
| Buck-boost charger | 0.93 | 13.77 W | CC/CV charge conversion |
| LiFePO4 buffer round trip | 0.94 | 12.95 W | Deliberate source/load decoupling loss |
| USB-PD conversion | 0.93 | **12.04 W** | USB-C port output |

Overall design-point efficiency is **53.2%**, i.e. \(12.04/22.60\). No component of this table can raise net output above the mechanical input; the measured energy balance, rather than this arithmetic budget, is the acceptance evidence. [Atallah & Howe](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182)

## 5. Operating band and user-visible output

At fixed 90 rpm, pull-out torque sets the usable mechanical-input band and therefore the USB output band.

| LS torque condition | Mechanical input | USB output | Interpretation |
|---|---:|---:|---|
| Pull-out low: 1.8 N·m | 17.0 W | 9.0 W | Conservative demonstrated capability target |
| Design: 2.4 N·m | 22.6 W | 12.0 W | Nominal operator target |
| Pull-out high: 3.0 N·m | 28.3 W | 15.1 W | Upper predicted capability; not a continuous product claim before Gate 1 |

The output band is governed by MG-1 pull-out, not by an assumed abundance of human power. Record the Gate 1 pull-out result as a **specified safety parameter**, including shims, temperature, test method, repeatability, and build revision. The *MG-1 solution design* requires ten static pull-out repetitions and ±10% repeatability. [Atallah & Howe](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182)

## 6. Why the product target is 12 W, not 54 W

Sustained comfortable one-hand cranking measures **54 ± 14 W** in Jansen & Slob’s ICED 2003 study. [Jansen & Slob, *comfortable one-hand cranking*](https://www.designsociety.org/download-publication/23972/human_power_comfortable_one-_hand_cranking) The operator is therefore **not** the limit in this architecture. At 90 rpm, MG-1’s pull-out torque caps mechanical input near 23 W at the 2.4 N·m design point, which becomes roughly 12 W at USB after the specified chain losses.

The magnetic torque fuse that makes the device mechanically safe is the same mechanism that caps harvest. More power requires more **active volume**, not a better winding. The working design basis is 12–20 N·m/L for this topology; it is deliberately conservative compared with integrated pseudo-direct-drive machines, for which the Sheffield thesis reports 60–90 N·m/L versus 10–30 N·m/L for conventional machines. [Sheffield PDD thesis](https://etheses.whiterose.ac.uk/id/eprint/24379/1/PhD_Main_DOC_v64_Final_with_Appendix_corrected.pdf) [Magnomatics PDD technology](https://www.magnomatics.com/technology/pseudo-direct-drive)

| Active volume | LS torque basis, 12–20 N·m/L | Mechanical power at 90 rpm |
|---:|---:|---:|
| 0.15 L | 1.8–3.0 N·m | 17–28 W |
| 0.30 L | 3.6–6.0 N·m | 34–57 W |
| 0.50 L | 6.0–10.0 N·m | 57–94 W |
| 1.00 L | 12.0–20.0 N·m | 113–188 W |

This table is a scaling estimate, not a promise: air-gap, magnet grade, pole geometry, thermal capacity, and losses still require validation. [Atallah & Howe](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182) The business decision is explicit: accept a small, torque-safe 12 W class product, or enlarge the active magnetic volume to pursue a higher-power class.

## 7. Charge-time expectation at 12 W USB output

These are ideal port-energy times at 12 W; cable, device-side charge taper, temperature, and state of charge can only make actual elapsed time longer.

| Stored energy to replenish | Calculation | Cranking time at 12 W |
|---|---:|---:|
| Phone, 15.4 Wh | \(15.4/12\) | **1.28 h** |
| Tablet, 25 Wh | \(25/12\) | **2.08 h** |
| 20,000 mAh bank, 74 Wh | \(74/12\) | **6.15 h** |

The 12 W endpoint is an energy-harvesting service level, not a substitute for grid charging when fast replenishment is required. [Jansen & Slob](https://www.designsociety.org/download-publication/23972/human_power_comfortable_one-_hand_cranking)

## 8. The LiFePO4 buffer is mandatory

The buffer is not an upgrade. A phone first negotiates a USB-PD contract and then expects a stable rail; a hand crank varies in speed every half revolution, and a hand pause is a total dropout. **The user cranks into the pack; the pack—never the crank—talks to the phone.** USB Power Delivery is a negotiated power-delivery system, so the source must maintain the contracted supply behaviour rather than exposing the device to raw generator variability. [USB-IF USB Power Delivery overview](https://www.usb.org/usb-charger-pd)

Specify a **LiFePO4 4S, 12.8 V, 3 Ah, 38 Wh** buffer with BMS. The charger regulates into this pack; the BMS provides balance and protection; the PD source takes its input from the pack. This architecture accepts intermittent human power without renegotiating the attached device on every crank-speed perturbation. [USB-IF](https://www.usb.org/usb-charger-pd)

> ## Critical wiring error — a PD trigger/decoy is a sink, not a source
>
> A USB-PD “trigger” or “decoy” board requests 9 V or 12 V **from an upstream USB-PD charger**. It cannot supply a device. MG-C1 needs a genuine **PD SOURCE** controller—MPQ5031 / TPS25751 / STUSB4761 class—or an off-the-shelf power-bank board. Installing a trigger board in the output position yields **exactly 0 W** to the device. USB-PD roles are directional and negotiated. [USB-IF USB Power Delivery overview](https://www.usb.org/usb-charger-pd)

## 9. Rectification and charging tiers

### Tier A — Schottky bridge: default charger build

Use 6× MBR20100CT Schottky devices as the three-phase bridge. At a 30 V bus, two approximately 0.4 V forward drops cost only approximately 3%, which is appropriate for the first charger build. The Tier A charge-control implementation is a configurable buck-boost CC/CV module.

### Tier B — ideal bridge: conditional upgrade

Use 3× LT4320 ideal-diode bridge controllers plus 6 N-FETs only when the generator bus falls below approximately 10 V because of a much slower crank or a higher-\(k_V\) generator. The [LT4320 product page](https://www.analog.com/en/products/lt4320.html) lists a price from **$4.07/1ku**. Analog Devices’ own [DC2465A three-phase demonstration manual](https://www.analog.com/media/en/technical-documentation/user-guides/dc2465af.pdf) reports 84% for a diode bridge versus 97% ideal at 5 VAC line-neutral; that low-line advantage does not justify the extra Tier B complexity at the approximately 30 V MG-C1 design bus.

For a designed charge-controller board, use an LTC4020-class buck-boost controller; the [LTC4020 product page](https://www.analog.com/en/products/ltc4020.html) specifies a 4.5–55 V input range and lists a price from **$6.79/1ku**. It is not a prerequisite to start integration: build Tier A, measure Gate 3, then make the component-level upgrade only if the evidence supports it.

## 10. Protection and SAFE-01 integration

MG-C1 must implement the following protection hardware as part of the power chain:

| Function | Required implementation | Design intent |
|---|---|---|
| Pack fault isolation | **10 A fuse** at the positive terminal | Protect the pack-side conductor and downstream fault path |
| Surge clamp | TVS + MOV | Limit fast bus transients |
| Operational visibility | V/A bus meter | Observe generator/charger state during test and use |
| Pack thermal input | **10 kΩ NTC** bonded to the pack | Charge inhibit / fault evidence input |
| Overvoltage energy disposal | Dump chopper: N-FET + comparator tripping on \(V_{bus}\), into a **10 Ω 50 W** chassis-mount brake resistor | Absorb energy during slip, stall, or loss of normal charging load |
| Rotor containment | **3 mm polycarbonate** burst shroud | Retain a failed rotor/magnet event |
| Overspeed access control | Shroud interlock active above **500 rpm** | No operation above threshold with shroud open |

The capacitor bank is **not** an energy sink. On rotor slip or a sudden stall, the bus rises; the chopper and brake resistor are the components that must absorb the excess. The shroud must be polycarbonate, not acrylic, and must be interlocked before powered runs. This follows the mechanical-containment and independent safety-path intent of SAFE-01; the *MG-1 solution design* also requires shroud-on/interlock-live operation for Gate 3. [Atallah & Howe](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182)

Mechanical pull-out slip is the torque limit that no firmware fault can exceed. It complements, rather than replaces, SAFE-01. RSD remains an estimator, fault detector, and thermal virtual sensor **only**—never in the safety path. The hardware safety path retains authority independent of RSD or application firmware.

## 11. Instrumentation and the falsification obligation

MG-C1 is an energy-conversion test article, not an assertion engine. Instrument it as a three-port magnetic-gear system:

\[
\tau_{in}+\tau_{out}+\tau_{react}=0.
\]

Frame-ground the modulator reaction arm through a load cell at **\(r=88\ \text{mm}\)**. Measure input torque/speed, output torque/speed, reaction force/arm, electrical bus voltage/current, temperatures, and state transitions with time synchronization adequate to detect transient storage effects. A magnetic gear has a measurable reaction port; omitting it leaves an unobserved torque path. [Atallah & Howe](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182)

**Gate 3 — loaded efficiency map.** Run only with shroud on and interlock live. Sweep speed × torque, calculate \(\eta=P_{out}/P_{in}\), and retain raw time series, calibration records, uncertainty model, and test configuration. Exit criterion: **\(\eta\ge80\%\) at V1 in the 40–80% pull-out band.** This gate characterizes MG-1 transmission performance; it does not validate the full USB chain by inference.

**Gate 4 — contractual falsification.** Cross-calibrate all torque cells against the same reference, then **swap the torque cells between ports** and repeat the energy-balance test. The required result is **no excess energy**, within the documented measurement uncertainty. An apparent \(\eta>1\) is a failed measurement investigation, not a product result. This is the mandatory falsification procedure specified in the *MG-1 solution design*. [Atallah & Howe](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182)

## 12. Cost summary and purchasing constraints

| Tier | Scope | Hardware | Delivered |
|---|---|---:|---:|
| Tier 1 | CHARGER | **$847** | **$1,086** |
| Tier 2 | INSTRUMENTED | **$987** | **$1,265** |
| Tier 3 | FULL RESEARCH | **$1,584** | **$2,032** |

Delivered cost adds **8% freight, 8.25% Texas sales tax, and 12% contingency**. These are live cells in `MG-C1_bill_of_materials.xlsx`, which contains 95+ line items across sections A–G. Tier 3 is dominated by one line: a pair of rotary torque sensors at approximately **$260 each**. Begin with load cells; upgrade at Gate 3 only if the uncertainty band is too wide to close the energy balance.

Two BOM controls are non-negotiable:

1. **BOM C1:** the 22 pole-piece bolts must be plain low-carbon steel. A2/A4 stainless is austenitic and nearly non-magnetic; fitting it in the flux path means the gear makes no torque. The required magnet inventory is based on 20 HS plus 18 LS magnets, with spares; [Supermagnete’s Q-20-10-05-N listing](https://www.supermagnete.de/eng/block-magnets-neodymium/block-magnet-20mm-10mm-5mm_Q-20-10-05-N) gives **EUR 1.26 each from 40 pcs**.
2. **BOM G12:** buy **10 mL of EFH1-class ferrofluid**, approximately **$30**, for pole-polarity mapping QC only. It never enters the air gap. *MG-3 ferrofluid assessment* rejects gap flooding because it adds an uncontrolled dissipative path and compromises the measurement rig; Ferrotec’s EFH1 data are available in its [technical data sheet](https://www.flowvis.org/media/course/FerrofluidTechData.pdf).

## 13. Build and verification sequence

| Step | Build action | What to measure / release condition |
|---|---|---|
| 1. Receipt and polarity control | Verify magnet count, physical dimensions, and pole orientation before adhesive. Use the G12 ferrofluid film on a sacrificial transparency for an archivable full-face polarity map. | 20 HS and 18 LS features correctly alternating; no reversed block. [Supermagnete Q-20-10-05-N](https://www.supermagnete.de/eng/block-magnets-neodymium/block-magnet-20mm-10mm-5mm_Q-20-10-05-N) |
| 2. Mechanical stack | Assemble 3D-printed carriers, bearings, steel sleeves, plain-steel pole pieces, metal standoffs, and shims. Keep the air gap controlled by metal, not plastic. | Gap at four points per side; rotor runout; free rotation; fastener record. |
| 3. Gate 0 | Hand-turn the unpowered gear. | 4.5 input rotations to one output rotation, counter-rotating; stop and correct polarity if not. |
| 4. Gate 1 | Lock output; apply LS torque wrench; test 10 repetitions at 0.60/0.80/1.00/1.20 mm shim conditions. | Breakaway angle and pull-out torque; ±10% repeatability; select and record the specified safety parameter. |
| 5. Safe spin / Gate 2 | Fit shroud, arm interlock, use current-limited bench excitation, no battery. Run 100→500 rpm and 20 min thermal soak at each point. | Frame temperature; do not proceed if printed frame exceeds 50 °C. |
| 6. Power-chain bench test | Connect PMSG, rectifier, buck-boost, buffer, BMS, dump chopper, brake resistor, meter, and a genuine PD source. Use electronic loads before a phone. | Rectified bus, chopper trip/recovery, pack charge current, PD contract stability, no unsafe bus overshoot. [LTC4020](https://www.analog.com/en/products/ltc4020.html) |
| 7. Gate 3 | Run full loaded gear efficiency map with shroud on and interlock live. | \(\eta=P_{out}/P_{in}\), loss map, thermals, uncertainty; V1 \(\eta\ge80\%\) at 40–80% pull-out. |
| 8. Gate 4 | Cross-calibrate and swap torque cells, then repeat three-port balance. | No excess energy within uncertainty; signed raw-data package. |
| 9. Field-use validation | Charge only through the 4S buffer and PD source; include pauses and intentionally varying crank cadence. | Stable device PD operation across crank transients; no direct generator-to-device path. [USB-IF](https://www.usb.org/usb-charger-pd) |

## 14. Open risks, decisions, and design-kill criteria

| Risk / unknown | Mitigation or decision | What kills the MG-C1 design as specified |
|---|---|---|
| Pull-out below useful level or not repeatable | Gate 1 gap sweep; record geometry and thermal state; revise active volume rather than claiming higher torque. | Pull-out cannot support the 1.8–3.0 N·m band repeatably, or the safety parameter is not stable. |
| Gear efficiency misses Gate 3 target | Diagnose gap, bearings, drag, and modulator losses; V2/V3 are high-speed-loss options, not a substitute for measurement. | V1 fails \(\eta\ge80\%\) in the 40–80% pull-out band after credible build corrections. [COMPUMAG](https://www.compumag.org/Proceedings/2019_Paris/files/papers/PC-A3-16.pdf) |
| USB output is unstable | Keep generator isolated behind the 4S LiFePO4 buffer and genuine PD source; test pause/restart. | Stable USB-PD operation cannot be maintained with the buffer architecture. [USB-IF](https://www.usb.org/usb-charger-pd) |
| Bus overvoltage on slip/stall | Validate TVS/MOV, comparator threshold, N-FET, and 10 Ω 50 W brake resistor under controlled fault cases. | Chopper/brake path cannot hold \(V_{bus}\) within component limits, or the capacitor is used as the sole absorption method. |
| Rotor burst / access hazard | 3 mm polycarbonate shroud and functional interlock above 500 rpm before powered operation. | Interlock or containment cannot be demonstrated. |
| Energy-accounting ambiguity | Three-port reaction measurement, calibration traceability, and Gate 4 sensor swap. | The energy balance does not close within uncertainty or any test reports unverified excess energy. |
| Cost outruns evidence | Tier 1 first; use load cells; purchase rotary sensors only when Gate 3 uncertainty warrants it. | A costlier sensor package is proposed before the load-cell uncertainty budget justifies it. |
| Wrong materials / fluid contamination | Plain low-carbon pole pieces; no A2/A4 in flux path; G12 only for external polarity QC. | Non-magnetic pole pieces are installed, or ferrofluid enters the working air gap. [Ferrotec EFH1 data](https://www.flowvis.org/media/course/FerrofluidTechData.pdf) |

## 15. Decision statement

MG-C1 is viable only as an honestly specified, limited-power energy transformer: nominally **12 W USB-C** from approximately **22.6 W** of 90 rpm human mechanical input at the MG-1 design point. Its differentiator is not free energy; it is a compact, contactless torque/speed transformer with a mechanically enforced pull-out limit, a buffered PD output, and a test plan designed to prove that energy is conserved. The correct next investment is the Tier 1 build, Gate 1 characterization, and a shrouded, interlocked Gate 3 map—not claims beyond the measurements. [Atallah & Howe](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182) [Jansen & Slob](https://www.designsociety.org/download-publication/23972/human_power_comfortable_one-_hand_cranking)

# MG-3 — Ferrofluid in the MG-1 / MG-C1 System

**Engineering assessment, rev 0.1**
CBJG LLC · Benchtop Motor Program · companion to MG-1 (solution design), MG-2 (energy conversion) and MG-C1 (energy transformer / BOM)

---

## Verdict first

Ferrofluid has **one strong, one moderate and one weak** role in this machine, and one role that looks attractive and is not:

| Role | Verdict | Why, in one line |
|---|---|---|
| **Assembly QC / polarity mapping** | **DO IT — Tier 1** | ~$25 solves the single most likely build failure. No machine changes. |
| **Gap contamination / shaft seal** | **Worth designing in — Tier 2** | Mature product physics, non-contacting, near-zero added friction. |
| **Thermal path off the modulator pole pieces** | **Only if V1/V2 stay** | Directionally right, but V3 laminations delete the heat source instead of managing it. |
| **Flooding the working air gaps to raise torque** | **NO — reject for MG-1 as drawn** | Ceiling is ~4–8% flux, and one shim step already buys ~3.7% for free. |

The rest of this document is the arithmetic behind those four lines, and a protocol to measure rather than argue about it — because MG-1 is a three-port instrument, so this is exactly the kind of question it exists to answer.

Numbers below come from `/home/user/workspace/cad/ferrofluid_analysis.py`, run against the locked MG-1 geometry (magnet band R 25→45 mm, block 20 × 10 × 5 mm N42, 0.80 mm gap per side, two gaps).

---

## 1. Where ferrofluid could physically go

MG-1 is an axial flux-modulated gear: HS rotor → gap A → modulator ring → gap B → LS rotor, with 22 solid M8 pole pieces and a frame-grounded reaction arm. That gives six candidate injection points.

| # | Injection point | Mechanism invoked | Fluid volume |
|---|---|---|---|
| **P1** | Flood gap A and gap B | raise gap permeability → raise transmitted torque | 7.0 mL total (3.52 mL per gap) |
| **P2** | Thin film on the pole-piece faces only | localised flux focusing at the modulator teeth | <1 mL |
| **P3** | Wetted film around the 22 M8 bolts | conduct eddy-current heat out to the frame | ~2 mL |
| **P4** | Ferrofluidic seals on both d8 shafts | keep dust/swarf out; enable a flooded gap at all | ~0.2 mL/stage |
| **P5** | Sacrificial film on a transparency over an assembled rotor | **diagnostic** — visualise the pole pattern | ~0.5 mL |
| **P6** | Separate shear cell on the HS shaft | controllable brake / load partner | 20–100 mL |

P1 is what people mean when they say "put ferrofluid in it." It is the one that does not work here. P5 is the one that pays for itself immediately.

---

## 2. The saturation ceiling — why P1 disappoints

This is the whole argument, and it is a two-line calculation.

A representative commercial ferrofluid (Ferrotec EFH1) has a **saturation magnetisation of 440 G = 44 mT**, initial susceptibility 1.6, and a **relative permeability of 2.6 measured at 20 Oe**, with 7.9% magnetic solids by volume and 10 nm particles ([Ferrotec EFH1 data sheet](https://www.flowvis.org/media/course/FerrofluidTechData.pdf)).

That μr = 2.6 is the number everyone quotes. It is measured at **20 Oe ≈ 2 mT**. MG-1's working gap is three orders of magnitude above that:

| Leakage assumption          | B_gap   | H in gap             | Ms / B_gap = flux boost ceiling | Effective incremental μr |
| --------------------------- | ------- | -------------------- | ------------------------------- | ------------------------ |
| No leakage (upper bound)    | 1.113 T | 886 kA/m ≈ 11 100 Oe | **3.95%**                       | 1.040                    |
| Leakage-derated (realistic) | 0.779 T | 620 kA/m ≈ 7 790 Oe  | **5.65%**                       | 1.056                    |
| Pessimistic                 | 0.557 T | 443 kA/m ≈ 5 570 Oe  | **7.91%**                       | 1.079                    |

*(1-D magnetic circuit, N42 Br = 1.30 T, magnetisation length 5 mm axial, recoil μr = 1.05.)*

**The fluid is driven into deep saturation the instant you pour it in.** Once saturated it contributes a fixed +44 mT of magnetisation and nothing more — its *incremental* permeability collapses to ≈1.04–1.08, i.e. it is magnetically almost indistinguishable from air. The advertised μr of 2.6 is unreachable in any working PM gap.

The WPI thesis on exactly this topic reached the same place empirically: a fluid **rated μr = 5 at zero magnetisation was expected to fall to ≈2.0 in the motor field** ([Judge, *Air Gap Elimination in Permanent Magnet Machines*, WPI](https://digital.wpi.edu/downloads/9p2909417)). Our gap is stronger than that test motor's, so we land lower still.

### The comparison that ends the discussion

MG-1's Gate 1 shim sweep (0.60 / 0.80 / 1.00 / 1.20 mm) is **already in the BOM as line C10**, costing $12:

| Gap | B_gap | vs the 0.80 mm datum |
|---|---|---|
| 0.60 mm | 1.1545 T | **+3.73%** |
| 0.70 mm | 1.1334 T | +1.83% |
| **0.80 mm (as drawn)** | 1.1130 T | 0.00% |
| 1.00 mm | 1.0744 T | −3.47% |
| 1.20 mm | 1.0383 T | −6.71% |

Shimming one step tighter buys ~3.7% — **the same order as the entire ferrofluid ceiling** — using a part already purchased, with no seals, no fluid, no containment, no volatility, and no contamination of the instrumentation. If you want the flux, take the shim.

---

## 3. The viscous drag penalty — and the one place it is genuinely small

Laminar Couette shear in both annular gaps, EFH1 base viscosity 6 mPa·s, magnetoviscous factor (MVF) swept ×1 / ×2 / ×4 to bracket the field-induced viscosity rise:

| Operating case | MVF | τ drag, gap A | τ drag, gap B | Shear power | % of input |
|---|---|---|---|---|---|
| **Charger design point** (LS 90 / HS 405 rpm) | ×1 | 1.85 mN·m | 0.41 mN·m | 83 mW | **0.36%** of 22.6 W |
| | ×2 | 3.71 | 0.82 | 165 mW | 0.73% |
| | ×4 | 7.41 | 1.65 | 330 mW | 1.46% |
| Fast crank (LS 120 / HS 540 rpm) | ×2 | 4.94 | 1.10 | 293 mW | 0.97% of 30.2 W |
| **MG-1 rated** (LS 667 / HS 3000 rpm) | ×2 | 27.5 | 6.11 | 9.05 W | **5.44%** of 166 W |
| | ×4 | 54.9 | 12.2 | 18.1 W | **10.9%** |

Two conclusions:

- **In the MG-C1 charger duty cycle, drag is nearly free** — a few tenths of a percent. Same reason the eddy losses are benign at 74 Hz: everything speed-dependent is asleep down here.
- **At MG-1's rated 3000 rpm it is a disaster** — 5–11% burned in shear, against a 4–8% magnetic ceiling. The trade goes net-negative before you account for anything else.

The WPI measurements track this exactly: the ferrofluid-filled motor was **within measurement error of the dry baseline below 1000 rpm**, but by 12 000 rpm rotational losses had risen **0.64 W → 2.98 W** and system efficiency fell from **>30% to <20%**, because viscous losses exceeded the magnetic gain ([WPI](https://digital.wpi.edu/downloads/9p2909417)).

---

## 4. What the literature actually measured — the geometry split

The WPI work is the most directly relevant, and its most useful result is that **the sign of the effect depends on gap geometry**:

| Test article | Result with ferrofluid |
|---|---|
| Large-gap axial-flux generator | flux **+17%**, speed constant **+30%** average, no-load efficiency doubled |
| **Small-gap axial-flux generator** | flux **−1.3%**, speed constant **−5%**, leakage flux increased, rotor back iron saturated — **negative even with zero viscous losses** |
| Fully immersed proof-of-concept | +8.9% speed constant up to 590 rpm; fill-level sweep **abandoned because the ferrofluid was drawn to the rotor** |
| Off-the-shelf motor, Kv | 2125 → 1817 rpm/V, **−15%** |

All from [Judge, WPI](https://digital.wpi.edu/downloads/9p2909417).

**MG-1 is a small-gap machine** (0.80 mm against 5 mm of magnet). It sits on the wrong side of that split. And the abandoned fill-level experiment is a warning in its own right: in a strong gradient the fluid migrates to the poles and will not stay where you put it, so "the gap is filled" is not a state you can assume or hold.

The cooling literature is more encouraging but it is about a **different location** — end-windings, not the working gap. Sheffield measured **−5.4 °C** on a motorette at 10 A and **−16.2 °C to −36.4 °C** peak coil temperature versus air on a PMSM, with **26 °C of a 36.4 °C reduction attributable to magnetic body force** driving thermomagnetic convection, at a stated fluid operating window of **70–110 °C** ([Investigation of ferrofluid cooling for high power density PM machines, University of Sheffield](https://eprints.whiterose.ac.uk/id/eprint/193666/1/2022-11-2%20Ferrofluid%20cooling%20design-v12-final.pdf)). Note that paper also **explicitly did not model rotor rotation** and used carbon sleeves to keep the fluid out of the rotor space — i.e. even the cooling advocates keep it out of the moving gap.

---

## 5. Pros

| # | Benefit | Magnitude here | Confidence |
|---|---|---|---|
| 1 | **Polarity/pole-pattern verification (P5)** | Makes a reversed magnet visible in seconds | **High** — this is standard practice |
| 2 | **Non-contacting hermetic shaft seal (P4)** | 0.2 atm per stage, hermetic even at high dN, no wear surface ([Ferrotec seal technology](https://seals.ferrotec.com/technology/)) | **High** — mature commercial product |
| 3 | **Thermal path from pole pieces to frame (P3)** | 5–36 °C class reductions in the cited PM-machine work | Medium |
| 4 | **Torque gain from gap flooding (P1)** | +4 to +8% flux ceiling; +8.9% to +30% Kv measured in *large-gap* rigs | **Low for MG-1** |
| 5 | **Torsional ripple damping** | Viscous shear damps cogging chatter; also smooths the slip transition | Medium |
| 6 | **No dry contact anywhere** | Unlike a mechanical seal or a friction brake | High |
| 7 | **Debris capture** | Neodymium chips and swarf in a magnetic gap are a rotor-crash mechanism; magnetised fluid traps them | Medium |

Benefit 5 deserves a note: today, exceeding MG-1's pull-out means the gear slips and **freewheels**. Flood the gaps and slip instead drags through fluid — smoother, quieter, and it dissipates into fluid heating rather than pole chatter. Whether that is a pro or a con depends on whether you want the torque fuse to be crisp and repeatable. For a *specified safety parameter*, crisp wins.

---

## 6. Cons

| # | Problem | Severity for MG-1 |
|---|---|---|
| 1 | **Saturation kills the mechanism** — effective μr ≈ 1.04–1.08, not 2.6 | **Fatal to P1** |
| 2 | **Small-gap geometries measured *negative*** — flux −1.3%, Kv −5% | **Fatal to P1** |
| 3 | **Speed-dependent drag** — 5–11% of input at rated speed | High at rated; negligible in the charger |
| 4 | **Containment in a 3D-printed plastic housing** — PETG plates are layer-line porous and are the *wrong* pressure boundary | **High** |
| 5 | **Carrier volatility** — EFH1 loses 9%/h at 50 °C, flash point 92 °C | **High** — see below |
| 6 | **Fluid migrates to the poles** — the fill state is not stable or knowable | High |
| 7 | **Corrupts the three-port energy balance** — see §7 | **Highest** |
| 8 | **Long-term colloidal stability** — irreversible agglomeration and sedimentation in strong field gradients ([Approaches on Ferrofluid Synthesis and Applications, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8811916/)) | Medium |
| 9 | **Flammable oil next to a 50 W brake resistor** (BOM line E13) | Medium — a real bench-safety item |
| 10 | **Adds an uncontrolled variable to every gate** | High |

### On con 5, with numbers

The two gaps hold 7.04 mL = **8.5 g** of fluid. MG-1's frame temperature exit criterion is **<50 °C**, and the EFH1 sheet gives 9% volatility in 1 hour at exactly 50 °C:

| Hours at 50 °C | Fluid remaining |
|---|---|
| 1 h | 7.75 g (91%) |
| 5 h | 5.31 g (62%) |
| 20 h | 1.29 g (15%) |
| 100 h | ~0 g |

You would be topping up the gear every few hours of running, in an unsealed printed housing, and every top-up changes the state of the machine you are trying to characterise. Sealing it properly means P4 seals on both shafts plus a real fluid boundary — at which point the build is no longer a $817 charger.

---

## 7. The MG-1-specific objection: it attacks the instrument

This is the one that matters most, and it is easy to miss.

MG-1's whole reason to exist is that it measures **τ_in + τ_out + τ_react = 0** across three ports, with a frame-grounded modulator reaction arm at r = 88 mm. Gate 4 is a **contractual falsification test**: cross-calibrate the cells, swap them between ports, and demonstrate that there is no excess energy.

Ferrofluid in the gaps introduces a **second, non-magnetic torque path** between the members — a viscous shear coupling that transmits torque without going through the pole-piece modulation at all. That has three consequences:

1. **The reaction-arm reading stops being clean.** τ_react now contains a shear component that is a function of speed, temperature, fill level and fluid history. Fill level and history are exactly the quantities you cannot measure in a sealed printed housing.
2. **Pull-out stops being a hard mechanical constant.** Today, pull-out torque is a geometric property you can record as a specified safety parameter. Add viscous coupling and the effective limit becomes speed-dependent — and a safety parameter that varies with speed is not a safety parameter.
3. **It gives an over-unity artefact somewhere to hide.** A fluid that heats, migrates and changes viscosity under field is precisely the sort of unmeasured energy store that makes a sloppy energy balance look anomalous. The three-port method exists so that errors have nowhere to hide; flooding the gap builds them a hiding place.

**Doctrine, stated plainly:** ferrofluid is a passive, dissipative, saturable medium. It stores at most μ₀·Ms ≈ 44 mT worth of magnetisation, it consumes shear power whenever anything moves, and it cannot produce net energy. **P_out ≤ P_in, with or without fluid.** If ferrofluid ever appears to push measured efficiency above 1, the fluid is the prime suspect, not the discovery. Any ferrofluid test therefore runs **with a drained control** in the same session, on the same cells, in the same thermal state.

---

## 8. Where ferrofluid is unambiguously worth buying

### P5 — polarity mapping (do this on the next build day)

The documented #1 build failure for this machine is **one magnet installed backwards** out of 38. The current mitigation is a Magnaprobe plus a Hall module (BOM lines G3, G4) — both point checks, one pocket at a time.

A ferrofluid film gives you the **whole rotor face at once**:

1. Tape a 0.1 mm PET transparency over the assembled rotor face.
2. Wick ~0.5 mL of EFH1 across it; blot to a thin film.
3. Photograph normal to the face under raking light.
4. The film beads along field-normal lines: you should see **20 evenly spaced HS features in 4 groups of 5**, or **18 single features** on LS.

A reversed block breaks the pattern's alternation immediately and visibly — and the photograph is an *archivable artefact* attached to the build record, which a probe reading is not. This costs one $30 bottle and one transparency, sits on the sacrificial film (never in the gap), and never enters the machine.

**Add as BOM line G12: ferrofluid, 10 mL EFH1 class, ~$30, tier CHG, section G (tooling).**

### P4 — shaft seals, if the gap is ever flooded or the bench is dirty

Ferrofluidic seals are non-contacting, hermetic, wear-free, and hold ~0.2 atm per stage with capacity summing across stages ([Ferrotec](https://seals.ferrotec.com/technology/)). If a future MG-1 variant runs a flooded or inert-filled gap, this is the correct boundary — not an O-ring dragging on a d8 shaft and adding an unmeasured, temperature-dependent friction term to the energy balance.

### P3 — thermal, but only as a bridge

If V1 (solid M8 bolts) or V2 (M3 bundles) are retained at high speed, a wetted film around the pole pieces is a legitimate way to move eddy-current heat into the frame and keep the PETG modulator away from softening. But note the ordering: **V3 laminations remove the heat source**, and the whole point of the V1→V2→V3 sweep is to quantify that. Cool the symptom only if you have decided not to fix the cause.

---

## 9. The better fluid for one of these jobs: MR, not ferro

For **P6 — a controllable load partner or an adjustable torque limiter** — ferrofluid is the wrong smart fluid. Magnetorheological fluid is the right one. MR fluids reach roughly **100 kPa yield stress** in the on state, orders of magnitude above anything a ferrofluid does, with field-induced particle chaining raising apparent viscosity by up to ~10³× ([MR fluids: a comprehensive review](https://mfr.edp-open.org/articles/mfreview/full_html/2024/01/mfreview230033/mfreview230033.html), [Approaches on Ferrofluid Synthesis and Applications](https://pmc.ncbi.nlm.nih.gov/articles/PMC8811916/)).

A shear-mode disc brake on the HS shaft, 20–45 mm radius, at a mid-range 50 kPa:

| Disc pairs | Achievable brake torque |
|---|---|
| 1 | 8.7 N·m |
| 5 | 43.5 N·m |
| 11 | 95.8 N·m |

MG-1's HS port only needs **0.40–0.67 N·m** to reach pull-out. A single small disc pair overshoots that by more than 10×, meaning an MR brake can be run far off its saturation point with fine, repeatable, electrically-commanded control — a genuinely better Gate 1/Gate 3 load than a second hub motor in regen, whose braking torque is tangled up with its own copper losses.

Two caveats, stated up front: an MR brake is an **active** device, so under SAFE-01 doctrine it belongs on the load side and **never** in the safety chain — the mechanical pull-out slip remains the torque limit no firmware fault can exceed. And MR fluids settle harder than ferrofluids, because the particles are micron-scale rather than 10 nm; expect to re-shear before every session.

---

## 10. Recommendation

1. **Buy one bottle of ferrofluid now** ($30) and use it for **P5 polarity mapping** on every rotor before bonding. Add it to BOM section G. This is the only change with an unambiguous positive return.
2. **Do not flood the gaps on MG-1 as drawn.** The saturation ceiling (4–8%) does not beat the shim step (3.7%) you have already paid for, and the containment, volatility and instrument-integrity costs are real.
3. **If you want to test it anyway — and you have the only rig on the bench that can settle it honestly — run it as Gate 1F**, folded into the existing gap sweep rather than as a separate programme:

   | Gate 1F protocol |
   |---|
   | Sweep gap 0.60 / 0.80 / 1.00 / 1.20 mm **dry** first — this is Gate 1 as already specified |
   | Repeat the sweep **flooded**, same cells, same calibration, same session |
   | Measure static pull-out (10 repeats each) and no-load drag torque at 60 / 90 / 120 rpm |
   | Log T_mod throughout — fluid heating is the tell |
   | **Drained control run at the end**, to prove the cells did not shift |
   | Pass/fail: flooded pull-out must beat dry by **>8%** to justify any of the containment cost. Predicted result: it will not. |

   Publishing a clean negative result here is worth more than a marginal positive. The reel's comment section is full of people convinced that adding ferrofluid to a magnetic gear is free torque; a three-port measurement with a drained control is how you answer them with a number.
4. **Consider MR fluid for the load partner** at Gate 3, on the load side only, never in the safety path.

---

## Sources

- Judge, A., *Air Gap Elimination in Permanent Magnet Machines*, Worcester Polytechnic Institute — https://digital.wpi.edu/downloads/9p2909417
- Ferrotec EFH1 ferrofluid technical data sheet — https://www.flowvis.org/media/course/FerrofluidTechData.pdf
- *Investigation of ferrofluid cooling for high power density permanent magnet machines*, University of Sheffield / White Rose — https://eprints.whiterose.ac.uk/id/eprint/193666/1/2022-11-2%20Ferrofluid%20cooling%20design-v12-final.pdf
- Ferrotec, *Ferrofluidic Seal Technology* — https://seals.ferrotec.com/technology/
- *Magnetorheological fluids: A comprehensive review* — https://mfr.edp-open.org/articles/mfreview/full_html/2024/01/mfreview230033/mfreview230033.html
- *Approaches on Ferrofluid Synthesis and Applications*, PMC — https://pmc.ncbi.nlm.nih.gov/articles/PMC8811916/
- Nethe et al., *Improving the efficiency of electric motors using ferrofluids* — https://www.nethe.de/dr-nethe/publikationen/abstracts/GFFWS_2000_abstract.pdf
- Kim & Choi, *Improvement in Torque Density by Ferrofluid Injection into Magnet Tolerance of IPMSM*, Energies 14(6) 1736 — https://ideas.repec.org/a/gam/jeners/v14y2021i6p1736-d521261.html
- PETG vs mineral oil compatibility (excellent at 20 °C and 50 °C) — https://chemicalresistance.org/chemicals/mineral-oil/petg/

Calculations: `/home/user/workspace/cad/ferrofluid_analysis.py`

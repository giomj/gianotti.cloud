# MG-2 — Magnetically Geared Machines for Energy Conversion
### Solution Design v0.1, Part 2 · CBJG LLC · Applications & Generator Integration

Companion to `MG-1_solution_design.md`. Part 1 specified the bench gear stage. Part 2 covers where the technology actually earns money and how it integrates with electric machines.

---

## 0. Framing correction, stated once

A magnetic gear does not produce energy. It is a transmission. Where it creates real value in energy systems is **conversion quality**: getting low-speed, high-torque mechanical input (wind, wave, hydro, tidal, regenerative braking) into a small, fast, cheap electrical machine without a mechanical gearbox in the path.

That is not a small prize. It is most of the cost, mass, and failure rate of a renewable drivetrain. Everything below is framed as **energy conversion and harvest**, not generation ex nihilo. Part 1 §5 and Gate 4 remain binding.

---

## 1. The integration that matters: the Pseudo Direct Drive

The important move is not bolting a magnetic gear to a generator. It is **magnetically and mechanically merging them into one machine**. Wrap a wound stator around the magnetic gear's outer magnet array, and the gear's high-speed rotor becomes the generator's rotor. This is the **Pseudo Direct Drive (PDD)**, or Integrated PDD-PMSG in generator form ([Magnomatics](https://www.magnomatics.com/technology/pseudo-direct-drive), [Nature/Sci. Rep. 2 MW IPDD-PMSG optimization](https://pmc.ncbi.nlm.nih.gov/articles/PMC13022035/)).

```
        ┌──────────────── wound stator (3-phase) ───────────────┐
        │  outer PM array bonded to stator bore  (p_out)        │
        │  ─────────── air gap ───────────                      │
        │  ferromagnetic modulator ring  (n_s)  ── LOW-SPEED ───┼──> rotor/turbine
        │  ─────────── air gap ───────────                      │
        │  inner PM rotor  (p_in)  ── HIGH-SPEED, free-floating │
        └───────────────────────────────────────────────────────┘
```

Torque from the electrically-active high-speed rotor is geared up through the modulator's steel pole pieces and delivered on the slow shaft ([The Engineer on Magnomatics PDD](https://www.theengineer.co.uk/content/news/magnomatics-wins-100-000-smart-award-to-advance-pseudo-direct-drive-technology)). One housing. Three concentric parts. No mechanical gear teeth anywhere.

### The numbers that justify it

| Metric | Conventional PM machine | PDD | Source |
|---|---|---|---|
| Torque density, natural air cooling | 10–30 N·m/L | **60–90 N·m/L** | [Sheffield PDD thesis](https://etheses.whiterose.ac.uk/id/eprint/24379/1/PhD_Main_DOC_v64_Final_with_Appendix_corrected.pdf) |
| Large-machine torque density | — | **110 kN·m/m³** | [MDPI, PDD control study](https://www.mdpi.com/2075-1702/2/3/158) |
| Vehicle hub demonstrator | 19 kN/m³ | **80 kN/m³** | [Eureka Magazine](https://www.eurekamagazine.co.uk/content/technology/magnet-gear-trains-push-the-frontiers/) |
| Continuous torque density | baseline | up to **8× equivalently cooled PM** | [DPA on the Net](https://www.dpaonthenet.net/article/106767/PDD-technology-is-prepared-for-wind-turbine-trials.aspx) |
| Size & mass | baseline | **<60%** of a PM machine | [Magnomatics](https://www.magnomatics.com/technology/pseudo-direct-drive) |
| Torque ripple | — | **<0.3%** | [The Engineer](https://www.theengineer.co.uk/content/news/magnomatics-wins-100-000-smart-award-to-advance-pseudo-direct-drive-technology) |
| Power factor | — | **>0.9** | [MDPI](https://www.mdpi.com/2075-1702/2/3/158) |

This is validated hardware, not simulation. Demonstrated units include a **500 kW PDD wind generator tested at ORE Catapult's Blyth facility, credited with a 3% LCOE reduction** ([ORE Catapult](https://ore.catapult.org.uk/resource-hub/case-studies/magnomatics-2), [OWGP](https://owgp.org.uk/case-studies/magnomatics/)), a **city-bus wheel motor at 4,000 N·m continuous to 750 rpm** ([Designfax](http://www.designfax.net/cms/dfx/opens/article-view-dfx.php?nid=4&bid=151&et=featurearticle&pn=01)), a **65 kW / 2,000 N·m truck hub at 300 rpm** ([Eureka](https://www.eurekamagazine.co.uk/content/technology/magnet-gear-trains-push-the-frontiers/)), and an **86 kW air-cooled eVTOL motor at 30 N·m/kg** ([Urban Air Mobility News](https://www.urbanairmobilitynews.com/air-taxis/magnomatics-has-designed-a-lightweight-air-cooled-propulsion-motor/)).

---

## 2. Why wind wants this specifically

The wind industry's structural problem is the gearbox. In a studied fleet, **gearbox failure rate reached roughly 60% requiring replacement after five years** ([IEA Wind Task 33 gearbox reliability](https://iea-wind.org/wp-content/uploads/2023/10/57_Gearboxes.pdf)). Offshore, each replacement is a vessel mobilisation. That is why the industry drifted toward direct drive and 1–2 stage gearboxes ([Strathclyde O&M cost analysis](https://strathprints.strath.ac.uk/56943/1/Carroll_etal_2016_availability_operation_and_maintenance_costs_of_offshore_wind_turbines.pdf)) — but pure direct-drive PM generators are enormous and magnet-hungry.

The PDD threads the needle. A single magnetic gear stage raises generator input speed and cuts input torque, so the electrical machine shrinks, while eliminating the lubricated, filtered, wearing gearbox ([DPA on the Net](https://www.dpaonthenet.net/article/106767/PDD-technology-is-prepared-for-wind-turbine-trials.aspx), [Strathclyde MG technology review](https://strathprints.strath.ac.uk/63638/1/McGilton_etal_IET_RPG_2018_Review_of_magnetic_gear_technologies_and_their_applications.pdf)).

Three secondary benefits are underrated:

1. **Inherent compliance.** The magnetic coupling is a soft spring. It attenuates drivetrain torsional oscillation and cuts acoustic noise ([DPA on the Net](https://www.dpaonthenet.net/article/106767/PDD-technology-is-prepared-for-wind-turbine-trials.aspx)).
2. **Torque fuse.** Only pull-out torque can ever be transmitted. During a grid fault or low-voltage ride-through event, the gear slips instead of shock-loading the turbine ([InnWind PDD presentation](https://www.innwind.eu/-/media/sites/innwind/publications/external-publications/2016/intermagmmm-2016-presentation.pdf)).
3. **Hermetic sealing.** No lubricant path means parts of the drivetrain can be fully sealed ([Strathclyde review](https://strathprints.strath.ac.uk/63638/1/McGilton_etal_IET_RPG_2018_Review_of_magnetic_gear_technologies_and_their_applications.pdf)) — decisive for subsea and marine.

Magnomatics states the architecture scales to 10 MW and beyond ([DPA on the Net](https://www.dpaonthenet.net/article/106767/PDD-technology-is-prepared-for-wind-turbine-trials.aspx)).

---

## 3. Wave and tidal: the strongest technical case

Wave motion is slow, reciprocating, and irregular — the worst possible input for a rotary generator, which is why direct-drive linear machines dominate the research ([MDPI, PM generator architectures for WEC](https://www.mdpi.com/1996-1073/19/1/134)). Here magnetic gearing has a **linear** form: a linear magnetic gear integrated with a linear PM generator, letting slow wave motion drive a machine designed for higher speed ([HKU, MPPT of a linear magnetic-geared PM generator](https://hub.hku.hk/bitstream/10722/225407/1/Content.pdf), [MDPI LMGIPMG study](https://www.mdpi.com/1996-1073/9/7/487)).

The genuinely clever result: **adjustable-gear-ratio linear magnetic gears let the converter be re-tuned into resonance with the prevailing sea state**, maximising capture across conditions rather than at one design wave ([ScienceDirect, adjustable-ratio linear magnetic gear](https://www.sciencedirect.com/science/article/abs/pii/S0960148116310746)). An electrically-commanded, mechanically-contactless variable ratio is not really achievable with gear teeth.

Closely related and worth tracking: **Vernier PM machines**, which use the same flux-modulation harmonics between rotor and stator to get high low-speed torque density, are considered especially promising for direct-drive WEC ([MDPI overview](https://www.mdpi.com/1996-1073/19/1/134)).

---

## 4. Application matrix

| Application | Why MG/PDD wins | Maturity | CBJG reachability |
|---|---|---|---|
| Utility & offshore wind | Removes the #1 failure mode; 3% LCOE | Demonstrated at 500 kW | Study only |
| Small / distributed wind (1–20 kW) | Direct-drive without a huge PM rotor; no oil changes on a mast | Research + maker | **Buildable** |
| Micro-hydro (Archimedes screw, undershot) | Very low RPM, high torque, wet environment, hermetic sealing | Research | **Buildable — best first target** |
| Wave / tidal | Linear MG + resonance tuning; sealed subsea | Active research | Study, then linear rig |
| Regenerative braking / e-mobility | High torque at wheel, torque fuse protects rider & pack | Demonstrated (bus, truck hub) | **Buildable — Grid & Chain tie-in** |
| Aerospace / eVTOL actuation | 30 N·m/kg, air-cooled, torque fuse for jam tolerance | Demonstrated | Not now |
| Marine propulsion | Sealed shaft, no lubricant, low noise | Demonstrated | Not now |
| Flywheel & pumped storage interface | Contactless vacuum-barrier torque transfer | Research | Interesting |

**A note on the sealed-barrier case**, since it is the most under-exploited: because the gear transmits torque across an air gap, you can put a **non-magnetic pressure wall or vacuum barrier** in that gap. Torque crosses; fluid and gas do not. That eliminates the rotating shaft seal — the usual failure point in subsea, flooded, cryogenic, and vacuum-flywheel systems. No mechanical gearbox can do that.

---

## 5. CBJG integration path

MG-1 is the enabling instrument. The path from there:

### MG-2 — Add the stator (turn the gear into a machine)

Take the MG-1 geometry, bond the low-speed magnet array into a stator bore, and wind three phases around it. Reuse the existing STM32G474 + DRV8353RS + INA240A2 stack unchanged — the PDD is electrically just a PMSM with an unusual pole count and a mechanical gear ratio hidden inside.

Control consequence: **the electrical machine sees \(p_{in}\), the shaft sees \(p_{out}\)**. Field-oriented control commutates against the high-speed inner rotor while the load couples to the slow port. This means the encoder must track the correct rotor, and RSD's estimator must carry the ratio explicitly. Control of PDD machines is a studied problem with known load-parameter sensitivities ([Sheffield PDD control thesis](https://etheses.whiterose.ac.uk/id/eprint/4886/7/MB_Thesis.pdf), [MDPI, control structures and load parameters](https://www.mdpi.com/2075-1702/2/3/158)) — read before writing firmware.

### MG-3 — Generation mode

Same hardware, run backwards. Drive the slow port with the hoverboard motor as a prime mover, rectify the stator output into a DC bus, measure conversion efficiency across the speed/torque map. This is where the three-port instrumentation from Part 1 pays off: you can separate **gear loss** from **electrical loss** rather than reporting one lumped efficiency number.

### MG-4 — Micro-hydro or small-wind demonstrator

Recommended first real application, because low RPM at meaningful torque is exactly the PDD sweet spot and a water or wind source is a genuinely uncontrolled input — the honest test of the torque fuse.

### Grid & Chain crossover

The e-bike delivery venture is the nearest commercial fit. A PDD hub drive gives high wheel torque without a mechanical reduction, and the **pull-out slip is a rider-safety property**: a controller fault or seized wheel cannot deliver more than pull-out torque into the drivetrain. Regenerative braking runs through the same gear with no additional hardware. This is a defensible engineering claim for the venture — unlike anything in the free-energy framing — and it is measurable on the MG-3 rig.

---

## 6. Honest constraints

| Constraint | Detail |
|---|---|
| **Rare-earth cost & exposure** | PDD torque density depends on NdFeB. Rare-earth-free magnetically geared generators are an active research line precisely because of this ([MDPI, rare-earth-free MG generator](https://www.mdpi.com/1996-1073/12/3/447)) |
| **Two rotating parts** | Reviewers consider the PDD's dual-rotor structure complex and less robust for offshore duty than a single-rotor machine ([MDPI](https://www.mdpi.com/1996-1073/12/3/447)) — bearing count and alignment are the real cost |
| **Eddy loss in modulators** | Unsolved at maker scale; laminated poles are the fix and they are not printable (Part 1 §6) |
| **Air-gap sensitivity** | Torque falls steeply with gap; sets machining tolerance, not printing tolerance, at real power levels |
| **Pull-out is a ceiling, not a suggestion** | Sizing must include worst-case gust or wave loading, or the gear slips in normal operation |
| **Competitive baseline is moving** | NREL's offshore generator comparison finds low-temperature superconducting direct drive reducing LCOE 2–3% versus interior PM, especially at high ratings ([NREL](https://docs.nrel.gov/docs/fy23osti/85341.pdf)). PDD competes against that, not against a 2005 gearbox |
| **Energy balance** | \(P_{elec,out} \le P_{mech,in}\), always. MG-3's value is measuring the loss split precisely, not shrinking it below zero |

---

## 7. Recommended next actions

1. **Finish MG-1 Gates 0–2 before designing MG-2.** Do not skip to the machine; the gear must be characterised first.
2. **Read the two PDD control theses** before any MG-2 firmware, specifically for encoder-reference and load-sensitivity behaviour ([Sheffield 2013](https://etheses.whiterose.ac.uk/id/eprint/4886/7/MB_Thesis.pdf), [Sheffield safety-critical PDD](https://etheses.whiterose.ac.uk/id/eprint/24379/1/PhD_Main_DOC_v64_Final_with_Appendix_corrected.pdf)).
3. **Open a GitHub issue for MG-2 stator integration** in `giomj/dev`, cross-referencing the SAFE-01 interlock chain, and record the pull-out torque figure as a specified safety parameter once Gate 1 produces it.
4. **Pick the demonstrator now** — micro-hydro or small wind — so MG-2's ratio and pull-out are sized to a real load rather than chosen for convenience.
5. **Write the torque-fuse claim into the Grid & Chain technical narrative.** It is a real, citable safety differentiator and it costs nothing to state accurately.

---

### Sources

- [Pseudo Direct Drive — Magnomatics](https://www.magnomatics.com/technology/pseudo-direct-drive)
- [PDD technology prepared for wind turbine trials — DPA on the Net](https://www.dpaonthenet.net/article/106767/PDD-technology-is-prepared-for-wind-turbine-trials.aspx)
- [Magnomatics CHEG 500 kW PDD generator — ORE Catapult](https://ore.catapult.org.uk/resource-hub/case-studies/magnomatics-2)
- [Magnomatics case study — Offshore Wind Growth Partnership](https://owgp.org.uk/case-studies/magnomatics/)
- [Performance-driven multi-objective optimization of 2 MW IPDD-PMSG](https://pmc.ncbi.nlm.nih.gov/articles/PMC13022035/)
- [Control of Pseudo Direct Drive PM machines (thesis), Sheffield](https://etheses.whiterose.ac.uk/id/eprint/4886/7/MB_Thesis.pdf)
- [Pseudo Direct Drives for Safety Critical Applications (thesis), Sheffield](https://etheses.whiterose.ac.uk/id/eprint/24379/1/PhD_Main_DOC_v64_Final_with_Appendix_corrected.pdf)
- [Influence of Control Structures and Load Parameters on PDD Performance — MDPI Machines](https://www.mdpi.com/2075-1702/2/3/158)
- [Review of magnetic gear technologies and their applications — IET RPG / Strathclyde](https://strathprints.strath.ac.uk/63638/1/McGilton_etal_IET_RPG_2018_Review_of_magnetic_gear_technologies_and_their_applications.pdf)
- [IEA Wind gearbox reliability report](https://iea-wind.org/wp-content/uploads/2023/10/57_Gearboxes.pdf)
- [Availability, O&M costs of offshore wind turbines — Strathclyde](https://strathprints.strath.ac.uk/56943/1/Carroll_etal_2016_availability_operation_and_maintenance_costs_of_offshore_wind_turbines.pdf)
- [MPPT control of a linear magnetic-geared PM generator — HKU](https://hub.hku.hk/bitstream/10722/225407/1/Content.pdf)
- [Linear magnetic-geared interior PM generator for wave energy — MDPI Energies](https://www.mdpi.com/1996-1073/9/7/487)
- [Adjustable-ratio linear magnetic gear for wave energy extraction — Renewable Energy](https://www.sciencedirect.com/science/article/abs/pii/S0960148116310746)
- [Overview of PM generator architectures for wave energy — MDPI Energies](https://www.mdpi.com/1996-1073/19/1/134)
- [Rare-earth-free magnetically geared generator — MDPI Energies](https://www.mdpi.com/1996-1073/12/3/447)
- [A Comparison of Generator Technologies for Offshore Wind Turbines — NREL](https://docs.nrel.gov/docs/fy23osti/85341.pdf)
- [InnWind PDD presentation](https://www.innwind.eu/-/media/sites/innwind/publications/external-publications/2016/intermagmmm-2016-presentation.pdf)
- [Magnet gear trains push the frontiers — Eureka Magazine](https://www.eurekamagazine.co.uk/content/technology/magnet-gear-trains-push-the-frontiers/)
- [Magnomatics 86 kW air-cooled eVTOL PDD motor — Urban Air Mobility News](https://www.urbanairmobilitynews.com/air-taxis/magnomatics-has-designed-a-lightweight-air-cooled-propulsion-motor/)
- [Magnomatics wins Smart Award for PDD — The Engineer](https://www.theengineer.co.uk/content/news/magnomatics-wins-100-000-smart-award-to-advance-pseudo-direct-drive-technology)
- [Pseudo Direct Drive bus wheel demonstrator — Designfax](http://www.designfax.net/cms/dfx/opens/article-view-dfx.php?nid=4&bid=151&et=featurearticle&pn=01)

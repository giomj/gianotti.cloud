# MG-1 — Grand Council Peer Review

**Program:** CBJG LLC · Benchtop Motor Program
**Artifact under review:** MG-1 Flux-Modulated Axial Magnetic Gear (v0.1), MG-2 applications study, MG-3 ferrofluid assessment, MG-C1 energy-transformer BOM and drawing set (15 sheets)
**Reviewers seated:** Physicist · Engineer · Mathematician · Historian/Philosopher · Skeptic · Scribe (Notion) · Architect (GitHub) · Emperor (ratifying) — the six-seat artifact-review core [Grand Council seat map](https://app.notion.com/p/3a1b1ccc4c018139ae13e79d2d08eddb)
**Convener:** James Gianotti · **Rapporteur:** Computer (13th chair)
**Referenced live prototype URL:** [Replit dev host `fea78a17...janeway.replit.dev`](https://fea78a17-dbcc-4839-bfc5-43ae579af334-00-3vrvbyj5pf7oa.janeway.replit.dev/?nativeBrowserPresentationStyle=fullScreen) — private tunnel, not accessible for external review this session.

---

## 0. Verdict, stated up front

**MG-1 passes review as a bench instrument.** It is a well-scoped, honestly bounded, three-port-instrumented magnetic gear characterization rig with a mandatory falsification gate. The topology (Atallah–Howe axial flux-modulated gear, \(n_s = p_{in} + p_{out}\), \(G_r = -p_{out}/p_{in} = -4.5\)) is textbook and correctly stated ([Atallah, Calverley & Howe, IEE Proc.](https://www.phy.cuhk.edu.hk/itp/v3/links/mmm/pdfs/08R303_1.pdf)).

**MG-C1 passes as a demonstrator** conditional on Gate 1 delivering repeatable pull-out and Gate 4 closing the energy balance within uncertainty.

**MG-2 (PDD applications) is a directionally correct study**, not yet a design. Do not spend on it before MG-1 Gates 1–3 close.

**MG-3 (ferrofluid) verdict is correctly retained** — polarity mapping only, no gap flooding. The ceiling arithmetic is right and the objection about the *instrument*, not just the *machine*, is the sharpest point in the document.

Ratification is **conditional** on the remedial actions in §7 being landed as GitHub issues before Gate 1.

---

## 1. What the artifact actually is

Stripped of the maker framing, MG-1 is:

- an **axial-flux, radial-modulator Atallah–Howe coaxial magnetic gear** (2/9/11 pole geometry, 4.5:1 counter-rotating);
- built into a **three-port instrument** that measures \(\tau_{in}\), \(\tau_{out}\), and \(\tau_{react}\) simultaneously, so the energy balance \(\tau_{in}+\tau_{out}+\tau_{react} = 0\) has no unmeasured path;
- with a **hardware-latched safe-torque-off chain (SAFE-01)** independent of firmware (per `giomj/dev` issue #14 [CBJG SAFE-01 charter](https://github.com/giomj/dev/issues/14));
- with **RSD** ([Recursive State Dynamics](https://github.com/giomj/dev)) as estimator, slip observer, and thermal virtual sensor — never in the safety path;
- with a **contractual Gate 4 falsification test** that cross-calibrates torque cells and swaps them between ports, refusing any \(\eta > 1\) reading as instrumentation error.

MG-C1 wraps this in a hand-crank USB-PD charger: **~12 W at USB-C from ~22.6 W of 90 rpm human input** at the MG-1 design point.

This framing is **exactly right** for CBJG's stated doctrine (validation before speculation; RSD is not new physics; free-energy claims require independent calorimetry) and for the Grand Council's ethics-review posture on speculative-energy work ([CBJG venture verification gates](https://github.com/giomj/dev/issues/15)).

---

## 2. Seat-by-seat critique — ruthless

### 2.1 Physicist — Dr. Faraday

**What is defensible.**
- The governing relations are stated correctly. The pole-pair space-harmonic identity \(p_{m,k} = |mp + k n_s|\) with rotational velocity \(\omega_{m,k} = \frac{mp}{mp+kn_s}\omega_r + \frac{kn_s}{mp+kn_s}\omega_s\) is the standard result ([axial-field magnetic gear analysis](https://www.phy.cuhk.edu.hk/itp/v3/links/mmm/pdfs/08R303_1.pdf)), and the gear-ratio corollary follows.
- Torque density prediction (12–20 N·m/L for a printed build) is a **conservative pick** against literature. Halbach CMGs reach 350 N·m at 2.16× conventional torque under HTS bulks; Politecnico di Torino thesis reports 94.6 kN·m/m³ with support yokes ([Politecnico di Torino thesis](https://webthesis.biblio.polito.it/17238/1/tesi.pdf)); Halbach axial designs improve torque density ~14.3% over standard ([UniWA Halbach 2D analytical model](https://elke.uniwa.gr/wp-content/uploads/sites/325/2024/05/%CE%94%CE%97%CE%9C%CE%9F%CE%A3%CE%99%CE%95%CE%A5%CE%A3%CE%97_%CE%A4%CE%A3%CE%9F%CE%9B%CE%91%CE%9A%CE%97%CE%A3_27-04-2024.pdf)). The 12–20 N·m/L number is safely below floor.
- The three-port sign convention and the "sum to zero at static equilibrium" identity are correct and provide the necessary redundancy to catch instrumentation drift ([torque analysis in CMG considering nonlinear materials](https://bpb-us-w2.wpmucdn.com/u.osu.edu/dist/6/105859/files/2021/06/112_torque_analysis_in_coaxial_magnetic_gears_considering.pdf)).

**Where the physics is shaky or unstated.**

1. **The stated modulator frequency of \(\sim 550\) Hz at 3000 rpm is wrong by a factor of the harmonic mode used.** The MG-2/MG-C1 documents give \(f = n_s \omega_{in}/(2\pi) \cdot p_{in}/n_s = p_{in}\cdot n\), which at 3000 rpm (50 rev/s) with \(p_{in} = 2\) yields **100 Hz seen by the modulator on the HS side**, not 550. If instead one computes the fundamental pole-passing frequency at the modulator ring viewed from the HS rotor frame, one gets \(f_{mod} = p_{out}\cdot n_{HS}/60 \cdot p_{out}/(p_{in}+p_{out})\)-style hybrids depending on which quantity is being reported. **Fix the derivation in one place and cite it once**, because the eddy-loss argument (\(\propto d^2 f^2\)) inherits whatever f is used. The V1→V2→V3 ordering is still correct; the *magnitude* of the loss reduction is not.
2. **Axial thrust is called out but never sized.** For 20 N42 blocks (20×10×5, Br ≈ 1.30 T) at 0.8 mm to a ferromagnetic modulator, the static axial pull is on the order of \(F \sim B^2 A / (2\mu_0)\) per pole × 20 poles. Back-of-envelope: \(B_{gap}\sim 1.1\) T, active area per block \(2\times 10^{-4}\ \text{m}^2\), \(F_{block}\approx (1.1^2)(2\times10^{-4})/(2\cdot4\pi\times10^{-7}) \approx 96\ \text{N}\). Twenty blocks per side = **~2 kN axial pre-load, static, per rotor**. This dwarfs 608ZZ bearing thrust capability (dynamic C₀ ≈ 1.4 kN, static ≈ 4.6 kN). **Bearings need to be sized, or a thrust washer / angular-contact pair added, or the pre-load balanced across both sides.** This is a first-order design defect.
3. **No leakage/end-effect derating disclosed.** 2D FEA vs 3D shows meaningful end-effect torque reduction ratios for short axial-length axial-flux geometries ([Torque analysis in CMG considering nonlinear materials — Jiles-Atherton FE model](https://bpb-us-w2.wpmucdn.com/u.osu.edu/dist/6/105859/files/2021/06/112_torque_analysis_in_coaxial_magnetic_gears_considering.pdf)). The 12–20 N·m/L conservative band probably absorbs it — but state it.
4. **Torque ripple is unmentioned.** Space harmonics beyond the fundamental modulation harmonic produce ripple. For 2/9/11, the working harmonic is P_{1,-1} = ±(2·1 − 11) = ±9 (matching \(p_{out}\)), and the parasitic content includes m=3, k=−1 (=|6−11|=5) and higher orders that don't contribute to average torque but cause ripple ([Sagepub, harmonic-content DFCG analysis](https://journals.sagepub.com/doi/full/10.3233/JAE-210128)). This matters for the RSD slip observer and for any downstream generator (MG-2). Add a ripple-spectrum simulation to Gate 0/Gate 1.

**Verdict: pass with corrections.** The physics is right where it commits; where it doesn't commit, it should.

### 2.2 Engineer — Dr. Kettering

**Structural / mechanical.**
- **Air-gap-critical stack is metal, printed only for non-critical carriers — this is correct doctrine and non-negotiable.** ✅
- **Keyed magnet pockets + witness dot for N pole = correct.** Polarity-error prevention is the highest-leverage build discipline. ✅
- **Threaded-rod walk-in jig for assembly = correct.** Unrestrained axial attraction is a documented finger amputation mechanism. ✅
- **Reaction arm as measurement datum (solid infill, 6 perimeters, or aluminium bar) = correct, and MG-3 §7 rightly notes that deflection is measurement error.** ✅

**Where I disagree.**

1. **PETG modulator plate carries M8 bolts torqued into printed threads.** Even with 6 perimeter walls and 100% infill under the pole pieces, PETG creep at 40–50 °C plus 22 × M8 static axial pre-load will loosen bolt seating over time and *let bolts translate axially into the air gap*. **Insert threaded steel or brass heat-set inserts, or bond the bolts axially, or transition to an aluminium modulator plate immediately.** This is a rotor-crash mechanism, not a nice-to-have.
2. **The reaction arm is integral to the printed modulator plate.** Even solid infill at 6 perimeters is a plastic beam with a viscoelastic creep response. Under a static ~2.9 N·m of ring-shaft torque (i.e. ~33 N at the 88 mm arm), the arm will *creep*. That creep is baseline drift in \(\tau_{react}\), which is *the* instrumentation channel that closes Gate 4. **The reaction arm must be aluminium bolted to the modulator plate**, or the modulator plate must be aluminium end-to-end. Do not present a plastic reaction arm as a measurement datum.
3. **Shim stock is metal (C10), aluminium standoffs set the gap (C5) — good** — but the **6× M3 tie rods carrying the axial pre-load and thermal expansion mismatch between aluminium standoffs and printed frame plates is not analyzed.** A 30 °C temperature rise on aluminium standoffs (α ≈ 23 µm/m/K) over 41.6 mm gives 29 µm elongation. On PETG (α ≈ 60–80 µm/m/K), the frame plates want to expand by ~75–100 µm. **Net effect: the air gap changes by tens of micrometres with modest heating.** In an 0.8 mm gap that is 3–12% — same order as the whole ferrofluid ceiling and the gap-shim step. Model it. Consider Invar standoffs or a compensating design.
4. **Hub-motor-as-PMSG efficiency of 0.75 at ~405 rpm** in MG-C1 is *optimistic*. 6.5" hoverboard hubs are outrunner geometry with 30–50 mΩ phase resistance; at ~405 rpm generating into a rectified 30 V bus at ~0.5 A phase, copper losses are 8–20 W against ~15 W generated — plausibly **50–60%**, not 75%. Rework the budget with measured hub-motor Kv and phase R.

**Electrical / control.**

5. **The DRV8353RS + IRFB4110 3-phase stack running in active-rectifier mode (MG-3 / MG-2 generation) requires a dump chopper and brake resistor** — this is stated correctly on sheet 9, but the trigger threshold and the actual 10 Ω / 50 W chassis-mount brake resistor selection is a design decision that needs Gate-2 validation before any powered generation test. The comment "capacitor bank is not a sink" is correct and repeated in MG-C1; that language should be pinned as SAFE-01 doctrine.
6. **The RSD slip observer must publish its confidence interval on \(\omega_{ls}/\omega_{hs}\), not a Boolean.** Real magnetic gears exhibit *transient slip that recovers* under torque overshoot; a Schmitt trigger on ratio deviation will latch spurious faults. Use a runs-test-style persistent-deviation detector matched to the modulator's electrical time constant.

**Verdict: pass conditional on P-2/E-3/E-4 remedial actions.** MG-1 is a good instrument, marred by three plastic-load-path defects that will bite Gate 3 measurements before they bite safety.

### 2.3 Mathematician — Ada L.

**Governing relations.**
- Coupling condition, gear ratio, and reaction-torque identity are correct as stated.
- **The "5.5 × τ_HS = 2.93 N·m reaction load" on sheet 8** deserves a proof. It follows from \(\tau_{ring} = (n_s/p_{in})\tau_{HS}\) at static equilibrium, which is a specific case of the general axial-flux magnetic-gear reaction identity ([UT-Dallas flux-angle mapping](https://bpb-us-e2.wpmucdn.com/labs.utdallas.edu/dist/9/93/files/2022/07/Flux-Angle-Mapping-ECCE-2022.pdf)). State it as a lemma and cite it — it is the mathematical backbone of the load-cell specification.

**Sensitivity analysis missing.**
- The torque-vs-gap curve is *the* Gate 1 experiment. There is no analytical estimate for the sensitivity \(\partial \tau / \partial g\) at the design point. From the shim table (MG-3 §2, gap 0.60→1.20 mm gives \(B_{gap}\) 1.155→1.038 T, a 10% change) and the \(\tau \propto B_{gap}^2\) dependence at the working-harmonic amplitude ([subdomain method torque analysis, AIP Adv](https://pubs.aip.org/aip/adv/article/13/1/015018/2871171/Magnetic-field-and-torque-analysis-of-coaxial)), \(\partial \tau/\partial g \approx -2\tau/B \cdot \partial B/\partial g\) yields **~20–25% torque loss per 0.2 mm gap increase.** That is your build tolerance budget. State it.

**Uncertainty budget not written.**
- Gate 4 is a falsification gate. A falsification gate without a written measurement-uncertainty model is not a falsification gate; it is a comparison. Before running Gate 4, publish \(u(\tau_{in}), u(\tau_{out}), u(\tau_{react})\) with cell-swap covariance, and derive \(u(\eta)\). Only then can "no excess energy within measurement uncertainty" be asserted.

**Statistical design of the V1/V2/V3 sweep.**
- Right now V1/V2/V3 is presented as a monotone sweep. It is actually a **fractional-factorial DoE** over {solid, bundle, laminated} × {0.60, 0.80, 1.00, 1.20 mm} × speed. Structure it as such and pre-register the analysis, or the "publishable loss-vs-lamination dataset" turns into a garden of forking paths.

**Verdict: pass, but demand the uncertainty budget and the sensitivity lemma before Gate 3.**

### 2.4 Historian / Philosopher — Prof. Alcuin

**Provenance is clean.**
- Video-comment-section pseudo-arguments ("free torque with better coupling," "torque limit is a bug") are correctly refuted with citations to Atallah–Howe, MDPI, and the NSF Halbach CMG paper. This is the six-seat review posture working as designed ([Grand Council charter](https://app.notion.com/p/3a1b1ccc4c018139ae13e79d2d08eddb)).
- The doctrine "pull-out slip is a safety primitive, not an efficiency defect" is an important reframing and it is stated repeatedly.

**Where the framing must sharpen.**

1. **"Free energy" language must be excised, not qualified.** MG-2 §0 correctly frames MG-1 as an *energy-conversion*, not a *generation*, artifact. MG-C1 §14 correctly warns that scope creep into "free energy" kills program credibility. This is right. **But CBJG Customs is still a live venture with a "free-energy motor" investor thesis** ([CBJG Customs verification gates issue](https://github.com/giomj/dev/issues/15)). The Council's ethics posture requires: no MG-1 output — data, plots, PDFs, videos, marketing material — may be attached to CBJG Customs communications until an independent calorimetry report is signed. This is not an engineering decision. It is a Council covenant.
2. **The Instagram-reel origin should be documented but not celebrated in the design record.** The design is Atallah–Howe. Give the reel one citation as the trigger; do not repeat "as seen on scaling.larry" in every artifact. Provenance to primary sources is what makes this a Council-ratified document rather than a reel companion.

**Verdict: pass with the CBJG Customs firewall covenant explicitly stated in the artifact.**

### 2.5 Skeptic — Diogenes

**Where I try to break this.**

1. **Gate 4 cell-swap does not test the reaction arm.** You can swap Cell 1 and Cell 2 between HS and LS ports and repeat the balance, but the reaction load cell is a *different* cell type (load cell, not rotary), against a *different* geometry (88 mm arm, not shaft), calibrated against a *different* reference. A common-mode error on that cell (say, an offset from arm creep, or a wire strain from thermal drift) will *not* be caught by the swap. **You must additionally: (a) apply a known dead-weight at 88 mm to independently verify \(\tau_{react}\) before every session, and (b) run at least one condition where \(\tau_{react} = 0\) is known a priori (e.g. free-shaft spin with no output load) and verify the cell reads zero within \(u(\tau_{react})\).**
2. **The three-port identity holds at static equilibrium.** It does *not* hold dynamically once any of the three ports is storing rotational KE, or when the modulator ring stores magnetic energy in the "spring" that couples the rotors. Ferrofluid in the gap makes this worse (correctly noted in MG-3 §7). But even without ferrofluid, a fast transient (a jerk on the LS shaft, a stall recovery) violates \(\sum \tau = 0\) instantaneously. Log at ≥10 kHz and *do not* run Gate 4 on any window that includes an acceleration event. State this in the Gate 4 protocol.
3. **The exit criterion "\(\eta \ge 80\%\) at V1 in the 40–80% pull-out band" is a pass criterion without a fail criterion for the *program*.** What does the program do if V1 comes in at 62%? Is it a build defect, a design defect, or evidence that the 12–20 N·m/L printed-build number is optimistic? Define the decision tree.
4. **"Gate 4 falsifies over-unity" only if the *only* place unmeasured energy could enter is instrumentation.** Ferrofluid in the gap creates a new energy store (MG-3 §7 is correct). But so does: eddy currents in the modulator bolts (a thermal store), magnetic hysteresis in N42 (a small dissipative store), and mechanical friction in bearings (a dissipative store). All of these show up as \(P_{loss}\), so \(P_{out} < P_{in}\) always — they cannot produce \(\eta > 1\). But they *can* produce a plausible-looking energy-balance error if you compute \(\eta = P_{out}/P_{in}\) without a running \(\int P_{loss}\, dt\) term for the thermal store. Add \(\dot Q_{mod}\) estimation from the NTC + specific-heat model into the balance.
5. **The MG-3 recommendation to buy ferrofluid for QC and NEVER put it in the gap is correct.** Do not accept the "Gate 1F flooded sweep" side-quest as a way to appease the reel comments. Publish the negative result *from the arithmetic* and move on. Every hour on Gate 1F is an hour not on Gate 3.
6. **MG-C1 charge-time table is honest but omits temperature dependence.** LiFePO4 at 0 °C loses ~30% of charge acceptance. The 6.15 h to fill a 20 000 mAh bank at 12 W is a lab-temperature figure. If MG-C1 is marketed for field use (survival, off-grid), state the temperature curve.

**Verdict: pass with 5 remedial protocol additions (all cheap).** Skeptic will vote yes.

### 2.6 Scribe (Notion) & Architect (GitHub) — coordination

- The four artifacts (MG-1, MG-2, MG-3, MG-C1) do not yet have a single GitHub issue in `giomj/dev` tracking their integration into the SAFE-01 chain, per repo doctrine. Open one, and cross-reference #14 (SAFE-01 canonical) and #15 (CBJG Customs).
- The BOM (`MG-C1_bill_of_materials.xlsx`) is authoritative; the artifact-doc numbers must be reconciled against it before publication (per MG-C1 §1 verification basis).
- Notion mirrors the review record; **GitHub wins on any Notion/GitHub disagreement**, per charter ([Grand Council charter](https://app.notion.com/p/3a1b1ccc4c018139ae13e79d2d08eddb)).

### 2.7 Emperor — ratification posture

**Ratify** conditional on:

- P-2 (axial-thrust bearing sizing) landed.
- E-3 (thermal-expansion gap model) landed.
- E-4 (reaction arm becomes aluminium) landed.
- M-1 (uncertainty budget) written before Gate 3.
- S-1 (dead-weight reaction-arm calibration) added to Gate 4 protocol.
- H-1 (CBJG Customs firewall covenant) explicitly stated in every MG-1 artifact.

Everything else is a nit or a follow-on for MG-2.

---

## 3. Cross-artifact conflicts

| # | Conflict | Resolution |
|---|---|---|
| C1 | MG-1 says "target pull-out ≥ 1.5 N·m"; MG-C1 says "predicted 1.8–3.0 N·m" | Reconcile in a single row of the master BOM; MG-C1's range is correct at 12–20 N·m/L on 0.150 L. |
| C2 | MG-1 §5 says "Do not scale by ratio, P_out ≤ P_in"; MG-C1 §6 correctly applies this. Ferrofluid MG-3 §7 restates it a third time. | Fine; but hoist to a single **Doctrine** section shared by all four docs. |
| C3 | Modulator field frequency: MG-1 body says "hundreds of Hz at 3000 rpm"; drawing sheet 6 says "~550 Hz"; MG-C1 energy budget says 74 Hz at 90 rpm scaling linearly to ~2470 Hz at 3000 rpm | State the formula once, tabulate at three speeds, cite. |
| C4 | Air-gap dimension: 0.80 mm nominal is stated everywhere; the CAD README says the shim-stack allows 0.60/0.80/1.00/1.20; but BOM A5 (printed shim, "trial only") suggests the metal shim (C10) is the real sweep tool | Correct; make A5 explicitly "gap trial only, never for measurement" in the BOM notes. |

---

## 4. Problem statements (the reviewed set)

**P-1 · Magnetic-gear program lacks a documented uncertainty budget for the three-port energy balance.** Gate 4 cannot be a falsification gate without one.

**P-2 · Axial static thrust across each rotor is ~2 kN, unsized against 608ZZ bearings.** Rotor crash mechanism.

**P-3 · Modulator plate carries M8 pole-piece bolts in printed PETG threads under static axial pre-load.** Long-term bolt migration into the air gap.

**P-4 · Reaction arm and modulator plate share a plastic load path.** Creep in the arm is direct measurement error in the channel that closes Gate 4.

**P-5 · Thermal-expansion mismatch between aluminium standoffs and PETG frame plates changes the air gap by tens of micrometres per 30 °C rise.** Same-order effect as the gap-shim sweep.

**P-6 · Torque ripple spectrum is unpredicted.** RSD slip observer will alarm on non-fundamental content; MG-2 field-oriented control will inherit the ripple unmodeled.

**P-7 · Hub-motor-as-PMSG efficiency (0.75 in MG-C1 budget) is not evidence-based for a 6.5" hoverboard hub at 405 rpm.** Overall efficiency likely biased optimistic by 10–15 pp.

**P-8 · Modulator field-frequency formula is stated inconsistently across artifacts.** Downstream eddy-loss math inherits whichever number is wrong.

**P-9 · Reaction load cell has no independent verification path.** Cell-swap does not catch common-mode reaction-arm errors.

**P-10 · CBJG Customs is a live venture with a "free-energy motor" thesis, and MG-1 outputs are the highest-quality technical evidence CBJG owns.** Without an explicit firewall, MG-1 evidence *will* be repurposed into that venture's investor deck.

**P-11 · The 12–20 N·m/L printed-build torque density is a plausible band, not a measurement.** All power budgets below Gate 3 are estimates.

**P-12 · V1→V2→V3 modulator sweep is not designed as a statistical experiment.** Risk of overinterpreting a monotone loss curve as more than trend evidence.

---

## 5. Proposed solutions — in order of priority

### 5.1 Immediate (before printing v0.1 hardware)

**S-1 · Aluminium modulator plate.** Replace printed PETG modulator with a **6061-T6 aluminium plate, 12 mm thick, water-jet or CNC-milled**, with the reaction arm as an integral aluminium extension or bolted-on aluminium bar. Cost impact: +$25–40. Removes P-3, P-4, and half of P-5. This is the highest-leverage single change in this review.

**S-2 · Axial-thrust bearing pair.** Replace 608ZZ (radial deep-groove) with **7000-series angular-contact pairs** (DB or DF configuration) at each shaft. Or preserve 608ZZ and add a **PTFE thrust washer** between rotor hub and frame plate on both sides. Sized load: ~2 kN static per rotor, ~1 kN dynamic. Solves P-2. Cost impact: +$20.

**S-3 · Thermal expansion model.** Add a two-line calculation to the drawing set: elongation of aluminium standoffs vs PETG frame at ΔT = 30 °C. Publish the resulting gap uncertainty as ±u_thermal(g). Solves P-5. Cost: zero (documentation).

**S-4 · Publish the modulator-frequency formula once.** State \(f_{mod} = (p_{out}\cdot \omega_{HS})/(2\pi)\) at 3000 rpm HS = 450 Hz (working harmonic), tabulate at 90 rpm (13.5 Hz), 500 rpm (75 Hz), 3000 rpm (450 Hz), and cite [axial-field magnetic gear analysis](https://www.phy.cuhk.edu.hk/itp/v3/links/mmm/pdfs/08R303_1.pdf). Solves P-8. Cost: zero.

### 5.2 Before Gate 1

**S-5 · Uncertainty budget document (`MG-1_uncertainty.md`).** Write out \(u(\tau_{in})\), \(u(\tau_{out})\), \(u(\tau_{react})\), their cross-covariances after cell swap, and the derived \(u(\eta)\). Include cell datasheets' hysteresis, temperature-drift coefficients, and load-cell arm-length uncertainty. This is a one-day write. Solves P-1.

**S-6 · Torque-ripple pre-simulation.** Run one 2D FEA of the 2/9/11 geometry (femm or Ansys Maxwell; the axial-flux case is well-supported ([Scientific.net FEA of CMG magnetostatic field](https://www.scientific.net/AMM.764-765.289))) and report the harmonic spectrum of the transmitted torque vs mechanical angle. Feeds P-6, feeds RSD estimator design, feeds Gate 1 pass criteria.

**S-7 · Reaction-cell independent verification.** Add a fixed dead-weight lever + M8 hook feature to the modulator arm (a d5 hole at r = 100 mm), so a known mass can be hung from the arm as a Gate-0.5 calibration before every session. Solves P-9. Cost: a $0.02 hole in the CAD.

### 5.3 Before Gate 3

**S-8 · Measured PMSG map for the specific hub motor being used.** Bench the 6.5" hub as a generator on a torque cell, sweep speed 100–500 rpm and load 0–3 N·m, publish the efficiency map. Refit the MG-C1 energy-budget spreadsheet. Solves P-7.

**S-9 · DoE structure for V1/V2/V3.** Publish the sweep as: **12 conditions = 3 modulator variants × 4 gaps** at a fixed reference speed, with 3 replications per cell, randomized. Pre-register the analysis (e.g. two-way ANOVA on \(P_{loss}\) with gap and variant as factors). Solves P-12.

### 5.4 Program-level

**S-10 · CBJG Customs firewall covenant.** Add to the master BOM's README tab and to every MG artifact:

> **Council covenant, non-optional:** No MG-1, MG-2, MG-3, or MG-C1 data (raw, plotted, or narrated) may be attached to CBJG Customs venture materials, investor communications, or public campaigns until an independent calorimetry report of ≥1 kW class hardware and a securities-counsel opinion clear the gate ([issue #15](https://github.com/giomj/dev/issues/15)).

Solves P-10. Cost: zero.

**S-11 · Ratify at the modulator-plate revision.** Do not print v0.1 as drawn. Land S-1, S-2, S-3, S-4, S-7, S-10 into a v0.2 revision of the drawing set, then print.

---

## 6. Architectural framework — where MG-1 fits

```
┌─────────────────────────────────────────────────────────────────┐
│                          CBJG PROGRAM                            │
│                                                                  │
│   ┌──────────────┐    ┌──────────────────┐   ┌────────────────┐ │
│   │  SAFE-01     │◀───│    MG-1 GEAR     │───▶│   RSD KLE       │ │
│   │  hardware    │    │  bench instrument│    │  L / K / E       │ │
│   │  torque-off  │    │  three-port      │    │  estimator only  │ │
│   └──────┬───────┘    └────────┬─────────┘    └────────┬────────┘ │
│          │                     │                       │           │
│          │  authority          │  data                 │  observation
│          │  (interlock)        │  (Gate 1..4)          │  (slip,   │
│          │                     │                       │   T_mod)  │
│          ▼                     ▼                       ▼           │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │              MG-C1  HAND-CRANK CHARGER                    │   │
│   │  human ▶ MG-1 LS ▶ MG-1 HS ▶ PMSG ▶ rectifier ▶            │   │
│   │  ▶ buck-boost ▶ LiFePO4 buffer ▶ USB-PD ▶ device          │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  MG-2  PSEUDO DIRECT DRIVE  (integrated stator + gear)    │   │
│   │  Micro-hydro / small-wind demonstrator (recommended first) │   │
│   │  E-bike hub (Grid & Chain crossover)                       │   │
│   │  ─────  NOT started until MG-1 Gates 1–3 close  ─────       │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  MG-3  FERROFLUID: P5 polarity mapping only. Never in gap. │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  CBJG CUSTOMS   ◀── FIREWALL ── no MG data until           │   │
│   │  venture wrapper       calorimetry + counsel gate clears   │   │
│   └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Doctrine hoisted from four artifacts into one place:**

1. \(P_{out} \le P_{in}\) at all times. Gate 4 is contractual.
2. Pull-out slip is a mechanical safety primitive, not a bug. SAFE-01 remains the sole torque-removal authority.
3. RSD is estimator, slip observer, thermal virtual sensor — never in the safety path.
4. Three ports measured means no unmeasured path. Every derived efficiency carries a written uncertainty.
5. The reel is a trigger, not a citation. Primary sources rule.
6. CBJG Customs firewall: no MG data attaches to venture materials without an independent gate.

---

## 7. Ratification block

**Result:** conditional pass.

**Conditions to close before Gate 1 (blocking):**

- [ ] S-1 · Aluminium modulator plate + integral reaction arm
- [ ] S-2 · Angular-contact thrust bearings or PTFE thrust washers
- [ ] S-3 · Thermal-expansion note added to drawing sheet 7
- [ ] S-4 · Modulator-frequency table added to drawing sheet 6
- [ ] S-7 · Reaction-arm dead-weight calibration hole
- [ ] S-10 · CBJG Customs firewall covenant

**Conditions to close before Gate 3 (blocking):**

- [ ] S-5 · Uncertainty budget document
- [ ] S-6 · 2D FEA of torque ripple spectrum
- [ ] S-8 · Measured PMSG efficiency map
- [ ] S-9 · V1/V2/V3 DoE structure

**Not blocking but track:**

- [ ] Consider Halbach magnetization on rotor arrays for MG-2 (14.3% torque-density lift per [UniWA Halbach analytical model](https://elke.uniwa.gr/wp-content/uploads/sites/325/2024/05/%CE%94%CE%97%CE%9C%CE%9F%CE%A3%CE%99%CE%95%CE%A5%CE%A3%CE%97_%CE%A4%CE%A3%CE%9F%CE%9B%CE%91%CE%9A%CE%97%CE%A3_27-04-2024.pdf)).
- [ ] Consider HTS bulks on modulator ring for MG-2 kW-class variants ([JPIER HTS CMG](https://www.jpier.org/ac_api/download.php?id=22010902)).

---

## 8. Quantum-computing extension of the MG-1 theory

*This section fulfills the convener's brief to investigate how a quantum computer can extend the theory. It is treated as speculative program work, not as a claim.*

MG-1 is described by three coupled mathematical problems, each of which has an emerging quantum-computing analogue:

### 8.1 The forward problem — magnetostatic Poisson

The magnetic vector potential \(\mathbf{A}\) inside the gear satisfies, in 2D,

\[
\nabla \cdot \left(\frac{1}{\mu(\mathbf{r})}\nabla A_z\right) = -J_z + \nabla \times \left(\frac{\mathbf{M}}{\mu}\right)_z
\]

with piecewise-linear-then-saturating \(\mu(\mathbf{r})\) in the pole-piece regions (Jiles–Atherton nonlinearity, as used by [Torque analysis in CMG considering nonlinear materials](https://bpb-us-w2.wpmucdn.com/u.osu.edu/dist/6/105859/files/2021/06/112_torque_analysis_in_coaxial_magnetic_gears_considering.pdf)). Discretized on a mesh with \(N\) unknowns, this is a Poisson-like linear system \(A\mathbf{x} = \mathbf{b}\).

**Quantum extension.** Xu et al. (2021) demonstrated a **Variational Quantum Algorithm for the Poisson equation** ([Phys. Rev. A 104, 022418](https://link.aps.org/doi/10.1103/PhysRevA.104.022418)) that transforms the finite-difference Poisson operator into a tensor product of simple operators, yielding an explicit decomposition with only \(O(\log N)\) terms. A near-term MG-1 extension: encode a coarse 2D magnetostatic slice of the MG-1 gap-and-modulator geometry as a VQA on IBM Quantum hardware (which is already integrated in the user's IBMQ connector project, [ibmq-connector](https://github.com/giomj/dev)), and compare against COMSOL/femm reference on the same mesh. This is not a speed win at MG-1 scale — but it is a defensible **RSD × quantum** boundary experiment: does a variational algorithm converge to the analytical torque within instrument uncertainty on \(O(64)\)–\(O(256)\)-cell meshes.

### 8.2 The inverse problem — topology optimization

Choosing where to put steel, magnet, air, and copper within the annulus to maximise pull-out torque is a **binary-material topology optimization problem** — assign each mesh cell one of \(\{\text{air, PM+, PM-, steel}\}\). This is NP-hard as stated.

**Quantum extension.** Maruo et al. (COMPUMAG 2021 / IEEE Trans. Magn. 2022) formulated 3D topology optimization of a permanent magnet and a magnetic core as a **QUBO problem** on a Fujitsu Digital Annealer with 600–758 unknowns, iterating between FEM field solves and QUBO topology updates until self-consistent ([Hokkaido U. COMPUMAG](https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/87018/1/COMPUMAG2021_full_maruo_31.pdf), [IEEE TO of electromagnetic devices using Digital Annealer](https://ieeexplore.ieee.org/document/9803271/)). Ye & Sigmund (2023) extended this to continuum TO via Benders decomposition and D-Wave hybrid solvers ([Quantum Topology Optimization via Quantum Annealing, NSF preprint](https://par.nsf.gov/servlets/purl/10422510)); a more recent framework (arXiv 2406.18833) demonstrates it for continuum structures ([Design update framework, arXiv](https://www.arxiv.org/abs/2406.18833)).

For MG-2 — where the design freedom is real (Halbach patterns, modulator-pole shape, back-iron geometry) — this is a **credible near-term path**. Concrete program addition:

- Ingest a 2D-FEA reference model of MG-1 (matches Gate 1 measurements).
- Encode the modulator-ring's 22-bolt pattern as 22 binary "steel/air" cells (small enough for direct QUBO embedding).
- Optimize \(\tau_{pullout} - \lambda \cdot \tau_{ripple,rms}\) on D-Wave Advantage.
- Compare to Halbach and flux-concentration designs from the literature ([JEET flux-concentration CMG, +12% pull-out](https://koreascience.kr/article/JAKO201814446221029.pdf)).

This is **exactly the scale** ("hundreds of unknowns") where quantum-annealing TO has demonstrated wins, and it maps cleanly to the MG-1 → MG-2 progression.

### 8.3 The dynamics — evolution equation for eddy currents and slip

Eddy-current diffusion in the modulator pole pieces is a heat-equation-like PDE with a source term from the modulated field. The Sarma-Bharadwaj **Variational Quantum Evolution Equation Solver** ([Sci. Rep. 12, 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9233714/)) time-steps a Poisson-encoded Laplacian on hardware. MG-1 offers a bounded, physically motivated test problem: given the modulator's geometry, boundary temperature (via NTC), and field frequency (from RSD), simulate the eddy-current-driven thermal evolution \(T_{mod}(t)\) and compare to the measured curve.

### 8.4 Where quantum is *not* useful, and shouldn't be claimed

- **Real-time control.** RSD's 1 kHz FOC loop is a place for classical Kalman/EKF/factor-graph inference. Quantum-hardware latency is orders of magnitude wrong for that.
- **Gate 4 falsification.** No quantum method changes the energy balance. The three-port measurement is a classical instrumentation problem and it must stay that way.
- **Marketing.** "Quantum-optimized magnetic gear" as a venture claim, without an actual head-to-head against classical topology optimization on the same problem, falls under the Grand Council's speculative-physics posture and would be rejected on the same grounds as the free-energy framing ([Council ruling on speculative physics](https://app.notion.com/p/3a1b1ccc4c018139ae13e79d2d08eddb)).

### 8.5 Recommended quantum work-plan (parallel to MG-1 build)

| Phase | Scope | Deliverable | Hardware |
|---|---|---|---|
| Q0 | Analytical + 2D FEA reference model of MG-1 (2/9/11) | Verified torque, ripple spectrum, field map | Local femm / classical |
| Q1 | VQA-Poisson on a 64-cell slice of the MG-1 gap | Match FEA field within 10% | IBM Quantum (Qiskit, existing IBMQ connector) |
| Q2 | QUBO topology optimization of a 22-cell modulator ring | New pole pattern that beats the 22-M8 baseline in simulation | D-Wave Advantage hybrid solver |
| Q3 | Build the Q2 winner as an MG-1 modulator V4 variant, run through Gate 1/3 | Measured torque and loss vs the QUBO prediction | Existing MG-1 rig |
| Q4 | Publish the Q0→Q3 dataset as a paper: *"Comparative quantum-annealing topology optimization of a coaxial magnetic gear, validated on a three-port instrument"* | Preprint | Existing GitHub + Notion pipeline |

Q3 is the honest test. Quantum wins are only quantum wins if the *built hardware* validates the *quantum-optimized design*, on the same three-port instrument that rejects over-unity artefacts. That is the correct standard, and MG-1 is the correct instrument for it.

---

## 9. References

- [Atallah, Calverley & Howe, high-performance magnetic gears, IEE Proc. Elect. Power Appl. 2004 (via CUHK Physics)](https://www.phy.cuhk.edu.hk/itp/v3/links/mmm/pdfs/08R303_1.pdf)
- [Torque analysis in coaxial magnetic gears considering nonlinear Jiles–Atherton materials, OSU](https://bpb-us-w2.wpmucdn.com/u.osu.edu/dist/6/105859/files/2021/06/112_torque_analysis_in_coaxial_magnetic_gears_considering.pdf)
- [Flux-concentration CMG improves pull-out torque by 12%, JEET/KoreaScience](https://koreascience.kr/article/JAKO201814446221029.pdf)
- [Modeling of a Coaxial Magnetic Gear (MEC vs 2D FEA), FEMTO-ST](https://publiweb.femto-st.fr/tntnet/entries/13095/documents/author/data)
- [High-Torque HTS-CMG with Meissner-effect harmonic suppression, JPIER](https://www.jpier.org/ac_api/download.php?id=22010902)
- [Halbach array coaxial gear 2D analytical model with +14.3% torque density, UniWA](https://elke.uniwa.gr/wp-content/uploads/sites/325/2024/05/%CE%94%CE%97%CE%9C%CE%9F%CE%A3%CE%99%CE%95%CE%A5%CE%A3%CE%97_%CE%A4%CE%A3%CE%9F%CE%9B%CE%91%CE%9A%CE%97%CE%A3_27-04-2024.pdf)
- [Politecnico di Torino thesis: 94.6 kN·m/m³ with support yokes, 43.4 without](https://webthesis.biblio.polito.it/17238/1/tesi.pdf)
- [Subdomain-method / superposition torque analysis of CMG, AIP Advances 13, 015018 (2023)](https://pubs.aip.org/aip/adv/article/13/1/015018/2871171/Magnetic-field-and-torque-analysis-of-coaxial)
- [Double-flux-concentrating CMG harmonic-content analysis, JAE / Sagepub](https://journals.sagepub.com/doi/full/10.3233/JAE-210128)
- [Flux Angle Mapping magnetic gears for high ratios, UT-Dallas ECCE 2022](https://bpb-us-e2.wpmucdn.com/labs.utdallas.edu/dist/9/93/files/2022/07/Flux-Angle-Mapping-ECCE-2022.pdf)
- [Reluctance-modulator CMG, UT-Dallas ECCE 2020](https://bpb-us-e2.wpmucdn.com/labs.utdallas.edu/dist/9/93/files/2021/09/Reluctance-Coaxial-ECCE-2020.pdf)
- [2D FEA of CMG magnetostatic field (Ansoft/Maxwell), Scientific.net](https://www.scientific.net/AMM.764-765.289)
- **Quantum computing:**
  - [Xu et al., Variational Quantum Algorithm for the Poisson equation, Phys. Rev. A 104, 022418 (2021)](https://link.aps.org/doi/10.1103/PhysRevA.104.022418)
  - [Sarma et al., Variational quantum evolution equation solver, Sci. Rep. 12 (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9233714/)
  - [Maruo et al., Topology optimization of electromagnetic devices using Digital Annealer, IEEE TMAG 2022](https://ieeexplore.ieee.org/document/9803271/)
  - [Maruo COMPUMAG 2021 PM + magnetic-core topology optimization](https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/87018/1/COMPUMAG2021_full_maruo_31.pdf)
  - [Ye et al., Quantum Topology Optimization via Quantum Annealing, NSF-hosted preprint](https://par.nsf.gov/servlets/purl/10422510)
  - [Design update framework for TO with quantum annealing, arXiv 2406.18833](https://www.arxiv.org/abs/2406.18833)
- **Program artifacts:** MG-1 solution design v0.1; MG-2 applications v0.1; MG-3 ferrofluid v0.1; MG-C1 energy-transformer BOM v0.1; MG-1 drawing set (15 sheets) — all in this Grand Council project.
- [Grand Council charter (Notion reading-room seat map)](https://app.notion.com/p/3a1b1ccc4c018139ae13e79d2d08eddb)
- [CBJG Customs venture verification gates, `giomj/dev` issue #15](https://github.com/giomj/dev/issues/15)
- [SAFE-01 canonical, `giomj/dev` issue #14](https://github.com/giomj/dev/issues/14)

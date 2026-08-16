# MG-5 — Starter Subsystem Design

**Solar-assisted starter for the MG-1 flux-modulated magnetic gear stage**
CBJG Holdings LLC · Revision 0.1 · Companion to MG-1 (solution design), MG-2 (energy conversion), MG-C1 (charger), MG-1Q (quantum optimisation), MG-6 (instrumentation)

---

## 0. Statement of the problem, and what this document does not claim

MG-1 is a 4.5:1 counter-rotating flux-modulated magnetic gear built as an **instrument** — a three-port torque balance with a frame-grounded modulator reaction arm — not as a reducer. Adding a starter means adding the one subsystem that can destroy the machine faster than any other: a source of torque that does not know about the pole-slip limit.

The design below therefore starts from the failure mode and works backwards to the parts.

**Explicit rejection of over-unity.** The starter consumes real electrical energy from a real photovoltaic panel to raise a real rotor to speed against real losses. Section 4 quantifies it: **9.46 J of electrical energy to reach 405 rpm on the high-speed shaft**, against a measured gear loss of 2.258 W at the design point. MG-1 is a passive torque transformer with ~90 % efficiency. Nothing in this document produces net energy, and any reading of it that suggests otherwise is a misreading.

**What is not verified here.** No hardware has been built. Every number below comes from `starter_verify.py` operating on the MG-1 constants, and every one of them is a *prediction* that MG-6 exists to test. The motor constant `Kv = 13.40 rpm/V` is a datasheet-class figure for a 6.5″ hoverboard hub motor and is the single largest source of uncertainty in this document — measure it (Gate 1a, MG-6 §3) before trusting any current or voltage figure here.

---

## 1. The binding constraint: pole slip, not motor capability

A magnetic gear has no teeth. Above a critical torque the flux coupling breaks and the rotors slip past each other — instantly, with no mechanical warning, and with a torque transient that can unseat magnets in a printed carrier.

For MG-1 the verified static pull-out is **τ_pullout,LS = 3.003 N·m**, i.e. **0.6673 N·m referred to the high-speed shaft** (÷4.5).

With `Kt = 60/(2π·Kv) = 0.7126 N·m/A`:

| Quantity | Value | Note |
|---|---|---|
| Torque at pull-out, HS | 0.6673 N·m | 3.003 / 4.5 |
| **Phase current at pull-out** | **0.9364 A** | 0.6673 / 0.7126 |
| Soft limit (chosen) | **0.700 A** | 74.75 % of pull-out |
| Torque at soft limit, HS / LS | 0.4988 / 2.2448 N·m | |
| Hard trip (chosen) | **0.900 A** | 96.11 % of pull-out |

**This is the entire safety argument for the starter.** A 6.5″ hub motor on a commodity drive will happily pass 20–70 A. The magnetic gear slips at **0.94 A**. The current limit is not a tuning parameter — it is the mechanical protection device, and it must be set before the motor is ever energised.

### Consequence for controller selection

The requirement "regulate 0.7 A with confidence" eliminates most hobby drives on *current-sense resolution*, not on capability. VESC-class hardware commonly uses ~0.5 mΩ shunts (~15 mV/A) sized for 70 A full scale, per [VESC project forum discussion](https://vesc-project.com/node/4222) — a 0.7 A setpoint sits in the noise floor. The [Trinamic TMC4671-EVAL at $78.24](https://www.newark.com/trinamic-analog-devices/tmc4671-eval/eval-board-bdc-bldc-stepper-motor/dp/71AH5973) publishes its full 16-bit ADC gain chain and lets you choose the shunt, so 0.5–0.8 A regulation is *designable*. [ODrive S1 at $149](https://shop.odriverobotics.com/products/odrive-s1) is the turnkey option with Hall input and a real brake-resistor regen path, at the cost of coarse sensing near 1 % of full scale.

Traps confirmed in research: **[ODrive Micro](https://docs.odriverobotics.com/v/latest/hardware/micro-datasheet.html) has the right current scale but a 31 V bus ceiling** — below the 36 V this rig needs (§3), so it is disqualified. **[ODrive Pro](https://docs.odriverobotics.com/v/latest/hardware/pro-datasheet.html) has no brake-resistor driver**, so all regen must go into the battery. **[TI L6234PD](https://www.lcsc.com/product-detail/Brushless-DC-BLDC-Motor-Driver_STMicroelectronics-L6234PD_C1523896.html)** is a bare power stage with no commutation or current regulation.

### Non-negotiable: an independent torque fuse

Because no software current limit on a hobby drive is trustworthy at 0.7 A, the design adds a **second, independent** limit that does not depend on firmware:

1. A **series resistor or PTC sized so the bus physically cannot deliver more than ~1.1 A** at 36 V into a stalled motor, and
2. A hardware overcurrent comparator on the [INA228 shunt](https://www.adafruit.com/product/5832) shunt-voltage output wired into the drive's enable pin, tripping at 0.90 A.

Neither is a substitute for setting the drive limit correctly. Both exist because the failure is unrecoverable.

---

## 2. Architecture selection

### Option A — Integrated starter-generator (SELECTED)

Drive the **existing 6.5″ hub motor on the high-speed shaft** as a motor for the start, then release it back to rectifier/generator mode. No added rotating mass, no clutch, no extra shaft, no new alignment problem in a machine whose gap tolerance is ±28 µm (§5).

The hub motor is already Hall-sensored: 6.5″ hoverboard motors carry a 5-wire Hall harness (5 V / A / B / Z / GND), **30 poles = 15 pole pairs = 90 Hall counts per revolution**, ≈0.179 Ω phase resistance and ≈0.336 mH. That gives unambiguous rotor position at zero speed, which is the precondition for a torque-limited start (§3).

### Option B — Separate geared starter + one-way clutch (fallback)

Required only if the PM port must stay hard-wired in rectifier-only configuration. Closest match found: [Pololu 37D 30:1 gearmotor](https://www.pololu.com/product/4743) at 330 rpm / 1.37 N·m stall — 0.30 N·m breakaway is ~22 % of stall, inside the <2 A budget. Coupled through [CSK12PP one-way clutch, $22.49](https://vxb.com/products/csk12pp-one-way-bearing-with-keyway-sprag-freewhee), which has keyways on both races so the starter cannot slip the press fit when it bites.

Rejected for V1 because it adds inertia, a second alignment interface, and an overrunning-wear failure mode. Note the trap: a **worm gearbox will not backdrive**, so with a worm starter the clutch is mandatory rather than optional; and plastic-housing clutches like the FCP-10H (2.26 N·m) have thin margin under shock.

**Decision: build Option A. Keep the CSK12PP and the 37D on the shelf as the Gate-3 contingency.**

---

## 3. Bus voltage — the finding that changes the topology

This is the most consequential result in the document, and it corrects the naive assumption that a 12 V pack can start the machine.

Back-EMF at the design speed of 405 rpm on the HS shaft:

\[ V_{bemf} = \frac{n}{K_v} = \frac{405}{13.40} = 30.22\ \text{V} \]

Add I·R at the 0.70 A limit and drive headroom:

| Quantity | Value |
|---|---|
| Back-EMF at 405 rpm | 30.22 V |
| Bus needed (bare minimum) | 31.50 V |
| **Bus needed with 15 % headroom** | **36.23 V** |
| **Max HS speed reachable on a 12 V bus** | **160.8 rpm** |
| Max LS speed on 12 V | 35.7 rpm |
| **Fraction of design speed on 12 V** | **39.7 %** |

**A 12 V LiFePO4 pack cannot spin this machine past 40 % of its design speed.** The starter therefore requires a boost stage, and the whole power chain becomes:

```
PV panel (20 W)  →  MPPT charger  →  12 V LiFePO4 pack
                                          │
                                          ├──→ supercapacitor buffer (optional, §4)
                                          │
                                          └──→ boost converter → 36 V starter bus → 3-phase drive → hub motor
```

Target **36 V, not 40 V**. [TI MCT8316Z / DRV8316C](https://www.ti.com/product/DRV8316C) integrated stages are 35 V *operating* with 40 V absolute maximum — a 40 V bus plus regen overshoot leaves zero margin. Likewise the common "adjustable boost" modules top out at 32 V, below the 30.2 V back-EMF plus headroom; a 36 V-capable module such as the [TPS55340 (38 V max out)](https://www.ti.com/product/TPS55340) or an over-rated discrete module is required. Add an [LM74700 ideal-diode controller ($0.54)](https://www.ti.com/product/LM74700-Q1) at the battery input — it removes reverse-polarity risk and the 0.5 V diode loss for pennies.

### Mode switching

The 36 V starter bus and the MG-C1 generate-path (rectifier → buck-boost → LiFePO4 → USB-PD) cannot be live simultaneously. A **bus-mode contactor** selects one or the other, interlocked so that:

- **START mode** = boost stage live, MG-C1 rectifier isolated, drive enabled, current limit armed.
- **GENERATE mode** = drive gate-disabled, boost stage off, MG-C1 chain connected.
- Transition permitted only below 500 rpm HS, and only with the shroud closed.

---

## 4. Ramp dynamics and the energy budget

Equivalent inertia referred to the high-speed shaft:

\[ J_{eq,HS} = J_{HS} + \frac{J_{LS}}{G^2} = 3.2\times10^{-3} + \frac{1.1\times10^{-2}}{4.5^2} = 3.743\times10^{-3}\ \text{kg·m}^2 \]

Breakaway is trivially easy — 0.30 N·m static friction + 0.12 N·m drag = 0.42 N·m at LS = 0.0933 N·m at HS = **0.131 A, a 5.34× margin** under the soft limit. The machine will start. The question is how fast, and who pays for the peak.

| Case | Current | Ramp time | Peak electrical power | Electrical energy |
|---|---|---|---|---|
| **A — current-limited (fast)** | 0.700 A | **0.391 s** | **31.34 W** | 6.14 J |
| **B — panel-limited** | 0.277 A | **1.526 s** | 12.40 W | 9.46 J |

Kinetic energy at 405 rpm is **3.37 J** in both cases; the difference is drag and I²R paid over a longer ramp.

**The derated panel supplies 12.4 W. Case A needs 31.3 W.** So:

- **The panel alone can start the machine** — in 1.53 s, drawing 0.277 A, at 39.6 % of the soft current limit. No buffer required.
- **A fast (0.39 s) start requires the supercapacitor buffer**, because the panel cannot supply the 31 W peak.

This corrects an earlier working assumption of an 8 s ramp at 3.56 W. The corrected figures are the ones above.

Inertial torque during the fast ramp is J·α = 3.743e-3 × 108.33 = **0.4054 N·m at HS = 60.8 % of pull-out** — inside the limit with margin, which is why case A is admissible at all.

### Supercapacitor sizing

A 10 F / 12 V bank holds **460.8 J usable** (discharging 12 V → 6 V), which is **75× the 6.14 J the fast start needs**, and recharges from the panel in **0.49 s**. That gross over-sizing is deliberate: a shallow discharge keeps the bus nearly flat during the ramp instead of sagging into the drive's undervoltage lockout.

[Eaton XVM modules](https://www.eaton.com/content/dam/eaton/products/electronic-components/resources/data-sheet/eaton-xvm-supercapacitor-module-data-sheet.pdf) are the engineering answer — published 22 mΩ ESR, IP54, passive balancing inside. The cheap route is [6× 2.7 V / 500 F cells at $23.39](https://www.amazon.com/Capacitor-35X60mm-Suitable-Automotive-Rectifiers/dp/B08B16FJQR) plus a 5-series balance board at $16.99 from the [same listing's other-sellers panel](https://www.amazon.com/Capacitor-35X60mm-Suitable-Automotive-Rectifiers/dp/B08B16FJQR), but the fetched listing carries buyer measurements of **200–250 F against a claimed 500 F** — derate to half nameplate and never make them the sole energy source for a repeatable start.

Precharge is mandatory: a [CR5-10-RC 10 Ω 5 W resistor ($0.69)](https://www.jameco.com/z/CR5-10-RC-Jameco-ValuePro-Resistor-Wirewound-10-Ohm-5-5-Watt-plusmn-400ppm-deg-C-Axial-Through-Hole_660375.html) in series, shorted by a relay after ~5 τ, or an [Ametherm SL22 5R012 NTC ($1.71)](https://www.newark.com/ametherm/sl22-5r012/ntc-thermistor/dp/72J6836) as the simpler alternative. **Do not use an automotive blade fuse** — [Littelfuse ATOF 0287010.PXCN](https://www.newark.com/littelfuse/0287010-pxcn/fuse-atof-blade-10a/dp/24W7933) is rated 32 VDC and its interrupt rating does not extend to a 36–40 V bank that can source hundreds of amps.

### Solar front end

For a 20 W panel the [Genasun GV-5-Li at $99.95](https://www.gigaparts.com/genasun-5a-mppt-solar-charge-controller-for-lifepo4-batteries.html) is the tidiest fit — 5 A against ~1.1 A of panel current, explicit LiFePO4 profile. [Victron SmartSolar 75/10 at $62.05](https://www.victronenergy.com/solar-charge-controllers/smartsolar-mppt-75-10-75-15-100-15-100-20) is over-sized but its Bluetooth telemetry is genuinely useful when logging start energy. Panel: [Newpowa NPA20S-12J at $39.99](https://www.newpowa.com/new-20w-monocrystalline-12v-solar-panel/) — 19.08 V Vmp gives a buck MPPT good headroom over a 14.6 V LiFePO4 target. **Do not** spec a low-voltage/high-current panel (e.g. 6.6 V Voc): a buck-type MPPT cannot charge a 12 V pack from it at all.

Pack: [Talentcell LF4011 at $38.99](https://www.amazon.com/TalentCell-LiFePO4-Battery-Rechargeable-Phosphate/dp/B08R1FWW5P). Note the trap — a pack's internal PCM trips at tens of amps, far above the 0.94 A ceiling that protects the gear. **Battery protection is not gear protection.**

---

## 5. Start sequence

Sensored align-and-ramp, then a transition to Hall-based FOC with a hard Iq cap. Guidance from TI SPRABQ3 / SPRABQ7 / SLYP711, ST UM3259 and [Microchip AN1078](https://ww1.microchip.com/downloads/aemDocuments/documents/OTH/ApplicationNotes/ApplicationNotes/01078B.pdf) all converge on the same conclusion for this case: **Hall-sensored FOC with a hard Iq clamp is the only startup path that respects a 0.667 N·m pole-slip limit**, because sensorless schemes must inject current to find the rotor and cannot bound the resulting torque at zero speed.

```
S0  SAFE          shroud closed · e-stop released · GENERATE mode isolated
S1  ARM            drive powered, gates disabled; Iq_max = 0.70 A written and read back
                   → ABORT if read-back ≠ 0.70 A
S2  ALIGN          Hall state read (90 counts/rev); no current injected — position is known
S3  PRECHARGE      supercap charged through 10 Ω; relay bypass after 5τ; boost ramped to 36 V
S4  RAMP           closed-loop speed ramp, α = 108 rad/s² (fast) or 32 rad/s² (panel-only)
                   Iq monitored every cycle; hard trip at 0.90 A → S8
S5  HOLD 100 rpm   dwell 10 s; verify Iq < 0.20 A (proves no slip, no rub)
S6  RAMP → target  continue to 405 rpm HS; shroud interlock now mandatory above 500 rpm
S7  HANDOVER       gates disabled → bus contactor to GENERATE → MG-C1 chain live
S8  TRIP           gates off, bus contactor open, brake resistor across phases, log the frame
```

**Interlock wiring.** Shroud interlock and e-stop in **series into the coil of the bus contactor** — opening the guard or hitting the mushroom removes bus power, it does not merely signal a microcontroller. Use [Omron D4NS-2AF ($82.05)](https://www.newark.com/omron-sti/d4ns-2af/product-range/dp/08R7985) and [Eaton M22-PV/K02 ($58.61)](https://www.newark.com/eaton-moeller/m22-pv-k02/e-stop-sw-dpst-nc-push-pull/dp/09P6127). **Watch the DC rating: the D4NS is 240 V AC / 3 A but only 270 mA at DC** — it is a pilot-duty contact and must never switch the motor bus directly. A plain hobby lever switch is the trap: no positive-break mechanism, not safety-rated.

**SAFE-01 reset semantics** (CBJG `giomj/dev` issue #14) apply unchanged: a trip latches, and clearing it requires a deliberate operator action at the panel, not a software command and not a power cycle.

**RSD (Recursive State Dynamics) is not in the safety path.** RSD may act as an estimator, a fault detector, or a thermal virtual sensor reading the MG-6 channels. It may not gate, arm, trip, or release the starter. The current limit, the interlock chain and the trip comparator are all hardware or firmware primitives that function with RSD absent.

---

## 6. What the starter adds to the risk register

| Risk | Mechanism | Mitigation |
|---|---|---|
| **Pole slip on start** | Drive default current limit is 20–70 A; gear slips at 0.94 A | Iq soft 0.70 A + hardware trip 0.90 A + bus current-limiting element; limit read back before S2 |
| **Magnet demagnetisation** | Slip transient + elevated magnet temperature | Log magnet-pocket temperature to ±1 °C (MG-6); abort above 60 °C |
| Bus overvoltage on handover | Regen from 30 V back-EMF into a 36 V boost output | Gate-disable before contactor transfer; brake resistor; 40 V clamp |
| Boost module reverse input | Common modules lack reverse protection | LM74700 ideal diode at pack input |
| Supercap inrush | ~10 F across a low-impedance pack | Mandatory precharge, 10 Ω / 5τ |
| Fuse fails to interrupt | 32 V automotive fuse on a 36 V bank | 48 VDC-rated device only |
| Overrunning clutch wear (Option B) | Continuous overrun while generating | Oiled hardened shaft; Option A avoids entirely |
| Operator opens shroud while coasting | ~3 s coast-down at design speed | Interlock in contactor coil; consider solenoid-locking [IDEC HS5E ($357.60)](https://www.thermaldevices.com/product/idec-hs5e-kvd005-2b502-safety-switch-with-keylock/) only if coast-down containment is required |

---

## 7. Starter bill of materials (incremental to MG-1 / MG-C1)

| # | Item | Pick | Price USD | Source |
|---|---|---|---|---|
| 1 | 3-phase drive | TMC4671-EVAL (designable 0.7 A limit) | 78.24 | [Newark](https://www.newark.com/trinamic-analog-devices/tmc4671-eval/eval-board-bdc-bldc-stepper-motor/dp/71AH5973) |
| 1b | *alt* turnkey drive | ODrive S1 | 149.00 | [ODrive shop](https://shop.odriverobotics.com/products/odrive-s1) |
| 2 | PV panel, 20 W | Newpowa NPA20S-12J | 39.99 | [Newpowa](https://www.newpowa.com/new-20w-monocrystalline-12v-solar-panel/) |
| 3 | MPPT charger | Genasun GV-5-Li | 99.95 | [GigaParts](https://www.gigaparts.com/genasun-5a-mppt-solar-charge-controller-for-lifepo4-batteries.html) |
| 4 | 12 V LiFePO4 pack | Talentcell LF4011 | 38.99 | [Amazon](https://www.amazon.com/TalentCell-LiFePO4-Battery-Rechargeable-Phosphate/dp/B08R1FWW5P) |
| 5 | Boost 12 → 36 V | Yanmis 400 W module, ASIN B07SJTFG9T (set CV 36 V) | 9.84 | [Amazon](https://www.amazon.com/Voltage-Converter-Step-up-Constant-8-5V-50V/dp/B07SJTFG9T) |
| 6 | Supercap bank | 6× 2.7 V/500 F (DF3556) + 5S balance board (derate 50 %) | 40.38 | [Amazon](https://www.amazon.com/Capacitor-35X60mm-Suitable-Automotive-Rectifiers/dp/B08B16FJQR) |
| 7 | Ideal diode | LM74700QDBVRQ1 | 0.54 | [TI](https://www.ti.com/product/LM74700-Q1) |
| 8 | Precharge | CR5-10-RC 10 Ω 5 W + bypass relay | 0.69 | [Jameco](https://www.jameco.com/z/CR5-10-RC-Jameco-ValuePro-Resistor-Wirewound-10-Ohm-5-5-Watt-plusmn-400ppm-deg-C-Axial-Through-Hole_660375.html) |
| 9 | Bus breaker, 48 VDC | ETA 1610-92-10A | n.a. | [Digi-Key](https://www.digikey.com/en/products/detail/e-t-a/1610-92-10A/509844) |
| 10 | Shroud interlock | Omron D4NS-2AF | 82.05 | [Newark](https://www.newark.com/omron-sti/d4ns-2af/product-range/dp/08R7985) |
| 11 | E-stop | Eaton M22-PV/K02 | 58.61 | [Newark](https://www.newark.com/eaton-moeller/m22-pv-k02/e-stop-sw-dpst-nc-push-pull/dp/09P6127) |
| 12 | *Option B* clutch | CSK12PP | 22.49 | [VXB](https://vxb.com/products/csk12pp-one-way-bearing-with-keyway-sprag-freewhee) |
| 13 | *Option B* starter motor | Pololu 37D 30:1 gearmotor | n.a. | [Pololu](https://www.pololu.com/product/4743) |

**Option A subtotal (items 1–11): $449.28.** Prices marked n.a. could not be confirmed from a fetched vendor page.

---

## 8. Acceptance tests for the starter (feeding MG-6)

| Test | Predicted result | Accept if |
|---|---|---|
| **S-1** Measure Kv on the bare hub motor (drive it, read back-EMF vs speed) | 13.40 rpm/V | within ±10 % — **if not, every current and voltage figure in this document must be recomputed** |
| **S-2** Current-limit read-back | 0.700 A | read-back equals setpoint; drive refuses to exceed 0.90 A into a stall |
| **S-3** Breakaway current, LS shaft free | 0.131 A | < 0.25 A |
| **S-4** Max speed on a 12 V bus (boost bypassed) | 160.8 rpm HS | 145–177 rpm — confirms the boost requirement empirically |
| **S-5** Panel-only ramp to 405 rpm | 1.53 s | < 2.5 s, Iq < 0.35 A throughout |
| **S-6** Fast ramp with supercap | 0.391 s | < 0.6 s, peak bus power 25–35 W, Iq ≤ 0.70 A |
| **S-7** Deliberate overtorque (brake the LS shaft) | trip at 0.90 A before slip | drive trips; **no slip event recorded** |
| **S-8** Interlock: open shroud at 300 rpm | bus power removed, coast-down | contactor drops < 100 ms; SAFE-01 latch requires panel reset |
| **S-9** Handover START → GENERATE at 405 rpm | no bus transient > 40 V | clamp never conducts; USB-PD output comes up |

---

## 9. Open items

1. **Measure Kv first.** Test S-1 gates everything else.
2. Confirm the chosen drive's minimum trustworthy current-sense resolution against 0.7 A — no hobby drive publishes a sense LSB, so this must be measured against the INA228 as a reference.
3. Decide fast vs panel-only ramp. Panel-only is simpler, needs no supercap, and is the recommended V1.
4. Option B parts stay unbought until Gate 3 shows a reason for them.
5. The boost module choice is the weakest sourced line in the BOM — a 36 V CV setting on an over-rated module is functional but not a design; a TPS55340 board is the proper answer.

---

*Every quantitative figure in this document is produced by `starter_verify.py` from the MG-1 verified constants. Component prices and specifications carry the vendor page that states them; "n.a." means no fetched page confirmed the value. No hardware has been built and no figure here has been measured.*

# MG-6 — Instrumentation & Measurement Plan

**Every predicted quantity, the sensor that tests it, and the band it must land in**
CBJG Holdings LLC · Revision 0.1 · Companion to MG-1, MG-2, MG-5 (starter), MG-C1, MG-1Q

---

## 0. Purpose and the one rule

MG-1 was designed as an **instrument**: a three-port torque balance with a frame-grounded modulator reaction arm. This document is the other half of that claim. Without it, MG-1 is a printed curiosity that spins.

**The rule: a prediction that cannot be falsified by a channel listed here is not a prediction, and must be removed from MG-1 rather than defended.**

Gate 4 is contractual. It is not a demonstration that the machine works — it is a test designed to make the machine fail, by deliberately swapping magnet polarities so the modulator harmonic no longer matches. Section 8 shows that failure is predicted to be a **33.06 % torque collapse at 57.7σ** above the measurement uncertainty. If the swapped build performs the same as the correct one, the physics in MG-1 is wrong and the project stops.

### Honest limitations of this plan

- **Nothing here has been measured.** Every "expected value" is a computed prediction from `starter_verify.py` and `sim_verify.py` operating on the MG-1 constants.
- **The eddy-current loss term (0.182 W at the design point) is below the uncertainty of the power-path method with affordable sensors.** Section 6 replaces the power-path method with coast-down for loss separation rather than pretending the resolution exists.
- **Commodity rotary torque sensors quote non-linearity, not total accuracy.** The ATO parts recommended below publish 0.1 % FS non-linearity but also ±2 % FS zero balance and 0.1 % FS/10 °C thermal drift. Real in-use uncertainty sits between the two cases in §5, closer to the 0.5 % case unless you zero and thermally soak before every run.
- **No sub-1 N·m rotary torque sensor is a stock item** from any catalog searched, so 1 N·m FS on a 0.533 N·m shaft (53 % FS) is the best available fit.

---

## 1. Channel list

18 analog channels at 10 kS/s each = 180 kS/s aggregate = 0.36 MB/s at 16-bit = **432 MB per 20-minute Gate 2 run**, 1.30 GB per hour. Trivial storage; the constraint is aggregate DAQ throughput.

| Ch | Quantity | Sensor | Range | Why this range |
|---|---|---|---|---|
| 1 | τ_LS, low-speed shaft torque | ATO TQS-DYN-200-01 rotary, 5 N·m | 0–5 N·m | 2.400 N·m = 48 % FS |
| 2 | τ_HS, high-speed shaft torque | ATO-TQS-D02 rotary, 1 N·m | 0–1 N·m | 0.533 N·m = 53 % FS |
| 3 | **F_react, modulator reaction force** | DwyerOmega LCM703-5 | 0–5 kgf (49 N) | 33.33 N = 68 % FS |
| 4 | n_LS | gear-tooth pickup on modulator poles | 0–200 rpm | 90 rpm nominal |
| 5 | n_HS | gear-tooth pickup / hub-motor Halls (90 counts/rev) | 0–800 rpm | 405 rpm nominal |
| 6 | θ_HS absolute | AS5047P, 14-bit | 360° | 0.022° for ripple phase-locking |
| 7 | θ_LS absolute | AS5047P, 14-bit | 360° | phase reference for the 11-pole harmonic |
| 8 | T_frame | TMP117 | 20–90 °C | Gate 2 limit is 50 °C |
| 9 | **T_magnet pocket, HS rotor** | PT100 + MAX31865 | 20–90 °C | drives the −0.22 %/°C torque term |
| 10 | T_magnet pocket, LS rotor | PT100 + MAX31865 | 20–90 °C | as above |
| 11 | T_bearing housing | TMP117 | 20–90 °C | separates bearing drag from magnetic loss |
| 12 | V_bus | INA228 | 0–85 V | 36 V starter bus, 40 V worst case |
| 13 | I_bus | INA228, 15 mΩ shunt | 0–10 A | **0.70 A limit, 10 µA LSB** |
| 14–16 | Phase V ×3 | resistive dividers into DAQ | ±40 V | 3-phase power computed on the DAQ |
| 17 | Phase I (one phase + reconstruct) | ACS723 low-current breakout | ±5 A | <3 A phase current |
| 18 | Vibration | ADXL343 (or IIS3DWB) | ±2 g, ≥2 kHz | 74.25 Hz fundamental → 22nd harmonic |
| aux | **B_gap, airgap flux density** | Hirst GM08 + TP002SP0.6 probe | 0–3.000 T | 1.113 T predicted; probe must fit 0.80 mm |

DAQ: [MCC USB-1608G, $459](https://microdaq.com/measurement-computing-usb-1608g-data-acquisition-daq.php) — 16 channels, true 16-bit, 250 kS/s aggregate, ±1 V range available for low-level bridge and Hall signals, and first-party [`mcculw`/`uldaq` Python packages](https://digilent.com/reference/software/python-support-for-mccdaq/start). Traps found: the [Digilent Analog Discovery 3](https://digilent.com/shop/analog-discovery-3/) is 14-bit with 2 analog channels despite its Python SDK, and the Waveshare ADS1256 board is 24-bit but only 30 kS/s aggregate — 3.75 kS/s/ch over 8 channels, below spec.

---

## 2. Bandwidth and sample-rate derivation

| Quantity | Value |
|---|---|
| LS rotational frequency | 1.50 Hz |
| HS rotational frequency | 6.75 Hz |
| Ripple fundamental (n_s × f_LS) | 16.50 Hz |
| **Modulation frequency (n_s × f_HS)** | **74.25 Hz** |
| 10th harmonic | 742.5 Hz |
| **Nyquist minimum per channel** | **1.485 kS/s** |
| **Specified per channel** | **10 kS/s** (6.7× margin) |
| Encoder pulse rate, 1024 CPR at 405 rpm | 6.912 kHz |

**Bandwidth trap in the torque channels.** The ATO sensors have a 1 kHz response with 0.6 ms delay — they will roll off the 22nd-harmonic content near 1.63 kHz. If ripple spectroscopy to 2 kHz becomes a hard requirement, only the [burster 8661](https://www.burster.com/fileadmin/user_upload/redaktion/Documents/Products/Data-Sheets/Section_8/8661_EN.pdf) (16-bit internal, TTL angle channels) or a [TorqSense ORT230](https://www.althensensors.com/sensors/torque-sensors/rotating-torque-sensors/ort-230-240-rotating-torque-sensor/) (50 kHz) qualify — both unpriced on their vendor pages. Meanwhile the [NAU7802](https://www.adafruit.com/product/4538) and HX711 bridge amplifiers sample at tens of SPS: fine for mean reaction torque, useless for the 74.25 Hz fundamental, so **the ripple path must go through the USB-1608G, not the bridge breakout.**

---

## 3. Predicted quantity → acceptance band, by gate

### Gate 0 — hand turn (no instrumentation)

| Prediction | Method | Accept if |
|---|---|---|
| Smooth 11-detent-per-LS-revolution cogging | hand | detents countable, no rub, no scrape |
| Gap uniform at 0.80 mm | Meyer Class Z pin gauges | 0.80 mm pin passes everywhere, 0.85 mm nowhere |

### Gate 1 — static pull-out vs gap sweep

| Prediction | Expected | Accept band |
|---|---|---|
| τ_pullout,LS at 0.80 mm | **3.003 N·m** | ±10 % → 2.703–3.303 N·m |
| Arm force at 2.400 N·m | **33.33 N** | ±10 % |
| **Three-port balance residual** | τ_in + τ_out + τ_react = 0 | \|residual\| < 1 % of τ_in = 0.024 N·m |
| Reaction ratio n_s/p_in | **5.5** | 5.45–5.55 |
| τ ratio at gap 0.75 / 0.85 / 0.90 / 1.00 mm | **1.0182 / 0.9823 / 0.9650 / 0.9318** | each within ±2 % of prediction — this is the B² law under test |
| **S-1: hub-motor Kv** | 13.40 rpm/V | ±10 %; **outside this band, re-derive all of MG-5** |

### Gate 2 — spin 100 → 500 rpm, 20 min, no load

| Prediction | Expected | Accept band |
|---|---|---|
| Frame temperature rise | < 50 °C absolute | T_frame < 50 °C at 20 min |
| No-load drag torque, LS | 0.12 N·m | 0.09–0.15 N·m |
| Hysteresis loss at 3000 Hz f_mod | 7.0 W, **linear in f** | slope within ±20 % over the sweep |
| Eddy loss at 3000 Hz f_mod | 10.0 W, **quadratic in f** | exponent 1.7–2.3 on a log-log fit |
| Vibration: dominant line at n_s × f_HS | 74.25 Hz at 405 rpm | peak within ±1 % of f_mod; no line above 0.5 g |
| Bearing housing rise vs frame | bearing warmer if drag is mechanical | used to attribute the 0.12 N·m term |

### Gate 3 — loaded efficiency map

| Prediction | Expected at 90 rpm / 2.4 N·m | Accept band |
|---|---|---|
| P_in | **22.619 W** | ±1.4 % (see §5) |
| P_out | **20.361 W** | ±1.4 % |
| **η_gear** | **90.02 %** | see §5 — ±1.26 points with commodity sensors |
| P_loss total | **2.258 W** | ±0.303 W commodity / ±0.061 W lab class |
| — drag component | 1.131 W | from Gate 2 coast-down |
| — hysteresis component | 0.945 W | linear-in-f fit |
| — **eddy component** | **0.182 W** | **not resolvable at this point — see §6** |
| Magnet pocket temperature | < 60 °C | abort above 60 °C |
| USB-PD output power (MG-C1 chain) | 12.04 W | ±5 % |
| Overall chain efficiency | 53.2 % | ±3 points |

### Gate 4 — falsification (magnets deliberately swapped)

| Prediction | Expected | Accept band |
|---|---|---|
| τ_pullout,LS with one adjacent pair swapped | **2.010 N·m** (0.6694 × nominal) | measured drop of 28–38 % |
| Arm force | **22.31 N** vs 33.33 N nominal | drop ≥ 8 N |
| Signal-to-uncertainty ratio | **57.7σ** | unmistakable |
| Alternative degenerate pattern | torque_rel 0.2066 | if tested, ≥ 70 % collapse |

**If the swapped build measures within 10 % of the correct build, MG-1 is falsified.** That outcome is a legitimate result and must be published in the project record, not buried.

---

## 4. The airgap flux probe — the one item where physics, not price, is the constraint

The MG-1 gap is **0.80 mm**. Most catalog "transverse" Hall probes physically cannot enter it.

| Probe | Thickness | Fits 0.80 mm? | Price |
|---|---|---|---|
| [Hirst TP002SP0.6](https://www.gaussmeter.co.uk/TP002SP0.6-extra-slim-transverse-probe) | **0.6 mm** | **YES** — page states "for gaps less than 1 mm" | £445 + VAT |
| [Magnetic Sciences STD310-UL0.020](https://magneticsciences.com/ultra-thin-probe-020/) | **0.5 mm** | **YES** (special order ~1 week) | $500 |
| Standard TP002 bundled with the [Hirst GM08](https://www.gaussmeter.co.uk/GM08-Gaussmeter) | 1.0 mm | **NO** | included |
| [Lake Shore HMMT / HMNT transverse](https://www.lakeshore.com/products/product-detail/hall-probes/transverse-specifications) | 1.14–1.55 mm | **NO — all of them** | n.a. |
| [AlphaLab GM2PROBESTST](https://www.alphalabinc.com/products/gm2probestst/) "extra thin" | **not published** | **UNQUALIFIED** — verify before trusting | $203 (+ $902 meter) |
| [AKM HQ-0A11](https://www.mouser.com/new/asahi-kasei-microdevices/akm-hq-0a11-element/) InAs element | **0.23 mm** | **YES — mountable on flex inside the gap** | n.a. ($0.69 @1k for HQ-0111) |
| [AKM HG302C](https://www.akm.com/us/en/products/hall-sensor/hall-element/ga-as-low-drift/hg302c/) | 0.95 mm | **NO** | n.a. |
| [MLX90393 3-axis](https://www.adafruit.com/product/4022) | — | saturates at ±50 mT = **4.5 % of 1.113 T** | $9.95 |

**Recommendation.** [Hirst GM08 meter (£780) + TP002SP0.6 probe (£445)](https://www.gaussmeter.co.uk/GM08-Gaussmeter): 3.000 T range, better than ±0.5 % system accuracy, ±0.1 % repeatability, NPL traceability ±0.8 %, DC-to-10 kHz AC modes, and a linearised analog output that can be logged on the DAQ to capture the **gap-flux waveform at 74.25 Hz** — which is the direct experimental test of the modulator harmonic, not just its consequence.

**You must order the SP0.6 probe explicitly.** The probe bundled with the meter is 1 mm thick and will not fit.

Second path, for permanent instrumentation: bond **AKM HQ-0A11 elements (0.23 mm) on polyimide flex inside the gap** with an instrumentation amplifier outside. That gives continuous B_gap logging during Gate 2/3 rather than a static spot measurement — but it consumes 0.23 mm of a 0.80 mm gap, which by the §7 sensitivity is a **~8 % torque reduction at that location**. Instrument one sector only, and correct for it.

Use the MLX90393 for **stray-field mapping outside the machine** (the electromagnetic-impact question from MG-1Q), never for gap flux. The reference-grade [Metrolab THM1176 at $7,930](https://gmw.com/product/thm1176/) is technically ideal and 2.6× the entire instrumentation budget.

---

## 5. Uncertainty budget for efficiency

Per-channel contributions, expressed as **% of reading at the operating point** (the number that matters — a %FS spec looks better than it performs):

| Channel | Spec | % of reading |
|---|---|---|
| Rotary 5 N·m FS, 0.5 % FS class, on 2.400 N·m | 0.5 % FS | 1.042 % |
| Rotary 5 N·m FS, 0.1 % FS class | 0.1 % FS | 0.208 % |
| Rotary 1 N·m FS, 0.5 % FS class, on 0.533 N·m | 0.5 % FS | 0.938 % |
| Rotary 1 N·m FS, 0.1 % FS class | 0.1 % FS | 0.188 % |
| **Rotary 20 N·m FS on 2.400 N·m** | 0.5 % FS | **4.167 % — the over-ranging trap** |
| Load cell 50 N FS, 0.05 % FS, on 33.33 N | 0.05 % FS | 0.075 % |
| Load cell 100 N FS, 0.10 % FS | 0.10 % FS | 0.300 % |
| Load cell 200 N FS, 0.10 % FS | 0.10 % FS | 0.600 % |
| Speed, gated encoder | — | 0.020 % |
| **Arm length, ±0.5 mm on 88 mm** | — | **0.568 %** |

### Propagated results

| Case | u(η) | η reported as | u(P_loss) | Eddy term (0.182 W) |
|---|---|---|---|---|
| **A** — two commodity 0.5 % FS rotary sensors | 1.40 % rel | **90.0 ± 1.26 points** | 0.303 W = **13.4 %** of loss | **NOT resolvable** |
| **B** — two lab-grade 0.1 % FS rotary sensors | 0.28 % rel | **90.0 ± 0.25 points** | 0.061 W = 2.7 % of loss | **resolvable** |

### The finding worth acting on: measure the arm

| Reaction-torque channel | u(τ_react) | in N·m |
|---|---|---|
| 50 N cell at 0.05 % FS, **arm known to ±0.5 mm** | 0.573 % | 16.8 mN·m |
| Same cell, **arm known to ±0.05 mm** | **0.094 %** | **2.76 mN·m** |

**The arm length, not the load cell, is the dominant error in the reaction channel.** With a caliper measurement of the moment arm to ±0.05 mm, the reaction channel becomes **2.0× more accurate than the best affordable rotary sensor** — and it is a $15–$347 channel against $914 per rotary sensor. Measure the arm carefully and the cheapest port becomes the reference port.

**Load-cell traps.** [FUTEK LSB200 tops out at 250 g](https://www.futek.com/store/load-cells/s-beam-load-cells/miniature-s-beam-lsb200) — two orders of magnitude below 33 N, despite being the obvious search hit. The [SparkFun TAL220B at $15.50](https://www.sparkfun.com/load-cell-5kg-straight-bar-tal220b.html) is a legitimate second channel or pre-commissioning stand-in, but it publishes **no accuracy class at all**, so no torque uncertainty can be stated from it. The [DwyerOmega LCM703-5](https://www.dwyeromega.com/en-us/miniature-low-profile-tension-compression-load-cells/p/LC703) is the metrology pick — published hysteresis ±0.15 % FSO, repeatability ±0.05 % FSO and thermal coefficients, which matter because you also need ripple superimposed on a 33 N mean.

**Torque-sensor trap.** [FUTEK TRS300 starts at 10 N·m](https://www.futek.com/store/torque-sensors/shaft-to-shaft-rotary-torque-sensors/slip-ring-shaft-to-shaft-rotary-TRS300) — 5 % of FS at 0.533 N·m, useless here. The [Interface T28 at $3,670](https://www.interfaceforce.com/products/torque-transducers/rotary/t28-slip-ring-square-drive-rotary-torque-transducer-with-integrated-speed-angle/) consumes the whole budget for one channel.

**3-phase power.** A genuinely better-than-1 % instrument for a <50 W, 74.25 Hz load means a [Yokogawa WT332E at $5,240](https://tmi.yokogawa.com/us/solutions/products/power-analyzers/digital-power-meter-wt300e/) — 1.75× the entire instrumentation budget. **Compute 3-phase power on the USB-1608G** (three divided voltage channels + phase current) and treat the result as ~2 % class, or borrow a WT310E for a one-time cross-check.

---

## 6. Loss separation: coast-down is the primary method

The power-path method (P_in − P_out) cannot see the eddy term at the design point. At what speed does it become visible?

| n_LS | n_HS | Eddy loss | u(P_loss), 0.5 % FS | Resolvable? |
|---|---|---|---|---|
| 90 rpm | 405 | 0.182 W | 0.303 W | no |
| 150 | 675 | 0.506 W | 0.504 W | no |
| 250 | 1125 | 1.406 W | 0.837 W | no |
| **400** | **1800** | **3.600 W** | **1.332 W** | **yes** |
| 600 | 2700 | 8.100 W | 1.982 W | yes |
| 900 | 4050 | 18.225 W | 2.939 W | yes |

Two consequences: (a) the **eddy-loss speed sweep must run to ≥400 rpm LS**, which is 4.4× the design speed and requires the PC burst shroud interlocked above 500 rpm; and (b) at the design point a different method is needed.

### Coast-down (J·dω/dt)

| Quantity | Value |
|---|---|
| Loss torque referred to HS | **53.25 mN·m** |
| Coast-down time from 405 rpm HS | **2.98 s** |
| Mean deceleration | 14.22 rad/s² |
| u(τ_loss) if J known to 2 % | **2.1 % = 1.10 mN·m** (2.24 % = 1.19 mN·m once a 1 % speed-fit term is added, as the workbook does) |
| u(τ_loss) if J known to 5 % | 5.0 % = 2.68 mN·m |
| u(τ_loss) if J known to 10 % | 10.0 % = 5.33 mN·m |

**Coast-down with J known to 2 % beats the commodity power-path method by 6× and matches the lab-grade method** — using only an encoder and a known inertia. It is therefore the **primary loss-separation method**, with the rotary sensors serving as the power-path cross-check rather than the primary instrument.

The cost moves from sensors to knowing J. Weigh every rotating part, compute J from the CAD, and verify by **bifilar-pendulum period measurement** on each rotor. 2 % on J is achievable; 10 % is what you get from CAD alone with printed-part density uncertainty.

Coast-down is also fast — 2.98 s — so log at the full 10 kS/s and fit dω/dt over windows, not endpoints.

---

## 7. What the sensors must resolve

### Magnet temperature

Torque scales as B², and NdFeB remanence falls at −0.11 %/°C:

| ΔT | Torque change |
|---|---|
| +1 °C | **−0.220 %** |
| +10 °C | −2.188 % |
| +30 °C | **−6.491 %** |

To keep the temperature contribution below the 0.1 % level, magnet temperature must be known to **±0.5 °C**; ±1 °C contributes 0.22 %, comparable to the best torque channel.

This is a ±0.1 °C-class problem, not a thermocouple problem. [TMP117 boards ($11.50)](https://www.adafruit.com/product/4821) are specified **±0.1 °C from −20 to +50 °C** — exactly the band of interest, with a first-party Python library. Use [MAX31865 + PT100 ($26.90 together)](https://www.adafruit.com/product/3328) where a sheathed probe must go into a printed pocket near the magnets (probe itself ±0.5 °C from −10 to +85 °C).

**Trap: a K-type thermocouple chain is disqualified.** The [MAX31855K](https://www.adafruit.com/product/269) resolves 0.25 °C but the K-type junction itself carries ±2–6 °C — i.e. **0.44 % to 1.3 % torque uncertainty**, worse than every torque channel in §5. Amplifier resolution is not accuracy.

### Airgap

| Gap | Torque factor |
|---|---|
| 0.75 mm | 1.0182 |
| **0.80 mm (nominal)** | **1.0000** |
| 0.85 mm | 0.9823 |
| 0.90 mm | 0.9650 |
| 1.00 mm | 0.9318 |

Sensitivity **dτ/dgap = −0.3596 per mm**, so **1 % torque = 27.8 µm of gap.**

| Tool | Resolution | In torque terms |
|---|---|---|
| [Starrett 66MA feeler set ($99)](https://www.travers.com/product/starrett-66ma-feeler-gage-set-57-065-501), 0.05 mm steps | 50 µm | 1.80 % |
| [Mitutoyo 2046S dial indicator](https://www.turnersupply.com/Product/039120465), 0.01 mm | 10 µm | 0.36 % |
| **[Meyer Class Z metric pin set ($145.70)](https://www.higherprecision.com/brands/meyer-gage-company/meyer-gage-pin-gages)**, ±0.0025 mm | **2.5 µm** | **0.09 %** |

**The Class Z pin set is the gap datum**, not the feeler gauges: 0.09 % in torque terms, an order of magnitude better than the best torque channel, and pins do not scratch a printed bore the way leaves do. Class **ZZ** pins (±0.005 mm) double the uncertainty; inch-only sets in 0.001″ steps cannot land cleanly near 0.80 mm. A 0.001 mm DTI is required only if you want to resolve gap *variation* better than 1 %.

### Angle

[AS5047P at $7.30](https://www.newark.com/ams-osram-group/as5047p-atsm/magnetic-position-sensor-5-5v/dp/86AK7263) on each shaft: 14-bit (0.022°) absolute, explicitly stray-field immune — which matters 100 mm from a 1.113 T gap. **The popular AS5600 is 12-bit** and does not meet spec; and any on-axis magnetic IC without stray-field immunity, mounted unshielded, will read the machine's leakage field instead of its own target magnet. [AMT102-V at $27.50](https://www.sameskydevices.com/product/motion-and-control/rotary-encoders/incremental/amt102-v) set to 2048 PPR is the captive-kit alternative with no magnet to glue. Do **not** spend $862 on an [Omron E6B2](https://www.newark.com/omron-industrial-automation/e6b2-cwz6c-1000p-r-0-5m/encoder-incremental-1000ppr-6000rpm/dp/63H2606) for a speed-only channel — at 90–405 rpm a gear-tooth or reflective pickup on a many-tooth target is better value per degree.

For speed, a [Honeywell 1GT101DC-class gear-tooth sensor](https://www.newark.com/honeywell/1gt101dc/hall-effect-magnetic-sensor/dp/92F3009) reading the steel modulator poles is preferred over a variable-reluctance pickup, because its output amplitude does not fade at 90 rpm. The [QRE1113 breakout at $4.08](https://www.sparkfun.com/sparkfun-line-sensor-breakout-qre1113-analog.html) is the fastest thing to bolt on but needs reflective tape and a threshold comparator.

### Bus current

[INA228 at $14.95](https://www.adafruit.com/product/5832): **85 V bus rating** covers a 36–40 V starter bus, 10 A high-current mode with a 15 mΩ shunt, 20-bit, 10 µA LSB — which is 1.4×10⁻⁵ of the 0.70 A limit, so the MG-5 current limit can be verified independently of the drive's own sensing. **[INA219 is the trap: its 26 V bus ceiling is below the 40 V worst case](https://www.adafruit.com/product/904)** and it will clip or fail at the top of the envelope.

### Thermal imaging

[InfiRay P2 Pro at $249](https://www.xinfrared.com/products/infiray_p2_pro_thermal_camera): 256×192 at 12 µm pitch, ±2 °C or ±2 % of reading, and the magnetic macro lens resolves individual magnet poles — 4× the pixels of a [FLIR C5 at $649](https://www.flir.com/products/c5/) with better stated accuracy, at 38 % of the price. Keep a [Fluke 62 MAX+](https://www.fluke.com/en-us/product/temperature-measurement/ir-thermometers/fluke-62-max-plus) (±1 °C of reading) as the traceable spot check on the 50 °C frame limit. **Every IR reading is emissivity-dependent** — matte tape on bare aluminium and nickel-plated magnets, or the reading will be tens of degrees low. Contact sensors remain the limit-monitoring channel of record.

---

## 8. Falsification detectability (Gate 4)

| Magnet pattern | torque_rel | τ_pullout,LS | Arm force |
|---|---|---|---|
| As-built `1010101010101010101010` | 1.0000 | 3.003 N·m | 33.33 N |
| **One adjacent pair swapped** `0110101010101010101010` | **0.6694** | **2.010 N·m** | **22.31 N** |
| Degenerate alternative | 0.2066 | 0.620 N·m | 6.89 N |

Predicted drop: **33.06 %**, i.e. **11.02 N** on the reaction arm against a channel uncertainty of ~0.19 N — a **57.7σ** signal. There is no plausible instrumentation configuration in which this test is ambiguous, which is exactly the property a falsification test must have.

---

## 9. Safety instrumentation

Guard interlock and e-stop are covered in MG-5 §5: [Omron D4NS-2AF ($82.05)](https://www.newark.com/omron-sti/d4ns-2af/product-range/dp/08R7985) and [Eaton M22-PV/K02 ($58.61)](https://www.newark.com/eaton-moeller/m22-pv-k02/e-stop-sw-dpst-nc-push-pull/dp/09P6127), both wired 2× NC in series into the bus-contactor coil. **The D4NS is rated 3 A at 240 V AC but only 270 mA at DC** — pilot duty only, never the motor bus. A plain hobby lever switch has no positive-break mechanism and is not a safety interlock. [IDEC HS5E ($357.60)](https://www.thermaldevices.com/product/idec-hs5e-kvd005-2b502-safety-switch-with-keylock/) adds solenoid locking if you decide the 3 s coast-down must be contained.

**PC burst shroud interlocked above 500 rpm** is mandatory for the §6 eddy sweep to 400 rpm LS / 1800 rpm HS. **RSD may read every channel here and may not gate any of them.**

---

## 10. Budget

From the companion workbook (`MG-6_sensor_procurement.xlsx`), priced lines total **$4,629.33**, plus 8.25 % tax and a $250 shipping allowance = **$5,261.25**. That figure **overstates the real spend** because competing alternates sit on separate rows (TMC4671-EVAL vs ODrive S1, TAL220B vs LCM703-5, AS5047P vs AMT102-V, Hirst vs Magnetic Sciences probe) — set the quantity of any rejected option to 0 and the subtotals correct themselves.

By stage: **Stage 1 $867.13 · Stage 2 $1,039.70 · Stage 3 $2,222.50 · Stage 4 $500** (excluding the GBP-priced Hirst items, £780 + £445 ex-VAT). The gaussmeter is the one line that cannot be substituted downward, because the 0.80 mm gap rules out every cheaper probe.

Staging recommendation:

| Stage | Buy | Enables |
|---|---|---|
| **1** | pin gauges, feeler set, dial indicator, TAL220B + NAU7802, TMP117 ×3, DAQ | Gates 0–1, three-port balance, gap sweep |
| **2** | INA228, AS5047P ×2, gear-tooth pickups, ADXL343 ×3, PT100 + MAX31865 | Gate 2, coast-down loss method, starter tests S-1 to S-9 |
| **3** | LCM703-5 metrology load cell, two ATO rotary sensors | Gate 3 power-path cross-check |
| **4** | Hirst GM08 + TP002SP0.6 | direct B_gap verification, MG-1Q field claims |

**Stages 1–2 are sufficient to run Gates 0, 1, 2 and 4 and to commission the MG-5 starter.** Gate 4 — the falsification test, the most important measurement in the project — needs only the reaction load cell, a caliper-measured arm, and pin gauges. Buy stage 1 first.

---

*All predicted values derive from `starter_verify.py` and `sim_verify.py` operating on the MG-1 verified constants. Every component specification and price carries the vendor page that states it; "n.a." means no fetched page confirmed the value. No hardware has been built and no value in this document has been measured.*

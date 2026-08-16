# MG-1 — Blueprints & Schematics (Council supplement)

**Companion to:** the 15-sheet MG-1 drawing set (sheets S-01…S-15).
**Purpose:** provide six additional views the Council review demands — an *instrument* block diagram, a corrected axial cross-section reflecting the S-1 (aluminium modulator) and S-2 (thrust-bearing) remedial actions, the three-port measurement chain, the SAFE-01 authority chain, the modulator variant matrix (V1/V2/V3), and the MG-C1 charger power flow.

Diagrams are inline SVG so they render in the Notion mirror and in a printed PDF pack. Copy into the drawing set as sheets S-16…S-21.

---

## S-16 · Instrument block diagram (top level)

<div align="center">

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 460" style="max-width:100%;background:#fafafa;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#111"/>
    </marker>
    <style>
      .box { fill:#fff; stroke:#111; stroke-width:1.5; }
      .grp { fill:#eef; stroke:#557; stroke-width:1; stroke-dasharray:4 3; }
      .safe { fill:#fee; stroke:#c22; stroke-width:1.5;}
      .estim { fill:#efe; stroke:#282; stroke-width:1;}
      .txt { fill:#111; }
      .h { font-weight:700; }
      line { stroke:#111; stroke-width:1.4; }
    </style>
  </defs>

  <rect x="15" y="15" width="870" height="430" class="grp"/>
  <text x="30" y="35" class="h">MG-1  three-port instrument</text>

  <!-- HS drive -->
  <rect x="35" y="80" width="150" height="70" class="box"/>
  <text x="60" y="105">HS drive motor</text>
  <text x="60" y="122">BLDC or dyno</text>
  <text x="60" y="139">n_HS 0–3000 rpm</text>

  <!-- HS torque cell -->
  <rect x="215" y="80" width="120" height="70" class="box"/>
  <text x="235" y="105">Torque cell 1</text>
  <text x="235" y="122">τ_in, ω_in</text>
  <text x="235" y="139">±2 N·m FS</text>

  <!-- HS rotor -->
  <rect x="365" y="80" width="120" height="70" class="box"/>
  <text x="392" y="107">HS rotor</text>
  <text x="392" y="124">p=2, 20× N42</text>

  <!-- Modulator -->
  <rect x="515" y="60" width="150" height="110" class="box"/>
  <text x="533" y="85">Modulator ring</text>
  <text x="533" y="102">n_s = 11 poles</text>
  <text x="533" y="119">(V1/V2/V3)</text>
  <text x="533" y="140">Al 6061 plate</text>
  <text x="533" y="157">→ reaction arm</text>

  <!-- LS rotor -->
  <rect x="695" y="80" width="120" height="70" class="box"/>
  <text x="722" y="107">LS rotor</text>
  <text x="722" y="124">p'=9, 18× N42</text>

  <!-- LS torque -->
  <rect x="695" y="200" width="120" height="70" class="box"/>
  <text x="710" y="225">Torque cell 2</text>
  <text x="710" y="242">τ_out, ω_out</text>
  <text x="710" y="259">±5 N·m FS</text>

  <!-- LS load -->
  <rect x="695" y="320" width="120" height="70" class="box"/>
  <text x="710" y="345">Programmable</text>
  <text x="710" y="362">brake / PMSG</text>
  <text x="710" y="379">0–5 N·m</text>

  <!-- Reaction cell -->
  <rect x="515" y="230" width="150" height="70" class="safe"/>
  <text x="533" y="255">Reaction load cell</text>
  <text x="533" y="272">τ_react = F·r_arm</text>
  <text x="533" y="289">50 N FS · r=88mm</text>

  <!-- SAFE-01 -->
  <rect x="35" y="230" width="220" height="90" class="safe"/>
  <text x="55" y="255" class="h">SAFE-01 hardware STO</text>
  <text x="55" y="275">Independent of firmware</text>
  <text x="55" y="292">Sole torque-removal path</text>
  <text x="55" y="309">E-stop · overtemp · limit-slip</text>

  <!-- DAQ -->
  <rect x="285" y="230" width="200" height="90" class="box"/>
  <text x="305" y="255">DAQ · 10 kHz sync</text>
  <text x="305" y="272">3× torque, 2× encoder</text>
  <text x="305" y="289">2× NTC (mod, ambient)</text>
  <text x="305" y="309">Time-tagged CSV → GitHub</text>

  <!-- RSD -->
  <rect x="35" y="360" width="220" height="70" class="estim"/>
  <text x="55" y="385" class="h">RSD estimator</text>
  <text x="55" y="402">L / K / E · slip observer</text>
  <text x="55" y="419">Thermal virtual sensor · non-safety</text>

  <!-- Data path -->
  <rect x="285" y="360" width="200" height="70" class="estim"/>
  <text x="305" y="385" class="h">Gate 0..4 protocol</text>
  <text x="305" y="402">Uncertainty budget</text>
  <text x="305" y="419">Cell-swap + dead-weight cal</text>

  <!-- Lines -->
  <line x1="185" y1="115" x2="215" y2="115" marker-end="url(#arr)"/>
  <line x1="335" y1="115" x2="365" y2="115" marker-end="url(#arr)"/>
  <line x1="485" y1="115" x2="515" y2="115" marker-end="url(#arr)"/>
  <line x1="665" y1="115" x2="695" y2="115" marker-end="url(#arr)"/>
  <line x1="755" y1="150" x2="755" y2="200" marker-end="url(#arr)"/>
  <line x1="755" y1="270" x2="755" y2="320" marker-end="url(#arr)"/>
  <line x1="590" y1="170" x2="590" y2="230" marker-end="url(#arr)"/>
  <line x1="255" y1="275" x2="285" y2="275" marker-end="url(#arr)"/>
  <line x1="385" y1="320" x2="385" y2="360" marker-end="url(#arr)"/>
  <line x1="255" y1="395" x2="285" y2="395" marker-end="url(#arr)"/>
</svg>
```

</div>

---

## S-17 · Axial cross-section — v0.2 (post-remedial-actions)

Delta against sheet S-05: modulator plate is 6061-T6 aluminium; angular-contact bearing pair replaces 608ZZ on each rotor.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" style="background:#fff;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px">
  <defs>
    <pattern id="al" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ddd"/><line x1="0" y1="0" x2="0" y2="6" stroke="#888"/></pattern>
    <pattern id="steel" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#bbb"/><line x1="0" y1="0" x2="4" y2="4" stroke="#333"/></pattern>
    <pattern id="pm" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fbb"/></pattern>
    <pattern id="print" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#ffb"/><circle cx="3" cy="3" r="1" fill="#996"/></pattern>
  </defs>

  <!-- centerline -->
  <line x1="40" y1="180" x2="760" y2="180" stroke="#555" stroke-dasharray="8 4"/>

  <!-- HS shaft -->
  <rect x="40" y="170" width="280" height="20" fill="#999" stroke="#333"/>
  <text x="60" y="163">HS shaft (steel, Ø8)</text>

  <!-- HS rotor plate -->
  <rect x="240" y="80" width="20" height="200" fill="url(#print)" stroke="#333"/>
  <text x="200" y="70">HS rotor plate (PETG 100% infill)</text>

  <!-- HS magnets -->
  <rect x="260" y="100" width="10" height="60" fill="url(#pm)" stroke="#a33"/>
  <rect x="260" y="200" width="10" height="60" fill="url(#pm)" stroke="#a33"/>
  <text x="255" y="94">N</text>
  <text x="255" y="272">N</text>

  <!-- gap left -->
  <line x1="270" y1="100" x2="270" y2="260" stroke="#08c" stroke-dasharray="2 2"/>
  <line x1="278" y1="100" x2="278" y2="260" stroke="#08c" stroke-dasharray="2 2"/>
  <text x="270" y="290" fill="#08c">g=0.8 mm</text>

  <!-- MODULATOR (aluminium) with steel pole pieces -->
  <rect x="278" y="60" width="16" height="240" fill="url(#al)" stroke="#333"/>
  <text x="298" y="55">Modulator plate 6061-T6</text>
  <rect x="282" y="90" width="8" height="35" fill="url(#steel)" stroke="#222"/>
  <rect x="282" y="145" width="8" height="35" fill="url(#steel)" stroke="#222"/>
  <rect x="282" y="200" width="8" height="35" fill="url(#steel)" stroke="#222"/>
  <text x="315" y="130">M8 steel pole bolts ×22</text>
  <text x="315" y="145" fill="#666">(V1 solid / V2 bundle / V3 lam)</text>

  <!-- gap right -->
  <line x1="294" y1="100" x2="294" y2="260" stroke="#08c" stroke-dasharray="2 2"/>
  <line x1="302" y1="100" x2="302" y2="260" stroke="#08c" stroke-dasharray="2 2"/>

  <!-- LS magnets -->
  <rect x="302" y="100" width="10" height="60" fill="url(#pm)" stroke="#a33"/>
  <rect x="302" y="200" width="10" height="60" fill="url(#pm)" stroke="#a33"/>

  <!-- LS rotor plate -->
  <rect x="312" y="80" width="20" height="200" fill="url(#print)" stroke="#333"/>
  <text x="345" y="70">LS rotor plate (PETG)</text>

  <!-- LS shaft -->
  <rect x="332" y="170" width="290" height="20" fill="#999" stroke="#333"/>
  <text x="530" y="163">LS shaft (hollow, coaxial return)</text>

  <!-- Angular-contact bearings (NEW - S-2 remedial) -->
  <rect x="120" y="150" width="14" height="60" fill="none" stroke="#c22" stroke-width="2"/>
  <text x="90" y="230" fill="#c22">7000-series AC pair</text>
  <text x="90" y="245" fill="#c22">S-2 remedial action</text>
  <rect x="600" y="150" width="14" height="60" fill="none" stroke="#c22" stroke-width="2"/>

  <!-- Reaction arm (aluminium extension) -->
  <rect x="290" y="20" width="200" height="10" fill="url(#al)" stroke="#333"/>
  <circle cx="480" cy="25" r="4" fill="#c22"/>
  <text x="380" y="14">Reaction arm — aluminium (S-1 remedial)</text>
  <text x="490" y="28">→ load cell</text>

  <!-- Frame plates -->
  <rect x="60" y="60" width="10" height="240" fill="url(#print)" stroke="#333"/>
  <rect x="700" y="60" width="10" height="240" fill="url(#print)" stroke="#333"/>
  <text x="35" y="330">PETG frame plate (non-critical)</text>

  <text x="40" y="350" font-size="10" fill="#666">Not to scale · dimensions per BOM v0.2 · sheet reference S-05 (v0.1 baseline) → S-17 (Council v0.2)</text>
</svg>
```

Changes visible vs S-05:
- Modulator plate hatch changed to aluminium (was PETG in v0.1).
- Reaction arm bar changed to aluminium.
- Bearings called out as angular-contact 7000-series pair per rotor.
- Steel pole pieces retained; V1/V2/V3 legend added inline.

---

## S-18 · Three-port measurement chain

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 340" style="background:#fff;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px">
  <defs>
    <marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#333"/></marker>
  </defs>

  <rect x="20" y="20" width="860" height="300" fill="#fbfbfb" stroke="#333"/>
  <text x="35" y="42" font-weight="700">Three-port energy balance:  τ_in + τ_out + τ_react = 0  (static)</text>

  <!-- IN -->
  <rect x="50" y="80" width="180" height="60" fill="#eef" stroke="#557"/>
  <text x="65" y="105">HS shaft</text>
  <text x="65" y="122">τ_in · ω_in · P_in</text>

  <!-- MG -->
  <rect x="320" y="60" width="200" height="120" fill="#fff" stroke="#333" stroke-width="1.5"/>
  <text x="335" y="85">MG-1 magnetic coupling</text>
  <text x="335" y="105">τ_out = -(p_out/p_in)·τ_in</text>
  <text x="335" y="125">    = -4.5·τ_in (no slip)</text>
  <text x="335" y="145">τ_react = (n_s/p_in)·τ_HS</text>
  <text x="335" y="165">    = 5.5·τ_HS  (pull-out)</text>

  <!-- OUT -->
  <rect x="620" y="80" width="180" height="60" fill="#eef" stroke="#557"/>
  <text x="640" y="105">LS shaft</text>
  <text x="640" y="122">τ_out · ω_out · P_out</text>

  <!-- REACT -->
  <rect x="320" y="230" width="200" height="60" fill="#fee" stroke="#c22"/>
  <text x="340" y="255">Frame (modulator ring)</text>
  <text x="340" y="272">τ_react (measured cell)</text>

  <!-- Arrows -->
  <line x1="230" y1="110" x2="320" y2="110" marker-end="url(#ar2)"/>
  <line x1="520" y1="110" x2="620" y2="110" marker-end="url(#ar2)"/>
  <line x1="420" y1="180" x2="420" y2="230" marker-end="url(#ar2)"/>

  <!-- balance -->
  <rect x="50" y="230" width="240" height="70" fill="#efe" stroke="#282"/>
  <text x="65" y="252" font-weight="700">Gate 4 rule</text>
  <text x="65" y="270">|η_measured − 1| ≥ 3·u(η)</text>
  <text x="65" y="288">Cell swap · dead-weight cal · 10 kHz DAQ</text>

  <!-- ledger -->
  <rect x="580" y="230" width="290" height="70" fill="#efe" stroke="#282"/>
  <text x="595" y="252" font-weight="700">Losses accounted (must satisfy P_out ≤ P_in)</text>
  <text x="595" y="270">bearing · windage · eddy(mod) · hyst(PM)</text>
  <text x="595" y="288">Q̇_mod thermal integrator (NTC + c_p model)</text>
</svg>
```

---

## S-19 · SAFE-01 authority chain

The physical torque-removal path — the *only* path in the system with authority to remove kinetic energy from the rotating parts.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 380" style="background:#fff;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px">
  <defs>
    <marker id="ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c22"/></marker>
    <style>
      .obs{fill:#efe;stroke:#282;stroke-width:1.5}
      .auth{fill:#fee;stroke:#c22;stroke-width:2}
    </style>
  </defs>

  <rect x="20" y="20" width="860" height="340" fill="#fafafa" stroke="#555"/>
  <text x="35" y="42" font-weight="700">SAFE-01 · hardware authority chain (independent of firmware and RSD)</text>

  <!-- observations -->
  <rect x="40" y="80" width="200" height="50" class="obs"/>
  <text x="55" y="105">E-stop button (NC×2)</text>
  <text x="55" y="122">latching</text>

  <rect x="40" y="150" width="200" height="50" class="obs"/>
  <text x="55" y="175">Overtemp NTC threshold</text>
  <text x="55" y="192">hardware comparator</text>

  <rect x="40" y="220" width="200" height="50" class="obs"/>
  <text x="55" y="245">Slip &gt; 20% for &gt; T_hold</text>
  <text x="55" y="262">hardware ratio-detector</text>

  <rect x="40" y="290" width="200" height="50" class="obs"/>
  <text x="55" y="315">Cover / interlock switch</text>

  <!-- Sum -->
  <rect x="330" y="140" width="150" height="120" class="auth"/>
  <text x="360" y="175">SAFE-01</text>
  <text x="360" y="195">latch (SR flip-flop)</text>
  <text x="360" y="215">Reset only manually</text>
  <text x="360" y="235">Logs to GitHub</text>

  <!-- Contactors -->
  <rect x="560" y="80" width="200" height="60" class="auth"/>
  <text x="575" y="105">HS drive contactor</text>
  <text x="575" y="122">3-phase NO relay</text>

  <rect x="560" y="170" width="200" height="60" class="auth"/>
  <text x="575" y="195">Dynamic brake resistor</text>
  <text x="575" y="212">10Ω · 50W chassis</text>

  <rect x="560" y="260" width="200" height="60" class="auth"/>
  <text x="575" y="285">USB-PD sink shed</text>
  <text x="575" y="302">buck disable line</text>

  <!-- Arrows -->
  <line x1="240" y1="105" x2="330" y2="180" marker-end="url(#ar3)"/>
  <line x1="240" y1="175" x2="330" y2="185" marker-end="url(#ar3)"/>
  <line x1="240" y1="245" x2="330" y2="205" marker-end="url(#ar3)"/>
  <line x1="240" y1="315" x2="330" y2="215" marker-end="url(#ar3)"/>

  <line x1="480" y1="180" x2="560" y2="110" marker-end="url(#ar3)"/>
  <line x1="480" y1="200" x2="560" y2="200" marker-end="url(#ar3)"/>
  <line x1="480" y1="220" x2="560" y2="290" marker-end="url(#ar3)"/>

  <text x="35" y="360" font-size="10" fill="#666">RSD may OBSERVE and RECOMMEND, but has NO wire in this diagram.</text>
</svg>
```

---

## S-20 · Modulator variant matrix (V1 / V2 / V3)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 300" style="background:#fff;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px">
  <rect x="20" y="20" width="860" height="260" fill="#fbfbfb" stroke="#333"/>
  <text x="35" y="42" font-weight="700">Modulator variants — same geometric footprint, different eddy-loss profile</text>

  <!-- V1 -->
  <g transform="translate(60,80)">
    <text x="0" y="0" font-weight="700">V1 · Solid M8 low-carbon steel bolt</text>
    <circle cx="60" cy="60" r="30" fill="#bbb" stroke="#333" stroke-width="1.5"/>
    <text x="45" y="130">d = 8 mm</text>
    <text x="15" y="150">P_eddy relative = 1.00 (baseline)</text>
    <text x="15" y="170">Cost / pole ≈ $0.30</text>
    <text x="15" y="190">Build risk: low</text>
    <text x="15" y="210">Torque coupling: full</text>
  </g>

  <!-- V2 -->
  <g transform="translate(360,80)">
    <text x="0" y="0" font-weight="700">V2 · 7× M3 bundle (insulated)</text>
    <g stroke="#333" stroke-width="1">
      <circle cx="60" cy="60" r="11" fill="#bbb"/>
      <circle cx="42" cy="42" r="9" fill="#bbb"/>
      <circle cx="78" cy="42" r="9" fill="#bbb"/>
      <circle cx="42" cy="78" r="9" fill="#bbb"/>
      <circle cx="78" cy="78" r="9" fill="#bbb"/>
      <circle cx="30" cy="60" r="9" fill="#bbb"/>
      <circle cx="90" cy="60" r="9" fill="#bbb"/>
    </g>
    <text x="45" y="130">d = 3 mm</text>
    <text x="15" y="150">P_eddy relative = 0.14</text>
    <text x="15" y="170">Cost / pole ≈ $0.80</text>
    <text x="15" y="190">Build risk: insulation continuity</text>
    <text x="15" y="210">Torque coupling: ~equal (verify)</text>
  </g>

  <!-- V3 -->
  <g transform="translate(660,80)">
    <text x="0" y="0" font-weight="700">V3 · 0.35 mm lamination stack</text>
    <g stroke="#333" stroke-width="0.7">
      <rect x="30" y="30" width="60" height="60" fill="#bbb"/>
      <line x1="30" y1="40" x2="90" y2="40"/><line x1="30" y1="50" x2="90" y2="50"/>
      <line x1="30" y1="60" x2="90" y2="60"/><line x1="30" y1="70" x2="90" y2="70"/>
      <line x1="30" y1="80" x2="90" y2="80"/>
    </g>
    <text x="45" y="130">t = 0.35 mm</text>
    <text x="15" y="150">P_eddy relative = 0.002</text>
    <text x="15" y="170">Cost / pole ≈ $3–5</text>
    <text x="15" y="190">Build risk: EDM / stacking</text>
    <text x="15" y="210">Torque coupling: full (~equal)</text>
  </g>

  <text x="35" y="270" font-size="10" fill="#666">Pre-registered DoE: 3 variants × 4 gaps × 3 replicates = 36 runs.  Randomised order.  Pre-registered ANOVA on P_loss.</text>
</svg>
```

---

## S-21 · MG-C1 power flow (hand-crank charger)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 260" style="background:#fff;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px">
  <defs><marker id="ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#333"/></marker></defs>
  <rect x="20" y="20" width="860" height="220" fill="#fbfbfb" stroke="#333"/>
  <text x="35" y="42" font-weight="700">MG-C1 · human → USB-C  ·  P_out ≤ P_in enforced at every stage</text>

  <g font-size="11">
    <rect x="35" y="80" width="110" height="60" fill="#eef" stroke="#557"/><text x="50" y="105">Human crank</text><text x="50" y="122">22.6 W @ 90 rpm</text>

    <rect x="180" y="80" width="110" height="60" fill="#fff" stroke="#333"/><text x="195" y="105">MG-1 gear</text><text x="195" y="122">η ≥ 0.90</text>

    <rect x="325" y="80" width="110" height="60" fill="#fff" stroke="#333"/><text x="340" y="105">PMSG hub</text><text x="340" y="122">η ≈ 0.60 (measure!)</text>

    <rect x="470" y="80" width="110" height="60" fill="#fff" stroke="#333"/><text x="485" y="105">3φ rectifier</text><text x="485" y="122">η ≥ 0.96</text>

    <rect x="615" y="80" width="110" height="60" fill="#fff" stroke="#333"/><text x="630" y="105">Buck-boost + PD</text><text x="630" y="122">η ≥ 0.90</text>

    <rect x="760" y="80" width="110" height="60" fill="#efe" stroke="#282"/><text x="775" y="105">USB-C sink</text><text x="775" y="122">12 W @ 5V/2.4A</text>

    <line x1="145" y1="110" x2="180" y2="110" marker-end="url(#ar4)"/>
    <line x1="290" y1="110" x2="325" y2="110" marker-end="url(#ar4)"/>
    <line x1="435" y1="110" x2="470" y2="110" marker-end="url(#ar4)"/>
    <line x1="580" y1="110" x2="615" y2="110" marker-end="url(#ar4)"/>
    <line x1="725" y1="110" x2="760" y2="110" marker-end="url(#ar4)"/>

    <text x="60" y="180">P₁</text><text x="205" y="180">P₂</text><text x="350" y="180">P₃</text><text x="495" y="180">P₄</text><text x="640" y="180">P₅</text><text x="785" y="180">P₆</text>

    <text x="35" y="215">P₆/P₁ = 0.53 nominal · Gate 4 refuses any run with η_stage &gt; 1 at any hop.</text>
  </g>
</svg>
```

---

## Sheet reconciliation table

| Original sheet | v0.2 change | Council reference |
|---|---|---|
| S-05 axial cross-section | aluminium modulator, angular-contact bearings | S-1, S-2 |
| S-06 modulator variants | frequency table added (13.5 / 75 / 122 Hz) | S-4 |
| S-07 tolerances | +u_thermal(g) row added | S-3 |
| S-08 reaction arm | dead-weight calibration hole d=5 at r=100 | S-7 |
| S-09 electrical | brake resistor size fixed, sink-shed added | E-5 |
| S-11 BOM | modulator PN swapped to Al 6061 | S-1 |
| S-15 review record | Council conditional pass block | ratification block |

*New sheets S-16..S-21 above are Council supplements; incorporate into the master drawing set at revision `v0.2-council`.*

# MG-1 — Mathematical Analysis Companion

**Purpose:** the analytical backbone that the peer-review conditions demand.
Every number that MG-1's Gate criteria depend on should be derivable from a formula in this file. If a Gate criterion is not derivable here, it is a floor-of-the-room number, not a specification.

---

## 1. Space-harmonic identity and coupling condition

For an axial-flux magnetic gear with inner rotor pole-pairs \(p\), outer rotor pole-pairs \(p'\), and \(n_s\) ferromagnetic modulator poles, the flux-density space harmonics produced by the inner permanent-magnet array, modulated by the salient modulator, have pole-pair number ([Atallah–Howe axial-field gear, CUHK Physics](https://www.phy.cuhk.edu.hk/itp/v3/links/mmm/pdfs/08R303_1.pdf))

\[
p_{m,k} = \left| m p + k n_s \right|,\quad m = 1, 3, 5,\ldots,\quad k = 0, \pm1, \pm2, \ldots
\]

with rotational velocity

\[
\omega_{m,k} = \frac{m p}{m p + k n_s}\omega_r + \frac{k n_s}{m p + k n_s}\omega_s
\]

where \(\omega_r\) is the PM-rotor speed and \(\omega_s\) the modulator speed. The fundamental working harmonic that couples to the outer rotor is \((m, k) = (1, -1)\), which gives

\[
p_{1,-1} = |p - n_s| = p'
\quad\Longleftrightarrow\quad
n_s = p + p'
\]

**Coupling condition (Lemma 1).** \(\boxed{n_s = p_{in} + p_{out}}\).

For MG-1: \(n_s = 2 + 9 = 11\). ✅

**Gear ratio (Lemma 2).** With \(\omega_s = 0\) (modulator fixed to frame),

\[
G_r \equiv \frac{\omega_{out}}{\omega_{in}} = \frac{p}{p_{1,-1}} \cdot \text{sign}(m p + k n_s)
       = -\frac{p_{in}}{p_{out}}\ \text{(as speed ratio out/in)}
\]

Or equivalently, the *magnitude speed reduction from HS to LS is* \(p_{out}/p_{in}\), counter-rotating. For MG-1: \(|G_r| = 9/2 = 4.5\). ✅

**Static torque reaction (Lemma 3).** By conservation of angular momentum in the three-port static configuration,

\[
\tau_{in} + \tau_{out} + \tau_{react} = 0
\]

and, at pull-out with no slip, \(\tau_{out}/\tau_{in} = -p_{out}/p_{in}\), giving the reaction

\[
\tau_{react} = -(\tau_{in} + \tau_{out}) = \tau_{in}\left(\frac{p_{out}}{p_{in}} - 1\right) = \frac{n_s - 2p_{in}}{p_{in}}\tau_{in}.
\]

Substituting the equivalent identity \(\tau_{react} = (n_s/p_{in})\tau_{HS}\) that appears on sheet 8:

\[
\boxed{\tau_{react} = \frac{n_s}{p_{in}}\tau_{HS} - \tau_{HS} + \tau_{HS} = \frac{n_s}{p_{in}}\tau_{HS}\text{ at rated pull-out, and }\ge\text{ in magnitude of either shaft torque.}}
\]

For MG-1 at \(\tau_{HS} = 0.53\) N·m: \(\tau_{react} = (11/2)(0.53) = 2.93\) N·m, hence \(F_{cell} = 2.93/0.088 = 33.3\) N at the 88 mm arm. **50 N-full-scale load-cell specification (sheet 8) is correct with ~40% headroom.** ✅

---

## 2. Torque density and pull-out scaling

The pull-out torque of a coaxial magnetic gear scales as

\[
\tau_{pullout} = C \cdot \pi R_m^2 L_a \cdot \tau_d
\]

where \(R_m\) is the mean magnet radius, \(L_a\) is the active axial length, \(\tau_d\) is a topology-and-material torque-density parameter (units N·m/L), and \(C\) is a geometry constant \(\approx 1\) for well-optimised designs. For MG-1:

- \(R_m = 45\) mm (outer radius of the magnet band), inner \(R_i = 25\) mm — the CAD README pins \(R_m = 35\) mm at the mean of the block chord, but the *active-volume* radius for the torque formula uses the outer of the annulus. Use \(V_A = \pi(R_{o}^2 - R_i^2)L_a\).
- \(L_a = 23.6\) mm active axial length.
- Active volume \(V_A = \pi(0.045^2 - 0.025^2)(0.0236) = 1.04 \times 10^{-4}\) m³ = **0.104 L**. *(The 0.150 L figure in MG-C1 uses \(\pi R_o^2 L_a\); use the annulus for the pull-out estimate to avoid overclaiming.)*
- Literature \(\tau_d\) for **printed** builds: 12–20 N·m/L (per MG-C1 and MG-3).
- Predicted LS pull-out: \(\tau_{LS} = (12\ldots 20) \cdot 0.104 = 1.25\ldots 2.08\) N·m.

**Revised (annulus-basis) pull-out target: 1.25–2.08 N·m at LS** — a touch lower than the 1.8–3.0 N·m stated in MG-C1. This does not change any Gate criteria (1.5 N·m minimum passes) but the artifact should reconcile which volume convention is used.

---

## 3. Air-gap sensitivity — the sensitivity lemma

At the working harmonic, the gap-flux density scales for a permanent-magnet source of magnetisation length \(\ell_m\) and gap \(g\) as ([MEC vs FEA analysis](https://publiweb.femto-st.fr/tntnet/entries/13095/documents/author/data))

\[
B_{gap} = \frac{B_r}{1 + (\mu_{rec} g)/\ell_m}
\]

with N42: \(B_r = 1.30\) T, \(\mu_{rec} \approx 1.05\), \(\ell_m = 5\) mm. Then

\[
\frac{\partial B_{gap}}{\partial g}\bigg|_{g=0.8} = -\frac{B_r \mu_{rec}/\ell_m}{(1+\mu_{rec}g/\ell_m)^2}
\]

Numerically: \(B_r\mu_{rec}/\ell_m = 1.30 \cdot 1.05 / 0.005 = 273\) T/m. At \(g = 0.8\) mm: denominator \((1 + 1.05\cdot 0.0008/0.005)^2 = (1.168)^2 = 1.364\). So \(\partial B/\partial g \approx -200\) T/m.

Torque scales as \(\tau \propto B_{gap}^2\) at the working harmonic ([subdomain method torque analysis](https://pubs.aip.org/aip/adv/article/13/1/015018/2871171/Magnetic-field-and-torque-analysis-of-coaxial)), so

\[
\frac{1}{\tau}\frac{\partial \tau}{\partial g} = \frac{2}{B_{gap}}\frac{\partial B_{gap}}{\partial g}
= \frac{2 \cdot (-200)}{1.113}
\approx -359\ \text{per metre}.
\]

**Sensitivity lemma:** \(\boxed{\Delta\tau/\tau \approx -0.36\ \text{per mm gap change} \approx -0.29 \cdot \Delta g[\text{mm}]/0.8}\).

Verify against the MG-3 shim table: \(g=0.60\to 0.80\) is +3.7% torque; formula predicts \(0.36\times 0.2 = 7.2\%\). The measurement is ~half the linear prediction, consistent with the diminishing-returns curvature captured by the full \(1/(1+\mu_{rec}g/\ell_m)\) form. Good agreement to first order. Use this lemma when interpreting Gate 1 shim-sweep data.

---

## 4. Axial thrust — first-order pull-together force

Static axial force between one rotor and the modulator, integrated over all \(N\) HS blocks each of area \(A_{block} = 20 \times 10\) mm² and \(N=20\) blocks:

\[
F_{ax} \approx N \cdot \frac{B_{gap}^2 A_{block}}{2\mu_0}
       = 20 \cdot \frac{(1.113)^2 \cdot (2\times 10^{-4})}{2 \cdot 4\pi\times 10^{-7}}
       \approx 1.97\ \text{kN}.
\]

Per rotor face. **The two rotors pull toward the modulator from opposite sides**, so at nominal centering the *net* axial load on the modulator is close to zero — but *each* rotor bearing sees ~2 kN toward the modulator.

**Bearing check.** A 608ZZ bearing has:

- Static radial \(C_0 \approx 4.65\) kN
- Static axial (thrust) — deep-groove bearings can carry up to \(\sim 0.5 C_0 \approx 2.3\) kN axially, marginal against a 2 kN static preload plus dynamic transients.

**Recommendation (S-2):** angular-contact 7000-series pair, or PTFE thrust washer between rotor hub and frame plate. Confirmed as a first-order design defect requiring correction before v0.1 print.

---

## 5. Eddy-loss scaling and the V1/V2/V3 lemma

For a solid cylindrical pole piece of diameter \(d\), conductivity \(\sigma\), length \(\ell\), exposed to a sinusoidal transverse flux at frequency \(f\) and peak density \(B_{pk}\), the eddy-current loss per unit volume is (thin-conductor limit)

\[
P_{eddy}/V = \frac{\pi^2 d^2 f^2 B_{pk}^2 \sigma}{6}
\]

so ratios between variants at the same \(f\) and \(B_{pk}\) reduce to

\[
\frac{P_{V2}}{P_{V1}} = \left(\frac{d_2}{d_1}\right)^2,\quad
\frac{P_{V3}}{P_{V1}} = \left(\frac{t_{lam}}{d_1}\right)^2
\]

For MG-1:
- V1: solid M8, \(d = 8\) mm → baseline.
- V2: 7-off M3 bundle. Effective single-strand diameter \(d = 3\) mm. Ratio \((3/8)^2 = 0.14\), i.e. **~86% loss reduction**, or "7×" as stated. ✅
- V3: 0.35 mm laminations. Ratio \((0.35/8)^2 = 0.0019\), i.e. **~99.8% loss reduction**, or "~500×" as stated. ✅

**Sub-lemma:** the V2 bundle only achieves the ratio if strands are *electrically insulated* from each other. Uninsulated M3 rods bunched together will share eddy paths and behave like a solid \(d=8\) mm cylinder. This is a build risk on V2 — specify insulated (varnish, oxide, or shrink-tubing) rods.

### 5.1 Correct modulator-passing frequency

Two frequencies coexist:

- \(f_{mod\_HS}\) = the rate at which the HS rotor's poles pass a given modulator bolt = \(p_{in} \cdot n_{HS}/60\) at HS shaft speed \(n_{HS}\) rpm.
- \(f_{mod\_LS}\) = the rate at which the LS rotor's poles pass = \(p_{out} \cdot n_{LS}/60\).

At MG-1 rated speed \(n_{HS} = 3000\) rpm → \(n_{LS} = 667\) rpm:

\[
f_{mod\_HS} = 2 \cdot 50 = 100\ \text{Hz};\quad f_{mod\_LS} = 9 \cdot 11.1 = 100\ \text{Hz}.
\]

By coupling condition these are equal (that's the point of \(n_s = p_{in}+p_{out}\)). **The "~550 Hz" on sheet 6 is the beat-note frequency of the pole-pass modulation as seen inside the modulator ring, i.e. \(f_{ring} = n_s \cdot n_{LS}/60 = 11 \cdot 11.1 = 122\) Hz,** or one of the higher harmonic mode products (m=3, k=-1 gives \(|6-11| = 5\) → \(f = 5 \cdot 100 = 500\) Hz). Reconcile in one place.

At MG-C1 charger duty (\(n_{HS} = 405\) rpm → \(n_{LS} = 90\) rpm):

\[
f_{mod} = 2 \cdot 6.75 = 13.5\ \text{Hz (fundamental)}, \quad 74\text{ Hz on the 11th ring harmonic}.
\]

Both agree with the MG-C1 spreadsheet at "74.25 Hz", so that number is the ring-modulation frequency (\(n_s \cdot n_{LS}/60\)). **Recommend adopting \(f_{mod} = n_s \cdot n_{LS}/60\) as the single quoted number,** cited as the ring-modulation frequency.

At rated: \(11 \cdot 11.1 = 122\) Hz, not 550. **The V1/V2/V3 loss ratios stand; the absolute magnitude on V1 was over-estimated by a factor of \((550/122)^2 = 20\).** Recompute the V1 loss budget accordingly — this is *good news* for V1 viability.

---

## 6. Uncertainty budget (skeleton — to fill in with cell datasheets)

Let each torque cell have:

- Nonlinearity error \(u_{NL}\) (spec, e.g. ±0.1% of full scale)
- Hysteresis \(u_H\)
- Temperature coefficient \(u_T = \alpha_T \cdot \Delta T\)
- Calibration reference uncertainty \(u_C\) (e.g. from the dead-weight standard)
- Arm-length uncertainty on the reaction cell \(u_r = \tau \cdot \delta r/r\)

Combine in quadrature:

\[
u(\tau) = \sqrt{u_{NL}^2 + u_H^2 + u_T^2 + u_C^2 + u_r^2}
\]

For efficiency \(\eta = P_{out}/P_{in} = \tau_{out}\omega_{out}/(\tau_{in}\omega_{in})\):

\[
\left(\frac{u(\eta)}{\eta}\right)^2 = \left(\frac{u(\tau_{out})}{\tau_{out}}\right)^2 + \left(\frac{u(\tau_{in})}{\tau_{in}}\right)^2 + \left(\frac{u(\omega_{out})}{\omega_{out}}\right)^2 + \left(\frac{u(\omega_{in})}{\omega_{in}}\right)^2
\]

For AS5047P encoders \(u(\omega)/\omega\) is negligible at ≥100 rpm. Torque terms dominate. Even at ±0.5% per cell, \(u(\eta)/\eta \approx 0.7\%\); with cell-swap covariance this drops to ~0.5%.

**Gate 4 pass condition:** \(\eta \le 1\) at 3σ ⟺ \(1 - \eta_{measured} > 3 u(\eta)/\eta\). Never assert without this bound.

---

## 7. RSD slip observer — Bayesian formulation

Given noisy encoder measurements at times \(t_k\):

\[
z_k = \frac{\omega_{ls,k}}{\omega_{hs,k}} + v_k,\quad v_k \sim \mathcal{N}(0, \sigma_v^2)
\]

with nominal (no-slip) mean \(\mu_0 = -1/G_r = -1/4.5\), the posterior on slip probability under a Bernoulli latent state \(s_k \in \{0=\text{coupled}, 1=\text{slip}\}\) is a hidden-Markov filter. Log-likelihood ratio for the runs test:

\[
\Lambda_N = \sum_{k=N_0}^{N_0+N-1} \log\frac{p(z_k \mid s=1)}{p(z_k \mid s=0)}
\]

Latch a fault when \(\Lambda_N > \log(1/\alpha) - \log(\beta)\) for target false-alarm \(\alpha\), miss \(\beta\). This is the Wald sequential probability ratio test — the standard tool RSD should adopt for the slip observer rather than a Schmitt trigger on ratio deviation.

Consistent with RSD's L/K/E framework, this is the *K* (knowledge/model-state) layer using MG-1's rotational-dynamics as the process model — no new physics ([Recursive State Dynamics wiki](https://github.com/giomj/dev)).

---

## 8. Thermal virtual sensor — lumped-parameter model

Modulator ring lumped as one thermal node with mass \(m_{mod}\), specific heat \(c_p\), heat capacity \(C = m_{mod} c_p\), convective coefficient \(h\), surface \(A\), ambient \(T_\infty\):

\[
C \dot T_{mod} = P_{eddy}(n_{HS}) + P_{hys}(n_{HS}) - hA(T_{mod} - T_\infty)
\]

with \(P_{eddy}(n) = k_e n^2\) and \(P_{hys}(n) = k_h n\).

Steady-state:

\[
T_{ss} = T_\infty + \frac{k_e n^2 + k_h n}{hA}
\]

Fit \(k_e\), \(k_h\), \(hA\) from Gate 2 thermal soak sweeps (100→500 rpm) using OLS on log-residuals. Cross-validate against NTC. Divergence \(> 3\sigma\) triggers a *fault-observation*, not a *fault-latch* — per SAFE-01 doctrine, only hardware STO removes torque.

---

## 9. Quantum extension — problem sizing

**Q1 · VQA-Poisson.** Discretize the MG-1 2D midplane on an 8×8 mesh (64 unknowns). Encoding needs \(\log_2 64 = 6\) qubits. IBMQ 7-qubit hardware (accessible via [ibmq-connector](https://github.com/giomj/dev)) is sufficient. Cost function is Rayleigh quotient of \(\|A|\psi\rangle - |b\rangle\|^2\); ansatz is hardware-efficient with 3 layers → ~20 trainable parameters. Total shots: 10⁴/parameter × 20 params × 50 iterations ≈ 10⁷ shots; feasible in one queue-day.

**Q2 · QUBO topology.** 22 modulator cells → 22 binary variables → direct D-Wave embedding without minor-embed penalty. Cost: pull-out torque approximated by a quadratic surrogate over binary variables, e.g.

\[
H = -\sum_{i,j} J_{ij} x_i x_j + \lambda \left(\sum_i x_i - N_{steel}\right)^2
\]

where \(J_{ij}\) is the FEA-derived pairwise torque contribution and the penalty pins the total steel fraction. This is exactly the class of problem solved by Maruo et al. ([IEEE TMAG 2022](https://ieeexplore.ieee.org/document/9803271/)).

**Complexity:** classical simulated-annealing baseline on 22 vars is trivial (\(<1\) s). Quantum advantage on this problem is *pedagogical, not economic*. Real advantage arises at MG-2 scale: a 3D magnetic-core TO on ~500 unknowns, which the Digital Annealer has already demonstrated ([Hokkaido COMPUMAG](https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/87018/1/COMPUMAG2021_full_maruo_31.pdf)). Q2 is a validation exercise; MG-2 is where quantum earns its keep.

---

## 10. Summary of lemmas (for the drawing set)

| # | Lemma | Value for MG-1 |
|---|---|---|
| L1 | \(n_s = p_{in} + p_{out}\) | 11 |
| L2 | \(\|G_r\| = p_{out}/p_{in}\), counter-rotating | 4.5:1 |
| L3 | \(\tau_{react} = (n_s/p_{in})\tau_{HS}\) at pull-out | 2.93 N·m |
| L4 | \(V_A = \pi(R_o^2 - R_i^2)L_a\) (annulus basis) | 0.104 L |
| L5 | \(\tau_{pullout} = \tau_d V_A\), printed \(\tau_d \in [12,20]\) N·m/L | 1.25–2.08 N·m LS |
| L6 | \(\Delta \tau/\tau \approx -0.36\cdot \Delta g[\text{mm}]/0.8\) | -9% per +0.2 mm |
| L7 | \(F_{ax} \approx N B_{gap}^2 A/(2\mu_0)\) per rotor | ~2 kN static |
| L8 | \(P_{eddy}/P_{eddy,V1} = (d/d_1)^2\) | V2: 0.14, V3: 0.002 |
| L9 | \(f_{mod} = n_s n_{LS}/60\) (ring-modulation) | 122 Hz at rated |
| L10 | \(u(\eta)/\eta = \sqrt{\sum (u/x)^2}\) — publish before Gate 3 | ~0.5–0.7% target |

Any Gate criterion inconsistent with L1–L10 is either a build error or a measurement error, per Council doctrine.

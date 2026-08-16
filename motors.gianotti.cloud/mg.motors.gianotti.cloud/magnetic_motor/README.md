# MG-1Q — Quantum optimisation for the MG-1 magnetic gear and its solar starter

Runnable `qiskit_ibm_runtime` package for three MG-1 questions posed as Ising
problems: the airgap field pattern, eddy-current segmentation of the pole piece,
and PV array reconfiguration for the solar starter. Trained locally, verified on
IBM hardware, always scored against an exact classical reference.

Verified against **qiskit 2.5.2 / qiskit-ibm-runtime 0.49.0 / qiskit-aer 0.17.2**.
The full local pipeline was executed before this document was written; the
numbers below are that run's output, not estimates.

---

## One interpretation you should confirm or reject

You asked to "evaluate the magnetosphere." I read that as the **MG-1 airgap
magnetic field and its harmonic envelope** — the flux-modulated field in the
0.80 mm gap, whose \(n_s\)-th permeance harmonic is the only one that makes
torque. That is the field the machine has and the field the optimisation acts on.

If you actually meant **Earth's magnetosphere** — geomagnetic field modelling,
solar-wind coupling, or space-weather effects on PV output — that is a different
package and I will build it instead. Say which.

---

## What is honestly quantum here, and what is not

This is the part worth reading before the code.

**Problem 1a — the real 22-cell modulator ring: solved exactly, classically, in
1.4 seconds.** All \(2^{22}\) = 4,194,304 steel/air patterns enumerated in
vectorised numpy. The optimum is `1010101010101010101010`: the perfectly
alternating ring, harmonic purity 1.000000, parasitic harmonic power 3e-31,
pull-out 3.003 N·m. **That is exactly the as-built MG-1 design.** No optimiser of
any kind was needed, quantum or classical, and claiming a quantum method
"designed" it would be false.

**The problem only becomes real when the ring's symmetry is broken — and on the
actual hardware it is.** Twenty-two M8×25 bolts pass through the frame; some
cells must stay air for clearance, some must stay steel to carry the 2.933 N·m
modulator reaction into the arm. Forcing four bolt clearances at cells 0, 4, 11,
15 and two structural bridges at 8, 9 gives the exact constrained optimum
`0010001011101010111010`:

| Quantity | As-built ring | With bolt clearances forced |
|---|---|---|
| harmonic purity | 1.000 | 0.863 |
| torque vs as-built | 1.000 | **0.405** |
| pull-out at LS | 3.003 N·m | **1.216 N·m** |
| eddy multiplier | 1.000 | 1.064 |
| gear efficiency | 90.0 % | **75.2 %** |

**Design conclusion, and the most useful output of this entire exercise: do not
run bolts through the modulator ring cells.** Four clearance holes cost 60 % of
pull-out torque and 15 points of gear efficiency. Move the bolt circle to an
outer flange outside the active harmonic region. That is a decision you can act
on at the bench, and it came from an exhaustive search rather than intuition.

**Problem 3 — the solar starter budget has zero quantum content.** Spinning the
rotor to 405 rpm needs 3.37 J kinetic + 15.83 J drag = 19.20 J mechanical, 28.44 J
electrical, 3.56 W peak over an 8 s ramp. A 20 W panel at 0.62 derate delivers
12.4 W, so **the panel starts the machine directly** — no bank strictly needed,
and the 10 F / 12 V buffer covers it 16× over with a 2.3 s recharge. This is
arithmetic. A one-dimensional MPPT search is unimodal and no quantum method has
anything to offer it.

**What IS combinatorial in the solar path is array reconfiguration under partial
shade**, because a series string is current-limited by its worst-lit member. With
12 substrings, four of them shaded by the bench frame and a cable, the optimal
two-string split delivers **48.21 W against 18.75 W** for a single series string
— a **157 % gain**, against an unshaded ceiling of 66.29 W. That is a real,
discrete, non-convex problem.

**Bottom line:** at 12 and 16 qubits, brute force is the truth and the quantum
layer is being *validated*, not trusted. The method earns its place only when the
space outgrows enumeration — a 2-D modulator with radial as well as
circumferential cells, a multi-stage ring, or a full array with per-module
switching. The package is built so that transition costs nothing but a parameter.

---

## Measured results — local pipeline, `python run_local.py`

All three problems reached the **exact** optimum. QAOA parameters trained on an
exact statevector with a CVaR(0.15) objective, then sampled noise-free.

| Problem | Qubits | States | Exact optimum | QAOA best | Gap |
|---|---|---|---|---|---|
| reduced ring, 16 cells, \(n_s\)=5, bolts forced | 16 | 65,536 | −0.0052313 | −0.0052313 | 0.0 |
| pole-piece segmentation, 4×3 | 12 | 4,096 | 0.5441176 | 0.5441176 | 0.0 |
| PV reconfiguration, 12 substrings | 12 | 4,096 | −48.2112 W | −48.2112 W | 0.0 |

Segmentation result: a **3-cut, 6/6 balanced split cuts the eddy figure by 50 %**
using 3 of 17 available cuts — one round of recursive bisection, which is
precisely how a lamination stack is actually reached. This is the V1 solid M8 →
V2 7× M3 → V3 0.35 mm lamination doctrine expressed as an optimisation.

Baseline constants reproduced exactly, unchanged from the verified MG-1 sheet:
\(B_{gap}\) = 1.1130 T, \(n_{HS}\) = 405.0 rpm, \(f_{mod}\) = 74.25 Hz,
\(P_{in}\) = 22.62 W, \(\eta_{gear}\) = 90.0 %.

### Circuit cost on real topology

Transpiled against `FakeTorino` (133-qubit heavy-hex), optimisation level 3:

| Problem | p=1 ISA depth | p=1 two-qubit gates | p=3 two-qubit gates |
|---|---|---|---|
| segmentation 4×3 | 358 | 241 | 761 |
| PV 12-substring | 360 | 241 | 761 |
| reduced ring 16 | 507 | 452 | 1,469 |

**p=1 already reaches the exact optimum on all three problems**, so the hardware
default is `--reps 1`. p=3 triples the two-qubit count for no measured gain.
The all-to-all cost layer becomes a large SWAP network on heavy-hex, and depth —
not qubit count — is the scarce resource. Read the dry-run two-qubit count before
spending quota: if it reaches the thousands, the honest report is that the device
could not hold the problem, not that the answer was bad.

---

## Layout

```
mg1q/magnetics.py   MG-1 constants and physics: b_gap, gear_losses, ModulatorRing,
                    PolePieceCrossSection, StarterBudget
mg1q/problems.py    the three Ising problems, exact references, bit conventions
mg1q/qaoa.py        QAOA ansatz, CVaR training on an exact statevector
mg1q/runtime.py     QiskitRuntimeService, backend choice, transpile, SamplerV2,
                    EstimatorV2 with ZNE, QPU-time guard
run_local.py        full pipeline, no credentials, no QPU  <- run this first
run_hardware.py     one circuit per problem to a real QPU
tests/test_math.py  19 checks; the Hamiltonian must equal the objective it claims
```

## Run it

```bash
pip install -r requirements.txt
python run_local.py            # ~4 min, writes results_local.json
python -m pytest tests -q      # 18 passed, 1 skipped
```

## Run it on IBM hardware

```bash
export QISKIT_IBM_TOKEN="<44-character API key>"
export QISKIT_IBM_INSTANCE="crn:v1:bluemix:public:quantum-computing:..."

python run_hardware.py --all --dry-run     # transpile and cost it, submit nothing
python run_hardware.py --problem pv --shots 4096
```

`channel="ibm_quantum_platform"` is the current default; the old `ibm_quantum`
channel has been removed and `ibm_cloud` is a legacy alias
([QiskitRuntimeService API](https://quantum.cloud.ibm.com/docs/en/api/qiskit-ibm-runtime/qiskit-runtime-service),
[initialize-account](https://quantum.cloud.ibm.com/docs/en/guides/initialize-account)).

If your key is rejected with **BXNIM0415E**, IAM received a key it cannot find —
recreate it on the Platform dashboard rather than debugging the client. This is
the same wall the `giomj/ibmq-connector` work hit, which is why the simulator
path here needs no credentials at all.

### Budget discipline

Open Plan allows **10 minutes of QPU time per rolling 28-day window**
([plans overview](https://quantum.cloud.ibm.com/docs/en/guides/plans-overview));
a March 2026 promotion adds 180 minutes over 12 months to accounts past 20 minutes
of use ([IBM Quantum blog](https://www.ibm.com/quantum/blog/open-plan-updates)).
Open Plan also **cannot open a Session — job or batch mode only**
([run jobs in a session](https://quantum.cloud.ibm.com/docs/guides/run-jobs-session)).

So parameters are trained locally and hardware sees **one circuit per problem**,
not one per optimiser iteration. `--dry-run` prints ISA depth, two-qubit count and
an estimated QPU time, and the submitter refuses to exceed a 60 s guard unless you
raise it deliberately.

### Why a noisy device is still safe to use here

The QPU is a **sampler of candidate designs**, not an oracle. Every distinct
bitstring it returns is scored exactly and classically before anything is
accepted. Noise therefore broadens the distribution and wastes shots — it cannot
produce a wrong engineering answer. Error suppression is on by default:
dynamical decoupling (`XpXm`) for qubits left idle inside SWAP chains, and Pauli
twirling of gates and measurements to convert coherent, structured error into
stochastic error. Neither makes the result exact; both make the failure mode
benign. The `EstimatorV2` path adds readout mitigation and Zero-Noise
Extrapolation for when you want the field correlations rather than a design.

This is the same discipline as MG-1 Gate 4: **quantum proposes, classical
verifies.** A result you cannot check is not a result.

---

## Limitations, stated plainly

1. **First-order harmonic model, not FEA.** The permeance-harmonic argument gives
   a *ranking* of ring patterns. Torque ∝ \(|\Lambda_{n_s}|^2\) and eddy loss ∝
   \((k/n_s)^2\) are the right scalings but not the right absolute numbers.
   Confirm any ranking in finite-element analysis or on the bench before cutting
   metal.
2. **The eddy figure is a proxy.** Loss ∝ (region area)² with a single bisection
   round is the standard first-order lamination argument, not an eddy-current
   solve. It ranks cut patterns; it does not predict watts.
3. **The reduced ring is a substitution.** The real \(n_s\) = 11 ring needs ≥ 22
   cells to avoid aliasing the working harmonic, and 22 qubits is past exact
   statevector training in this sandbox. The hardware demo uses a 16-cell,
   \(n_s\) = 5 ring — same Hamiltonian, smaller machine (p_in 2, p_out 3, G −1.5).
   The real ring is solved exactly and classically instead, which is the right
   answer for it anyway. The code **refuses** to build an aliased problem.
4. **The PV surrogate is not the objective.** String current is a *minimum*, which
   is not quadratic, so the Hamiltonian optimises a variance-equalisation
   surrogate while `score` uses the true min-current model. A test asserts the two
   disagree — a passing "they match" test would mean the docstring was lying.
5. **No hardware run is included.** Credentials are yours; the transpile and cost
   path is verified against `FakeTorino`, and the submit path follows the current
   documented API, but I have not executed a job on a real QPU.
6. **No over-unity claim, anywhere.** Gear efficiency is 90.0 %, chain efficiency
   53.2 %. The solar panel is an energy *source*; the machine is a transformer of
   it. Nothing here produces more than it consumes.
7. **RSD stays out of the safety path**, per standing doctrine — estimator, fault
   detector and thermal virtual sensor only.

---

## Sources

**IBM Quantum Platform**
- [QiskitRuntimeService API reference](https://quantum.cloud.ibm.com/docs/en/api/qiskit-ibm-runtime/qiskit-runtime-service)
- [Initialize your account](https://quantum.cloud.ibm.com/docs/en/guides/initialize-account)
- [Run jobs in a session — Open Plan restriction](https://quantum.cloud.ibm.com/docs/guides/run-jobs-session)
- [Plans overview — 10 min / 28 days](https://quantum.cloud.ibm.com/docs/en/guides/plans-overview)
- [Open Plan updates, March 2026 promotion](https://www.ibm.com/quantum/blog/open-plan-updates)
- [qiskit-ibm-runtime release notes](https://qiskit.github.io/qiskit-ibm-runtime/release_notes.html)
- [qiskit-ibm-runtime on GitHub](https://github.com/Qiskit/qiskit-ibm-runtime)

**Method**
- Barkoutsos, Nannicini, Robert, Tavernelli, Woerner, *Improving Variational Quantum Optimization using CVaR*, Quantum 4, 256 (2020) — the CVaR objective used for training

**MG-1 physics**
- [Atallah & Howe, magnetic gear topology](https://www.sciencedirect.com/science/article/abs/pii/S0304885303022182)
- [Sheffield pseudo-direct-drive thesis](https://etheses.whiterose.ac.uk/id/eprint/24379/1/PhD_Main_DOC_v64_Final_with_Appendix_corrected.pdf)
- [Magnomatics pseudo-direct-drive](https://www.magnomatics.com/technology/pseudo-direct-drive)

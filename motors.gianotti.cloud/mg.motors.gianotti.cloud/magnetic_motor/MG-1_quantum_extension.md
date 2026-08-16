# MG-1 — Quantum-Computing Extension of the Theory

**Status:** speculative program work. Written to the same doctrine standard as the rest of MG-1: any claim of quantum advantage requires a head-to-head comparison against a classical baseline on the same benchmark, and any device built from a quantum-optimized design must be measured on the three-port instrument before it can be presented as a result.

**Scope:** three problem classes where a quantum computer could extend MG-1 theory, mapped to hardware the user already has access to via the `ibmq-connector` project ([giomj/dev IBM Quantum client](https://github.com/giomj/dev)).

---

## 1. Motivating question

MG-1 is a solvable classical problem. 2D FEA on a laptop returns a torque prediction in seconds; 3D Ansys Maxwell in minutes. **Why bring a quantum computer to it?**

Three defensible reasons:

1. **Pedagogical benchmarking.** MG-1 is small, well-instrumented, and has a *measured* ground truth. It is a rare "shovel-ready" problem where the same 2D magnetostatic instance can be posed to a variational quantum eigensolver *and* measured on a bench. That is worth a paper regardless of who wins ([Xu et al., VQA-Poisson benchmarking, Phys. Rev. A 104 022418](https://link.aps.org/doi/10.1103/PhysRevA.104.022418)).
2. **Scaling path.** MG-2's pseudo-direct-drive stator geometry (integrated PM + copper + iron topology, several hundred design variables) is precisely the class of problem where **quantum annealing topology optimization has already demonstrated wins on 600–758 unknowns** ([Maruo et al., IEEE Trans. Magn. 2022](https://ieeexplore.ieee.org/document/9803271/); [Hokkaido U COMPUMAG 2021](https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/87018/1/COMPUMAG2021_full_maruo_31.pdf); [Ye et al., NSF-hosted preprint on quantum-annealing TO](https://par.nsf.gov/servlets/purl/10422510)). Prove the pipeline on MG-1's 22-bolt modulator; scale it to MG-2.
3. **Portfolio integration.** The user's `ibmq-connector` and `qiskit-application-portfolio` projects already exist and are looking for bounded, measurable problems. MG-1 supplies one.

Quantum on MG-1 is **not** justified by "quantum is faster." At MG-1 scale it is not. It is justified as a validation pipeline for MG-2 and beyond.

---

## 2. Problem classes

### 2.1 Class A — Forward field solve (magnetostatic Poisson)

**Problem.** Given the geometry (pole positions, gap, materials) and permanent-magnet magnetization pattern, solve for the vector potential \(A_z(r,\theta)\) satisfying

\[
\nabla \cdot \left(\frac{1}{\mu(r,\theta)} \nabla A_z\right) = -J_z + \nabla \times \left(\frac{\mathbf{M}}{\mu}\right)_z
\]

on a 2D annular slice of MG-1, with periodic boundary conditions at \(\theta = 0, 2\pi\) and Dirichlet at inner/outer radii.

**Classical baseline.** femm (free) or COMSOL / Ansys Maxwell. Runtime seconds to a few minutes for the mesh sizes MG-1 needs.

**Quantum method.** **Variational Quantum Algorithm for the Poisson equation** ([Xu et al. 2021](https://link.aps.org/doi/10.1103/PhysRevA.104.022418); [variational quantum evolution equation solver, Sci. Rep. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9233714/)):

- discretize \(\nabla^2\) on \(N=2^n\) cells (n qubits);
- decompose the finite-difference Laplacian into a sum of Pauli tensor products with only \(O(\log N)\) terms (Xu et al.'s key result);
- prepare a hardware-efficient variational ansatz \(|\psi(\vec\theta)\rangle\);
- minimize the cost function \(C(\vec\theta) = \| A|\psi\rangle - |b\rangle\|^2\), evaluated by sampling.

**MG-1 scope.** 8×8 = 64-cell 2D slice → 6 qubits. Achievable on IBM's small backends (accessible via the existing IBMQ connector). Purpose is *validation of the pipeline against a measured MG-1 field-map*, not classical speed.

**Pass condition.** Recover the analytical harmonic amplitudes for the working \((m,k) = (1,-1)\) harmonic within 10% of the classical FEA on the same mesh; report the qubit / shot / iteration count.

### 2.2 Class B — Inverse design (topology optimization)

**Problem.** Given a design domain (the annulus between the two rotors) and a constraint (magnetic pull-out torque \(\ge T_{target}\), material fraction \(\le f_{max}\)), find the *assignment of material to each cell* that maximizes an objective such as \(\tau_{pullout} - \lambda \tau_{ripple,rms}\).

This is the natural home of QUBO / quantum annealing.

**Classical baseline.** SIMP (solid isotropic material with penalization) topology optimization; genetic algorithms. Well-studied, but combinatorial in the number of design cells and prone to local optima on non-convex electromagnetic objectives.

**Quantum method.** **QUBO reformulation and annealing** — three flavours, in order of demonstrated maturity:

- **Digital Annealer (Fujitsu)** — the Hokkaido / Fujitsu team has already solved 3D PM + magnetic-core topology optimization with 600–758 binary unknowns iterating between FEM field solves and QUBO topology updates ([COMPUMAG 2021](https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/87018/1/COMPUMAG2021_full_maruo_31.pdf); [IEEE TMAG 2022](https://ieeexplore.ieee.org/document/9803271/)). This is the reference implementation.
- **D-Wave hybrid solver** — Ye et al. framework uses Generalized Benders Decomposition to iterate a QUBO topology with FEM validation; demonstrated for structural TO but the electromagnetic analogue is direct ([NSF-hosted preprint](https://par.nsf.gov/servlets/purl/10422510)). A more recent framework at [arXiv 2406.18833](https://www.arxiv.org/abs/2406.18833) extends this to continuum structures.
- **Gate-model QAOA** — noisier and smaller, but tractable for the 22-variable MG-1 modulator instance. Would run on the same IBMQ hardware used for Class A.

**MG-1 scope — the 22-variable warm-up.** The modulator ring has 22 M8 bolt positions. Encode as 22 binary variables \(x_i \in \{0,1\}\), where 1 = steel bolt, 0 = air. Objective:

\[
H = -\sum_{i<j} J_{ij} x_i x_j - \sum_i h_i x_i + \lambda \left(\sum_i x_i - N_{steel}\right)^2
\]

where \(J_{ij}, h_i\) come from a linearization of the FEA-derived pull-out torque, and \(\lambda\) enforces a target steel fraction. 22 binary vars embed directly on D-Wave Advantage without minor-embedding overhead.

**MG-2 scope — the real bet.** Extend the domain to \(\sim 500\) cells over the MG-2 stator geometry. This is where classical SIMP gets stuck in local optima and quantum annealing has documented advantage on the electromagnetic version of the problem.

**Pass condition (MG-1).** Produce a modulator pattern that beats the 22-M8-bolt baseline on FEA-predicted pull-out at matched steel fraction, then **build it as MG-1 modulator V4** and run through Gate 1/3. The measured torque and eddy loss on V4 vs V1/V2/V3 is the honest result.

### 2.3 Class C — Dynamics and state estimation

**Problem.** RSD's slip observer and thermal virtual sensor are Bayesian state estimators on nonlinear stochastic ODEs (rotational dynamics with saturating spring coupling; lumped thermal ODE with speed-dependent source). Standard classical tools apply (EKF, UKF, particle filter, factor-graph MAP).

**Quantum method.** **Quantum-enhanced sampling** for the factor-graph MAP problem. This is speculative for MG-1 (the state dimension is too small to justify), but the pipeline built for MG-2 (with additional modes: torque ripple harmonics, per-pole thermal states) does begin to justify it. Not recommended as an MG-1 milestone; noted for MG-2 planning.

---

## 3. Where quantum is not useful (and shouldn't be claimed)

1. **Real-time control.** RSD runs at 1 kHz. Quantum hardware latency (queue + sampling) is 6-9 orders of magnitude wrong. Classical DSP owns this forever.
2. **Gate 4 falsification.** The three-port energy balance is a *classical instrumentation* problem. No quantum method changes the balance; it is a measurement.
3. **Marketing.** "Quantum-optimized magnetic gear" is not a claim until Q3 (below) is built and measured. Until then it is a plan.

---

## 4. Recommended work-plan (parallel to MG-1 build, not blocking any Gate)

| Phase | Scope | Effort | Hardware | Deliverable |
|---|---|---|---|---|
| **Q0** | Reference. 2D-FEA analytical + numerical for MG-1 (2/9/11), 64-cell mesh. Publish field map + working-harmonic amplitudes. | 1 week | laptop femm | `mg-1/quantum/Q0_reference.ipynb`, field-map PDF |
| **Q1** | Validation. VQA-Poisson on 64-cell slice using the [ibmq-connector](https://github.com/giomj/dev) and existing Qiskit portfolio. Match Q0 field within 10%. | 2 weeks | IBM Quantum small backend | Preprint-quality notebook + convergence plots |
| **Q2** | Inverse (small). QUBO topology on 22-cell modulator, D-Wave hybrid or Digital Annealer. Produce a candidate V4 pattern that beats V1-baseline on FEA-predicted pull-out at matched steel fraction. | 3 weeks | D-Wave Leap free tier | Candidate V4 CAD + FEA prediction |
| **Q3** | Physical validation. Print/machine the Q2 winner. Install on MG-1 rig. Run through Gate 1/3. Compare measured pull-out and eddy loss to the QUBO prediction and to V1/V2/V3. | 2 weeks | Existing MG-1 rig | Gate report — measured vs quantum-predicted |
| **Q4** | Publication. *Comparative quantum-annealing topology optimization of a coaxial magnetic gear, validated on a three-port instrument.* | 2 weeks | Existing pipeline | arXiv preprint, GitHub release |
| **Q5** | Scale. Apply the Q2 workflow to MG-2 (~500-cell stator TO) once MG-1 Gates 1-3 close and MG-2 design work opens. | ongoing | D-Wave Advantage + FEA cluster | MG-2 stator baseline |

**Q3 is non-negotiable.** A quantum result on MG-1 that isn't measured on the three-port instrument is not a result under Council doctrine. It is a simulation.

---

## 5. Program-doctrine consistency

Every clause in the MG-1 architectural framework applies to the quantum extension:

- \(P_{out} \le P_{in}\) — no quantum method changes this. The energy balance is measured, not simulated.
- SAFE-01 authority — no quantum algorithm can act on safety.
- RSD is estimator — a quantum-inspired factor-graph MAP solver, if adopted, still cannot remove torque.
- CBJG Customs firewall — a "quantum-optimized magnetic gear" venture claim, without Q3 measurement, would be rejected at ratification on the same grounds as "free energy." This is stated explicitly so it cannot be accidentally violated.
- GitHub is authoritative — all quantum notebooks, Qiskit / D-Wave scripts, and datasets live in `giomj/dev/hardware/mg-1/quantum/`.

---

## 6. Concrete first commit (this-week scope)

1. Open `giomj/dev` issue `mg-1-quantum-Q0` linked to [SAFE-01 issue #14](https://github.com/giomj/dev/issues/14) and Council review.
2. Create `hardware/mg-1/quantum/` directory. Add `README.md` pointing at this file.
3. Add `Q0_reference.ipynb` — femm 2D magnetostatic of MG-1 2/9/11 on an 8×8 slice; extract working-harmonic amplitude; save field CSV.
4. Add `Q1_vqa_poisson.ipynb` — Qiskit VQA setup on same mesh using the [ibmq-connector](https://github.com/giomj/dev). Run on simulator first; queue small-backend run.
5. Post the Q0 field map to the Council Notion mirror for Physicist seat review before proceeding to Q1.

**Zero blocking on MG-1 hardware.** All of §6 is software; the physical MG-1 program continues in parallel and remains the pass/fail authority.

---

## 7. References (quantum-specific — full list in the main review file)

- [Xu et al., Variational Quantum Algorithm for the Poisson equation, Phys. Rev. A 104, 022418 (2021)](https://link.aps.org/doi/10.1103/PhysRevA.104.022418)
- [Sarma et al., Variational quantum evolution equation solver, Sci. Rep. 12 (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9233714/)
- [Maruo et al., Topology optimization of electromagnetic devices using Digital Annealer, IEEE TMAG 2022](https://ieeexplore.ieee.org/document/9803271/)
- [Maruo et al., COMPUMAG 2021 PM + magnetic-core topology optimization (Hokkaido U preprint)](https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/87018/1/COMPUMAG2021_full_maruo_31.pdf)
- [Ye et al., Quantum Topology Optimization via Quantum Annealing, NSF-hosted preprint](https://par.nsf.gov/servlets/purl/10422510)
- [Design update framework for continuum topology optimization with quantum annealing, arXiv 2406.18833 (2024)](https://www.arxiv.org/abs/2406.18833)
- [D-Wave annealing documentation](https://docs.dwavequantum.com/en/latest/quantum_research/annealing.html)

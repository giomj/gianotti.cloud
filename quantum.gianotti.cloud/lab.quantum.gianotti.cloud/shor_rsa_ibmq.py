"""
shor_rsa_ibmq.py
================
Quantum RSA-Integrity Evaluation on IBM Quantum Hardware
--------------------------------------------------------

Purpose
-------
Demonstrate, end-to-end and on real IBM quantum hardware, why RSA is
cryptographically obsolete against a Cryptographically Relevant Quantum
Computer (CRQC). This script factors a small RSA-style modulus N = 15
(p=3, q=5) using Shor's algorithm implemented with the modern Qiskit
Runtime V2 primitive interface (SamplerV2). It then reconstructs the
private key from the recovered factors and decrypts a ciphertext, closing
the full attack loop end-to-end.

Educational/authorized use only. Uses IBM Quantum credentials the operator
already possesses. Do not target keys you do not own.

Requirements
------------
    pip install "qiskit>=1.2" "qiskit-ibm-runtime>=0.28" sympy

Environment
-----------
    IBM_QUANTUM_TOKEN   IBM Cloud API key for the Quantum Platform
    IBM_QUANTUM_CRN     Service CRN for your Quantum instance
                        (e.g. crn:v1:bluemix:public:quantum-computing:...)

Author: CBJG Holdings LLC / Quantum Security Advisory
"""

from __future__ import annotations

import argparse
import math
import os
import random
import sys
from dataclasses import dataclass
from fractions import Fraction
from typing import Optional

from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager


# ---------------------------------------------------------------------------
# 1. Classical scaffolding for Shor's algorithm
# ---------------------------------------------------------------------------

@dataclass
class ShorResult:
    N: int
    a: int
    measured_phase: float
    inferred_order: Optional[int]
    factors: Optional[tuple[int, int]]
    counts: dict[str, int]
    backend_name: str


def c_amod15(a: int, power: int) -> QuantumCircuit:
    """
    Controlled modular multiplication by a^power mod 15.
    Standard textbook construction — only valid for N = 15 and
    a in {2, 4, 7, 8, 11, 13}. This is the smallest circuit that
    still exercises the full Shor structure on real hardware.
    """
    if a not in [2, 4, 7, 8, 11, 13]:
        raise ValueError("For N=15 the base 'a' must be in {2,4,7,8,11,13}")

    U = QuantumCircuit(4)
    for _ in range(power):
        if a in [2, 13]:
            U.swap(2, 3); U.swap(1, 2); U.swap(0, 1)
        if a in [7, 8]:
            U.swap(0, 1); U.swap(1, 2); U.swap(2, 3)
        if a in [4, 11]:
            U.swap(1, 3); U.swap(0, 2)
        if a in [7, 11, 13]:
            for q in range(4):
                U.x(q)
    U = U.to_gate()
    U.name = f"{a}^{power} mod 15"
    return U.control()


def build_shor_circuit(a: int, n_count: int = 4) -> QuantumCircuit:
    """
    Build Shor's period-finding circuit for N = 15 with n_count
    counting qubits and 4 work qubits. Uses inverse QFT at the end
    so measurement yields the phase s/r.
    """
    N_WORK = 4
    qc = QuantumCircuit(n_count + N_WORK, n_count)

    # Superposition on counting register
    for q in range(n_count):
        qc.h(q)

    # Initialise work register to |1>
    qc.x(n_count)

    # Controlled-U^{2^j}
    for j in range(n_count):
        qc.append(
            c_amod15(a, 2 ** j),
            [j] + list(range(n_count, n_count + N_WORK)),
        )

    # Inverse QFT on counting register
    qc.append(QFT(n_count, do_swaps=True).inverse(), range(n_count))

    qc.measure(range(n_count), range(n_count))
    return qc


def phase_to_order(measured_int: int, n_count: int, N: int) -> Optional[int]:
    """Continued-fraction expansion to recover order r from measured phase."""
    if measured_int == 0:
        return None
    phase = measured_int / (2 ** n_count)
    frac = Fraction(phase).limit_denominator(N)
    r = frac.denominator
    return r if r > 0 else None


def factor_from_order(a: int, r: int, N: int) -> Optional[tuple[int, int]]:
    """Given a valid even order r, extract non-trivial factors of N."""
    if r % 2 != 0:
        return None
    x = pow(a, r // 2, N)
    if x == N - 1:
        return None
    p = math.gcd(x + 1, N)
    q = math.gcd(x - 1, N)
    if 1 < p < N and 1 < q < N:
        return (p, q)
    return None


# ---------------------------------------------------------------------------
# 2. IBM Quantum execution using SamplerV2 (current API)
# ---------------------------------------------------------------------------

def run_on_ibm(
    N: int = 15,
    a: int = 7,
    shots: int = 1024,
    use_simulator: bool = False,
    min_qubits: int = 8,
) -> ShorResult:
    """
    Execute Shor's period-finding circuit on IBM Quantum hardware.

    Notes
    -----
    * Uses QiskitRuntimeService with the IBM Cloud channel — the post-
      Classic API endpoint. Set IBM_QUANTUM_TOKEN and IBM_QUANTUM_CRN
      in the environment.
    * Uses generate_preset_pass_manager to lower the circuit to the
      backend's Instruction Set Architecture (ISA) before submission —
      required for SamplerV2.
    * Selects `least_busy` operational backend with at least `min_qubits`.
    """
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler

    token = os.environ.get("IBM_QUANTUM_TOKEN")
    crn = os.environ.get("IBM_QUANTUM_CRN")
    if not token or not crn:
        print("[!] IBM_QUANTUM_TOKEN and IBM_QUANTUM_CRN must be set.",
              file=sys.stderr)
        sys.exit(2)

    service = QiskitRuntimeService(
        channel="ibm_cloud",
        token=token,
        instance=crn,
    )

    if use_simulator:
        # Fall back to a local simulator if the user prefers not to
        # burn quantum time. Requires qiskit-aer.
        from qiskit_aer.primitives import SamplerV2 as AerSampler
        backend = None
        sampler = AerSampler()
        backend_name = "aer_simulator"
    else:
        backend = service.least_busy(
            operational=True,
            simulator=False,
            min_num_qubits=min_qubits,
        )
        backend_name = backend.name
        sampler = Sampler(mode=backend)
        sampler.options.default_shots = shots

    n_count = 4  # 4 counting qubits + 4 work qubits = 8 qubits total
    circuit = build_shor_circuit(a, n_count=n_count)

    if backend is not None:
        pm = generate_preset_pass_manager(
            backend=backend, optimization_level=3
        )
        isa_circuit = pm.run(circuit)
    else:
        isa_circuit = circuit

    print(f"[+] Submitting Shor(N={N}, a={a}) circuit to {backend_name} ...")
    job = sampler.run([isa_circuit])
    print(f"[+] Job ID: {job.job_id() if hasattr(job, 'job_id') else 'local'}")
    result = job.result()

    # SamplerV2 returns a PrimitiveResult with a data bin per classical
    # register. The default register from `qc.measure(...)` is named 'c'.
    pub = result[0]
    bit_array = list(pub.data.values())[0]
    counts = bit_array.get_counts()

    # Find the most probable non-zero outcome
    ordered = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    best_bits, _ = next(((b, c) for b, c in ordered if int(b, 2) != 0),
                       (ordered[0][0], ordered[0][1]))
    measured_int = int(best_bits, 2)
    phase = measured_int / (2 ** n_count)
    r = phase_to_order(measured_int, n_count, N)
    factors = factor_from_order(a, r, N) if r else None

    return ShorResult(
        N=N,
        a=a,
        measured_phase=phase,
        inferred_order=r,
        factors=factors,
        counts=counts,
        backend_name=backend_name,
    )


# ---------------------------------------------------------------------------
# 3. Close the loop: reconstruct RSA private key and decrypt
# ---------------------------------------------------------------------------

def rsa_break_from_factors(
    N: int,
    e: int,
    ciphertext: int,
    p: int,
    q: int,
) -> int:
    """
    Given N=p*q, public exponent e, and ciphertext c, reconstruct the
    RSA private exponent d and recover the plaintext m = c^d mod N.
    This step is purely classical — the quantum computer only supplies
    the factorisation, but that is the entire security assumption of RSA.
    """
    assert p * q == N, "Factors do not multiply to N"
    phi = (p - 1) * (q - 1)
    d = pow(e, -1, phi)          # modular inverse via extended Euclid
    return pow(ciphertext, d, N)


# ---------------------------------------------------------------------------
# 4. CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Break toy RSA(N=15) end-to-end using Shor on IBM Quantum."
    )
    parser.add_argument("--simulator", action="store_true",
                        help="Run on qiskit-aer instead of real hardware.")
    parser.add_argument("--a", type=int, default=7,
                        choices=[2, 4, 7, 8, 11, 13],
                        help="Base for Shor's algorithm.")
    parser.add_argument("--shots", type=int, default=1024)
    parser.add_argument("--min-qubits", type=int, default=8)
    args = parser.parse_args()

    # Toy RSA key: N=15, e=7. Encrypt m = 2.
    N, e, m = 15, 7, 2
    c = pow(m, e, N)
    print(f"[+] Toy RSA public key: (N={N}, e={e})")
    print(f"[+] Plaintext m = {m}  -> Ciphertext c = {c}")

    print(f"[+] Running Shor on {'simulator' if args.simulator else 'IBM hardware'}...")
    res = run_on_ibm(
        N=N, a=args.a, shots=args.shots,
        use_simulator=args.simulator,
        min_qubits=args.min_qubits,
    )

    print("\n--- QUANTUM RESULT ---")
    print(f"Backend            : {res.backend_name}")
    print(f"Base a             : {res.a}")
    print(f"Measured phase     : {res.measured_phase:.4f}")
    print(f"Inferred order r   : {res.inferred_order}")
    print(f"Recovered factors  : {res.factors}")
    print(f"Top-5 counts       : {sorted(res.counts.items(), key=lambda kv: kv[1], reverse=True)[:5]}")

    if not res.factors:
        print("\n[!] Shor did not converge this run. Retry with a different 'a' "
              "(e.g. 11 or 13) — this is normal on noisy NISQ hardware; success "
              "rat")
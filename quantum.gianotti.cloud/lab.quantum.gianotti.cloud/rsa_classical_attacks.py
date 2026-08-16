"""
rsa_classical_attacks.py
========================
Classical Attack Surface Simulator for RSA
------------------------------------------

Companion to shor_rsa_ibmq.py. The quantum script demonstrates the
*existential* threat to RSA (Shor's algorithm). This script demonstrates
the *present-day* attack surface — the classical ways nefarious actors
already break RSA deployments in the wild, without a quantum computer.

Purpose
-------
Give enterprise readers a concrete, runnable picture of the attack
categories they must defend against right now, plus the "Harvest Now,
Decrypt Later" (HNDL) risk that makes migration to NIST FIPS 203/204
urgent regardless of when a CRQC actually arrives.

Every attack below is implemented against toy key sizes so it runs in
seconds. Real deployments must not use these key sizes; but the *classes*
of vulnerability apply at every scale unless mitigated.

    pip install sympy pycryptodome

Educational use only. Do not run against systems or keys you don't own.
"""

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass
from typing import Optional

from sympy import gcd, isprime, mod_inverse, nextprime


# ---------------------------------------------------------------------------
# Helper: generate a toy RSA keypair
# ---------------------------------------------------------------------------

@dataclass
class RSAKey:
    n: int
    e: int
    d: int
    p: int
    q: int


def gen_toy_key(bits: int = 32, e: int = 65537) -> RSAKey:
    """Generate a toy RSA keypair. NEVER use these bit sizes in production."""
    while True:
        p = nextprime(random.getrandbits(bits // 2))
        q = nextprime(random.getrandbits(bits // 2))
        if p == q:
            continue
        n = p * q
        phi = (p - 1) * (q - 1)
        if math.gcd(e, phi) == 1:
            d = mod_inverse(e, phi)
            return RSAKey(n=n, e=e, d=d, p=int(p), q=int(q))


# ===========================================================================
# ATTACK 1 — Fermat factorisation (close primes)
# ===========================================================================
# Vulnerability: if p and q are chosen too close together, N = a^2 - b^2
# factors in O((p-q)/2) steps. In 2022 researchers found many production
# TLS certificates with primes only a few bits apart because of a bad
# hardware RNG.
# Mitigation: use certified libraries (BoringSSL, OpenSSL 3, HSMs) that
# enforce prime-distance checks per NIST SP 800-56B.
# ===========================================================================

def fermat_factor(n: int, max_iter: int = 10**6) -> Optional[tuple[int, int]]:
    a = math.isqrt(n)
    if a * a < n:
        a += 1
    for _ in range(max_iter):
        b2 = a * a - n
        b = math.isqrt(b2)
        if b * b == b2:
            return (a - b, a + b)
        a += 1
    return None


# ===========================================================================
# ATTACK 2 — Pollard's rho (small factor discovery)
# ===========================================================================
# Vulnerability: any composite with a "small" prime factor (< 2^80 or so)
# is trivially factorable. Weak RNGs, backdoored PRNGs, or reused primes
# across many keys ("ROCA"-class flaws) expose this.
# Mitigation: FIPS 140-3 validated key generation, high-entropy RNGs,
# and third-party key auditing (e.g. Hastad-style scans).
# ===========================================================================

def pollard_rho(n: int, max_iter: int = 10**6) -> Optional[int]:
    if n % 2 == 0:
        return 2
    x = random.randrange(2, n)
    y = x
    c = random.randrange(1, n)
    d = 1
    for _ in range(max_iter):
        x = (x * x + c) % n
        y = (y * y + c) % n
        y = (y * y + c) % n
        d = math.gcd(abs(x - y), n)
        if d != 1 and d != n:
            return d
        if d == n:
            return None
    return None


# ===========================================================================
# ATTACK 3 — Wiener's attack (small private exponent d)
# ===========================================================================
# Vulnerability: if d < N^0.25 / 3, continued fractions of e/N recover d
# in polynomial time. Small-d optimisation is a common footgun in embedded
# / IoT RSA implementations trying to speed up signing.
# Mitigation: NEVER shrink d for performance. Use CRT-RSA (which is fast
# and safe) or move to Ed25519 / ML-DSA-65 for signatures.
# ===========================================================================

def wiener_attack(e: int, n: int) -> Optional[int]:
    from fractions import Fraction

    def cont_frac(x: Fraction):
        while x.denominator:
            a = x.numerator // x.denominator
            yield a
            x = Fraction(x.denominator, x.numerator - a * x.denominator) \
                if (x.numerator - a * x.denominator) else Fraction(0)
            if x == 0:
                return

    def convergents(cf):
        h1, h0 = 1, 0
        k1, k0 = 0, 1
        for a in cf:
            h1, h0 = a * h1 + h0, h1
            k1, k0 = a * k1 + k0, k1
            yield h1, k1

    for k, d in convergents(cont_frac(Fraction(e, n))):
        if k == 0:
            continue
        phi_guess = (e * d - 1) // k
        # Solve x^2 - (n - phi + 1)x + n = 0 for integer roots
        s = n - phi_guess + 1
        disc = s * s - 4 * n
        if disc < 0:
            continue
        r = math.isqrt(disc)
        if r * r != disc:
            continue
        if (s + r) % 2 == 0:
            return d
    return None


# ===========================================================================
# ATTACK 4 — Common modulus attack
# ===========================================================================
# Vulnerability: two parties share N but use different e's (a common
# certificate-mismanagement pattern in enterprise PKI). Any message
# encrypted under both e1 and e2 with gcd(e1,e2)=1 leaks m via Bezout.
# Mitigation: enforce a *unique* modulus per certificate. Scan your PKI
# for duplicate N values. Automate certificate lifecycle (ACME).
# ===========================================================================

def common_modulus_attack(c1: int, c2: int, e1: int, e2: int, n: int) -> int:
    g, s, t = _egcd(e1, e2)
    assert g == 1, "Common-modulus attack requires gcd(e1,e2)=1"
    if s < 0:
        c1 = mod_inverse(c1, n); s = -s
    if t < 0:
        c2 = mod_inverse(c2, n); t = -t
    return (pow(c1, s, n) * pow(c2, t, n)) % n


def _egcd(a: int, b: int) -> tuple[int, int, int]:
    if b == 0:
        return (a, 1, 0)
    g, x1, y1 = _egcd(b, a % b)
    return (g, y1, x1 - (a // b) * y1)


# ===========================================================================
# ATTACK 5 — "Harvest Now, Decrypt Later" (HNDL) narrative
# ===========================================================================
# Not a code exploit — a strategic threat. A capable adversary records
# encrypted traffic today and stores it. When they later obtain a CRQC
# (~2030-2035 per NSA CNSA 2.0 planning horizon), the stored capture is
# retroactively decrypted with Shor. Any data with a shelf life longer
# than the CRQC arrival window is *already compromised*.
# Mitigation: begin dual-stack (classical + PQC hybrid) key exchange NOW.
# ML-KEM-1024 (FIPS 203) for KEX; ML-DSA-87 (FIPS 204) for signatures.
# ===========================================================================


# ---------------------------------------------------------------------------
# Demonstration driver
# ---------------------------------------------------------------------------

def demo() -> None:
    print("=" * 70)
    print("  RSA CLASSICAL ATTACK-SURFACE SIMULATOR")
    print("  Enterprise Cryptography Advisory — CBJG Holdings LLC")
    print("=" * 70)

    # --- 1. Fermat ---------------------------------------------------------
    print("\n[1] FERMAT FACTORISATION — close-prime vulnerability")
    p = int(nextprime(2**31))
    q = int(nextprime(p + 2**12))  # deliberately close
    n = p * q
    t0 = time.time()
    factors = fermat_factor(n)
    dt = time.time() - t0
    print(f"    N = {n} ({n.bit_length()} bits)")
    print(f"    p and q differ by only ~2^12  →  factored in {dt*1000:.1f} ms")
    print(f"    Recovered: {factors}")

    # --- 2. Pollard rho ----------------------------------------------------
    print("\n[2] POLLARD'S RHO — small-factor / bad-RNG vulnerability")
    key = gen_toy_key(bits=48)
    t0 = time.time()
    f = pollard_rho(key.n)
    dt = time.time() - t0
    print(f"    N = {key.n} ({key.n.bit_length()} bits)")
    print(f"    Rho found factor {f} in {dt*1000:.1f} ms")
    print(f"    True primes: ({key.p}, {key.q})")

    # --- 3. Wiener ---------------------------------------------------------
    print("\n[3] WIENER — small private exponent vulnerability")
    # Craft a key with small d
    p = int(nextprime(random.getrandbits(256)))
    q = int(nextprime(random.getrandbits(256)))
    n = p * q
    phi = (p - 1) * (q - 1)
    d_small = int(nextprime(random.getrandbits(60)))       # d < N^0.25
    while gcd(d_small, phi) != 1:
        d_small = int(nextprime(d_small))
    e = int(mod_inverse(d_small, phi))
    t0 = time.time()
    d_recovered = wiener_attack(e, n)
    dt = time.time() - t0
    print(f"    N ~ 2^{n.bit_length()}, d ~ 2^{d_small.bit_length()}")
    print(f"    Wiener recovered d = {d_recovered} in {dt*1000:.1f} ms")
    print(f"    True d             = {d_small}")

    # --- 4. Common modulus -------------------------------------------------
    print("\n[4] COMMON-MODULUS — duplicate N in enterprise PKI")
    key = gen_toy_key(bits=64)
    n = key.n
    e1, e2 = 3, 65537
    assert gcd(e1, e2) == 1
    m = 424242
    c1 = pow(m, e1, n)
    c2 = pow(m, e2, n)
    m_rec = common_modulus_attack(c1, c2, e1, e2, n)
    print(f"    Same N, two exponents (e1={e1}, e2={e2})")
    print(f"    Plaintext recovered without factoring: {m_rec}  (expected {m})")

    # --- 5. HNDL narrative -------------------------------------------------
    print("\n[5] HARVEST NOW, DECRYPT LATER — strategic quantum threat")
    print("  Any adversary recording your TLS traffic today can decrypt it in 2030-2035")
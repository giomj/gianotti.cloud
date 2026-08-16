/**
 * Thin client for the IBM Quantum (Qiskit Runtime) REST API on IBM Cloud.
 *
 * Auth: IBM Cloud IAM token exchange from the account API key, cached until
 * shortly before expiry. Every runtime request carries the instance CRN in
 * the Service-CRN header. The API key and CRN never leave the server.
 */

const IAM_URL = "https://iam.cloud.ibm.com/identity/token";
const RUNTIME_BASE = "https://quantum.cloud.ibm.com/api/v1";

export class IbmQuantumError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 502,
  ) {
    super(message);
    this.name = "IbmQuantumError";
  }
}

function getCredentials(): { apiKey: string; crn: string } {
  const apiKey = process.env.IBM_QUANTUM_API_KEY;
  const crn = process.env.IBM_QUANTUM_CRN;
  if (!apiKey || !crn) {
    throw new IbmQuantumError(
      "IBM Quantum is not configured on the server (missing API key or instance CRN).",
    );
  }
  return { apiKey, crn };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const { apiKey } = getCredentials();
  const res = await fetch(IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: apiKey,
    }),
  });
  if (!res.ok) {
    cachedToken = null;
    throw new IbmQuantumError(
      res.status === 400 || res.status === 401
        ? "IBM Quantum rejected the configured API key. Check the IBM_QUANTUM_API_KEY secret."
        : `IBM Cloud authentication failed (HTTP ${res.status}).`,
    );
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function runtimeFetch(path: string, init?: RequestInit): Promise<Response> {
  const { crn } = getCredentials();
  const token = await getAccessToken();
  return fetch(`${RUNTIME_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Service-CRN": crn,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

async function runtimeJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await runtimeFetch(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 404) {
      throw new IbmQuantumError("Not found on IBM Quantum.", 404);
    }
    throw new IbmQuantumError(
      `IBM Quantum request failed (HTTP ${res.status}): ${body.slice(0, 300)}`,
    );
  }
  return (await res.json()) as T;
}

export interface BackendInfo {
  name: string;
  qubits: number;
  operational: boolean;
  queueLength: number;
}

/**
 * Circuits are exported by the in-browser shim as ISA circuits over
 * {rz, rx, sx, x, cz} routed for a linear chain of qubits 0..N-1. A backend
 * is only usable when its native basis covers those gates and its coupling
 * map contains that linear chain, so we verify both before offering it.
 */
export const MAX_CIRCUIT_QUBITS = 6;
const REQUIRED_BASIS = ["rz", "rx", "x", "cz"];

function supportsLinearChain(
  coupling: number[][] | undefined,
  basis: string[] | undefined,
): boolean {
  if (!coupling || !basis) return false;
  if (!REQUIRED_BASIS.every((g) => basis.includes(g))) return false;
  const pairs = new Set(coupling.map(([a, b]) => `${Math.min(a!, b!)}-${Math.max(a!, b!)}`));
  for (let i = 0; i < MAX_CIRCUIT_QUBITS - 1; i++) {
    if (!pairs.has(`${i}-${i + 1}`)) return false;
  }
  return true;
}

export async function listBackends(): Promise<BackendInfo[]> {
  const { devices } = await runtimeJson<{ devices: string[] }>("/backends");
  const infos = await Promise.all(
    devices.map(async (name): Promise<BackendInfo | null> => {
      try {
        const [status, config] = await Promise.all([
          runtimeJson<{ state: boolean; status: string; length_queue: number }>(
            `/backends/${encodeURIComponent(name)}/status`,
          ),
          runtimeJson<{
            n_qubits: number;
            simulator: boolean;
            basis_gates?: string[];
            coupling_map?: number[][];
          }>(`/backends/${encodeURIComponent(name)}/configuration`),
        ]);
        if (config.simulator) return null;
        if (!supportsLinearChain(config.coupling_map, config.basis_gates)) return null;
        return {
          name,
          qubits: config.n_qubits,
          operational: status.state && status.status === "active",
          queueLength: status.length_queue ?? 0,
        };
      } catch {
        return null; // skip backends we cannot inspect
      }
    }),
  );
  const list = infos.filter((b): b is BackendInfo => b !== null);
  if (list.length === 0) {
    throw new IbmQuantumError("No IBM Quantum backends are available to this account.");
  }
  return list.sort((a, b) => a.queueLength - b.queueLength);
}

export async function pickLeastBusyBackend(): Promise<BackendInfo> {
  const backends = await listBackends();
  const operational = backends.filter((b) => b.operational);
  if (operational.length === 0) {
    throw new IbmQuantumError(
      "All IBM Quantum backends are currently offline. Try again later.",
    );
  }
  return operational[0]!;
}

export async function submitSamplerJob(
  qasm: string,
  backend: string,
  shots: number,
): Promise<string> {
  const res = await runtimeFetch("/jobs", {
    method: "POST",
    body: JSON.stringify({
      program_id: "sampler",
      backend,
      params: {
        pubs: [[qasm]],
        shots,
        version: 2,
        options: {},
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 400) {
      throw new IbmQuantumError(
        `IBM Quantum rejected the circuit: ${extractIbmError(body)}`,
        400,
      );
    }
    throw new IbmQuantumError(
      `IBM Quantum job submission failed (HTTP ${res.status}): ${extractIbmError(body)}`,
    );
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

function extractIbmError(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return (
      parsed?.errors?.[0]?.message ||
      parsed?.detail ||
      parsed?.title ||
      body.slice(0, 300)
    );
  } catch {
    return body.slice(0, 300);
  }
}

export type JobPhase = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface JobStatus {
  jobId: string;
  backend: string;
  status: JobPhase;
  error?: string;
}

function mapStatus(status: string, reason?: string): { status: JobPhase; error?: string } {
  switch (status) {
    case "Queued":
      return { status: "queued" };
    case "Running":
      return { status: "running" };
    case "Completed":
      return { status: "completed" };
    case "Cancelled":
      return { status: "cancelled" };
    case "Failed":
      return { status: "failed", error: reason || "The job failed on IBM Quantum." };
    default:
      return { status: "queued" };
  }
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const data = await runtimeJson<{
    id: string;
    backend: string;
    status: string;
    state?: { status?: string; reason?: string };
  }>(`/jobs/${encodeURIComponent(jobId)}`);
  const raw = data.state?.status || data.status;
  const mapped = mapStatus(raw, data.state?.reason);
  return { jobId: data.id, backend: data.backend, ...mapped };
}

export interface CountEntry {
  outcome: string;
  count: number;
}

/** Fetch sampler v2 results and reduce them to measurement counts. */
export async function getJobCounts(
  jobId: string,
): Promise<{ counts: CountEntry[]; shots: number }> {
  const data = await runtimeJson<any>(`/jobs/${encodeURIComponent(jobId)}/results`);
  const pub = data?.results?.[0];
  const fields = pub?.data ?? {};
  // Sampler v2 returns one BitArray per classical register; take the first.
  const registers = Object.values(fields) as any[];
  const bitArray = registers.find((r) => r && r.samples && r.num_bits != null);
  if (!bitArray) {
    throw new IbmQuantumError("IBM Quantum returned results in an unexpected format.");
  }
  const numBits: number = bitArray.num_bits;
  const samples: string[] = bitArray.samples; // hex strings like "0x3"
  const tally = new Map<string, number>();
  for (const s of samples) {
    const value = BigInt(s);
    const bits = value.toString(2).padStart(numBits, "0");
    tally.set(bits, (tally.get(bits) ?? 0) + 1);
  }
  const counts = [...tally.entries()]
    .map(([outcome, count]) => ({ outcome, count }))
    .sort((a, b) => a.outcome.localeCompare(b.outcome));
  return { counts, shots: samples.length };
}

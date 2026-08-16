import { Router, type IRouter } from "express";
import {
  SubmitQuantumJobBody,
  SubmitQuantumJobResponse,
  GetQuantumJobParams,
  GetQuantumJobResponse,
  ListQuantumBackendsResponse,
} from "@workspace/api-zod";
import {
  IbmQuantumError,
  MAX_CIRCUIT_QUBITS,
  listBackends,
  pickLeastBusyBackend,
  submitSamplerJob,
  getJobStatus,
  getJobCounts,
} from "../lib/ibmQuantum";

const router: IRouter = Router();

const MAX_SHOTS = 4096;
const DEFAULT_SHOTS = 1024;
const MAX_QASM_BYTES = 20_000;

/**
 * Jobs submitted by this server: jobId -> shots. Also acts as an access
 * gate — only jobs this server created can be polled through the API, so
 * the endpoint cannot be used to read arbitrary jobs on the IBM account.
 * In-memory: a restart forgets in-flight jobs (polling then 404s), an
 * acceptable tradeoff for a single-author blog.
 */
const jobShots = new Map<string, number>();

/** Basic per-IP rate limit for hardware submissions. */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_JOBS = 5;
const submissionLog = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entries = (submissionLog.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (entries.length >= RATE_LIMIT_MAX_JOBS) {
    submissionLog.set(ip, entries);
    return true;
  }
  entries.push(now);
  submissionLog.set(ip, entries);
  // keep the map from growing without bound
  if (submissionLog.size > 5000) {
    for (const [key, times] of submissionLog) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) submissionLog.delete(key);
    }
  }
  return false;
}

/** Extract the declared qubit count from the exported QASM. */
function qasmQubitCount(qasm: string): number | null {
  const m = qasm.match(/^\s*qubit\[(\d+)\]/m);
  return m ? parseInt(m[1]!, 10) : null;
}

function handleError(res: any, err: unknown): void {
  if (err instanceof IbmQuantumError) {
    res.status(err.statusCode === 400 || err.statusCode === 404 ? err.statusCode : 502)
      .json({ error: err.message });
    return;
  }
  console.error("IBM Quantum error:", err);
  res.status(502).json({ error: "Could not reach IBM Quantum. Try again later." });
}

router.get("/quantum/backends", async (_req, res): Promise<void> => {
  try {
    const backends = await listBackends();
    res.json(ListQuantumBackendsResponse.parse(backends));
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/quantum/jobs", async (req, res): Promise<void> => {
  const parsed = SubmitQuantumJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { qasm, backend: requestedBackend } = parsed.data;
  if (Buffer.byteLength(qasm, "utf8") > MAX_QASM_BYTES) {
    res.status(400).json({ error: "Circuit is too large to run on hardware from the blog." });
    return;
  }
  const qubits = qasmQubitCount(qasm);
  if (qubits === null || qubits < 1 || qubits > MAX_CIRCUIT_QUBITS) {
    res.status(400).json({
      error: `Hardware runs are limited to circuits of 1-${MAX_CIRCUIT_QUBITS} qubits.`,
    });
    return;
  }
  if (rateLimited(req.ip ?? "unknown")) {
    res.status(429).json({
      error: "Too many hardware runs. Real quantum computers are a shared resource — try again in a few minutes.",
    });
    return;
  }
  const shots = Math.min(Math.round(parsed.data.shots ?? DEFAULT_SHOTS), MAX_SHOTS);
  try {
    let backend: string;
    if (requestedBackend) {
      const available = await listBackends();
      const found = available.find((b) => b.name === requestedBackend);
      if (!found) {
        res.status(400).json({ error: `Backend "${requestedBackend}" is not available.` });
        return;
      }
      backend = found.name;
    } else {
      backend = (await pickLeastBusyBackend()).name;
    }
    const jobId = await submitSamplerJob(qasm, backend, shots);
    jobShots.set(jobId, shots);
    res.status(201).json(SubmitQuantumJobResponse.parse({ jobId, backend, shots }));
  } catch (err) {
    handleError(res, err);
  }
});

router.get("/quantum/jobs/:jobId", async (req, res): Promise<void> => {
  const params = GetQuantumJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!jobShots.has(params.data.jobId)) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  try {
    const status = await getJobStatus(params.data.jobId);
    if (status.status !== "completed") {
      res.json(
        GetQuantumJobResponse.parse({
          jobId: status.jobId,
          backend: status.backend,
          status: status.status,
          shots: jobShots.get(status.jobId),
          error: status.error,
        }),
      );
      return;
    }
    const { counts, shots } = await getJobCounts(status.jobId);
    res.json(
      GetQuantumJobResponse.parse({
        jobId: status.jobId,
        backend: status.backend,
        status: "completed",
        shots,
        counts,
      }),
    );
  } catch (err) {
    handleError(res, err);
  }
});

export default router;

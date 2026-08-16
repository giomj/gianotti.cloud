'use strict';

/**
 * Background worker starter.
 *
 * Runs a fixed-interval loop. Every cycle takes a Postgres advisory lock first,
 * so running several replicas is safe: exactly one does the work, the others
 * skip and stay warm as standbys.
 *
 * Liveness is a file the worker touches each cycle, checked by an exec probe.
 * A worker that has wedged mid-cycle stops touching it and gets restarted.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Pool } = require('pg');

const INTERVAL_MS = Number(process.env.INTERVAL_SECONDS || 60) * 1000;
const LOCK_KEY = Number(process.env.ADVISORY_LOCK_KEY || 872341);
const HEARTBEAT_FILE = process.env.HEARTBEAT_FILE || path.join(os.tmpdir(), 'worker-heartbeat');
const RETENTION_DAYS = Number(process.env.NOTE_RETENTION_DAYS || 90);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  connectionTimeoutMillis: 5000,
  ...(process.env.PGSSLMODE === 'require' ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => console.error('idle client error', err.message));

let running = true;
let currentCycle = Promise.resolve();

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_runs (
      id          bigserial PRIMARY KEY,
      job         text        NOT NULL,
      worker      text        NOT NULL,
      started_at  timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz,
      outcome     text,
      detail      text
    )
  `);
}

/**
 * The actual work. Replace the body with whatever the platform needs; the
 * locking, logging, and shutdown handling around it stay the same.
 */
async function doWork(client) {
  const { rowCount } = await client.query(
    `DELETE FROM notes WHERE created_at < now() - ($1 || ' days')::interval`,
    [RETENTION_DAYS],
  );
  return `pruned ${rowCount} note(s) older than ${RETENTION_DAYS} days`;
}

async function cycle() {
  const client = await pool.connect();
  const worker = os.hostname();

  try {
    const { rows } = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [LOCK_KEY]);
    if (!rows[0].acquired) {
      console.log('another replica holds the lock; standing by');
      return;
    }

    const start = await client.query(
      'INSERT INTO job_runs (job, worker) VALUES ($1, $2) RETURNING id',
      ['prune-notes', worker],
    );
    const runId = start.rows[0].id;

    try {
      const detail = await doWork(client);
      await client.query(
        'UPDATE job_runs SET finished_at = now(), outcome = $2, detail = $3 WHERE id = $1',
        [runId, 'ok', detail],
      );
      console.log(detail);
    } catch (err) {
      await client.query(
        'UPDATE job_runs SET finished_at = now(), outcome = $2, detail = $3 WHERE id = $1',
        [runId, 'failed', err.message],
      );
      throw err;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}

async function loop() {
  while (running) {
    currentCycle = cycle().catch((err) => console.error('cycle failed:', err.message));
    await currentCycle;

    try {
      fs.writeFileSync(HEARTBEAT_FILE, String(Date.now()));
    } catch (err) {
      console.error('could not write heartbeat:', err.message);
    }

    // Sleep in short slices so SIGTERM is noticed promptly.
    for (let waited = 0; running && waited < INTERVAL_MS; waited += 500) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

migrate()
  .then(() => {
    console.log(`worker started, cycle every ${INTERVAL_MS / 1000}s`);
    return loop();
  })
  .then(async () => {
    await pool.end().catch(() => {});
    console.log('worker stopped cleanly');
    process.exit(0);
  })
  .catch((err) => {
    console.error('worker failed:', err.message);
    process.exit(1);
  });

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    if (!running) return;
    console.log(`${signal} received, finishing the current cycle`);
    running = false;
    // Hard stop if the in-flight cycle will not end.
    setTimeout(() => process.exit(1), 30000).unref();
  });
}
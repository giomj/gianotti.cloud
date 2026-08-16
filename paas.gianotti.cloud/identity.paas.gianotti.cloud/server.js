'use strict';

/**
 * API starter.
 *
 * Demonstrates the two wires the platform provides: a private managed database
 * reached with credentials from the `database` secret, and access tokens issued
 * by the platform realm.
 */

const http = require('node:http');
const { Pool } = require('pg');
const { TokenVerifier, AuthError } = require('./auth');

const PORT = Number(process.env.PORT || 8080);
const ISSUER = (process.env.OIDC_ISSUER || '').replace(/\/+$/, '');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '';

if (!ISSUER) {
  console.error('OIDC_ISSUER is required, e.g. https://id.example.com/realms/platform');
  process.exit(1);
}

// Terraform writes DATABASE_URL into the namespace secret. PG* variables are
// there too, and node-postgres reads them when DATABASE_URL is absent.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ...(process.env.PGSSLMODE === 'require' ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => console.error('idle client error', err.message));

const verifier = new TokenVerifier({
  issuer: ISSUER,
  jwksUri: process.env.OIDC_JWKS_URI,
  audience: process.env.OIDC_AUDIENCE || null,
});

// --- Schema -----------------------------------------------------------------

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id          bigserial PRIMARY KEY,
      subject     text        NOT NULL,
      body        text        NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS notes_subject_idx ON notes (subject, created_at DESC)');
}

// --- Routes -----------------------------------------------------------------

const routes = {
  // Liveness: answers even when the database is unreachable, so Kubernetes does
  // not restart healthy pods during a database blip.
  'GET /healthz': async () => ({ status: 200, body: { ok: true } }),

  // Readiness: takes the pod out of the load balancer when the database is gone.
  'GET /readyz': async () => {
    try {
      await pool.query('SELECT 1');
      return { status: 200, body: { ok: true, database: 'up' } };
    } catch (err) {
      return { status: 503, body: { ok: false, database: 'down', detail: err.message } };
    }
  },

  'GET /api/whoami': async (req) => {
    const claims = await verifier.fromRequest(req);
    return {
      status: 200,
      body: {
        subject: claims.sub,
        email: claims.email || null,
        name: claims.name || claims.preferred_username || null,
        emailVerified: Boolean(claims.email_verified),
        // Present when the person signed in through Google rather than a
        // password held by this platform.
        identityProvider: claims.identity_provider || null,
        issuedAt: claims.iat,
        expiresAt: claims.exp,
      },
    };
  },

  'GET /api/notes': async (req) => {
    const claims = await verifier.fromRequest(req);
    const { rows } = await pool.query(
      'SELECT id, body, created_at FROM notes WHERE subject = $1 ORDER BY created_at DESC LIMIT 50',
      [claims.sub],
    );
    return { status: 200, body: { notes: rows } };
  },

  'POST /api/notes': async (req, body) => {
    const claims = await verifier.fromRequest(req);
    const text = String(body.body || '').trim();

    if (!text) return { status: 400, body: { error: 'Write something first.' } };
    if (text.length > 2000) return { status: 400, body: { error: 'Keep it under 2000 characters.' } };

    const { rows } = await pool.query(
      'INSERT INTO notes (subject, body) VALUES ($1, $2) RETURNING id, body, created_at',
      [claims.sub, text],
    );
    return { status: 201, body: rows[0] };
  },
};

// --- Server -----------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return send(res, 404, { error: 'No such endpoint.' });

  try {
    const body = await readJson(req);
    const result = await handler(req, body);
    return send(res, result.status, result.body);
  } catch (err) {
    if (err instanceof AuthError) return send(res, err.status, { error: err.message });
    console.error(err);
    return send(res, 500, { error: 'Unexpected error.' });
  }
});

function corsHeaders() {
  if (!CORS_ORIGIN) return {};
  return {
    'access-control-allow-origin': CORS_ORIGIN,
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-max-age': '600',
    vary: 'origin',
  };
}

async function readJson(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256 * 1024) throw new AuthError('Request body is too large.', 413);
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AuthError('Request body is not valid JSON.', 400);
  }
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'x-content-type-options': 'nosniff',
    ...corsHeaders(),
  });
  res.end(payload);
}

// --- Lifecycle --------------------------------------------------------------

migrate()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`api listening on :${PORT}`);
      console.log(`  issuer ${ISSUER}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });

// Finish in-flight requests before exiting, so rolling updates drop nothing.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, draining`);
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 15000).unref();
  });
}
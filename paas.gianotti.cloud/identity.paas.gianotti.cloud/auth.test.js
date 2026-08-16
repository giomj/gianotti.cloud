// Token verification tests. No dependencies and no network: a key pair is
// generated in-process and served from a throwaway JWKS endpoint.
//
//   npm test
const crypto = require('node:crypto');
const http = require('node:http');
const { TokenVerifier } = require('../src/auth.js');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
jwk.kid = 'test-key-1'; jwk.alg = 'RS256'; jwk.use = 'sig'; jwk.kty = 'RSA';

const ISSUER = 'http://127.0.0.1:9500/realms/platform';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function sign(claims, opts = {}) {
  const header = { alg: opts.alg || 'RS256', kid: opts.kid || 'test-key-1', typ: 'JWT' };
  const signing = `${b64(header)}.${b64(claims)}`;
  const sig = crypto.sign('sha256', Buffer.from(signing), privateKey).toString('base64url');
  return `${signing}.${opts.badSig ? 'AAAA' : sig}`;
}

const now = Math.floor(Date.now() / 1000);
const base = { sub: 'user-1', iss: ISSUER, exp: now + 300, iat: now, azp: 'web', email: 'a@b.c' };

let jwksHits = 0;
const server = http.createServer((req, res) => {
  jwksHits++;
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ keys: [jwk] }));
}).listen(9500, async () => {
  const v = new TokenVerifier({ issuer: ISSUER, audience: 'web' });
  const cases = [
    ['valid token', () => v.verify(sign(base)), true],
    ['expired', () => v.verify(sign({ ...base, exp: now - 3600 })), false],
    ['wrong issuer', () => v.verify(sign({ ...base, iss: 'http://evil/realms/x' })), false],
    ['tampered signature', () => v.verify(sign(base, { badSig: true })), false],
    ['alg none downgrade', () => v.verify(sign(base, { alg: 'none' })), false],
    ['unknown kid', () => v.verify(sign(base, { kid: 'nope' })), false],
    ['wrong audience', () => v.verify(sign({ ...base, azp: 'other', aud: 'other' })), false],
    ['malformed', () => v.verify('not.a.token'), false],
    ['aud array match', () => v.verify(sign({ ...base, azp: 'x', aud: ['web', 'account'] })), true],
  ];

  let failures = 0;
  for (const [name, fn, shouldPass] of cases) {
    let passed;
    try { await fn(); passed = true; } catch (e) { passed = false; }
    const ok = passed === shouldPass;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} (expected ${shouldPass ? 'accept' : 'reject'})`);
  }
  console.log(`\nJWKS fetches: ${jwksHits} (caching works if small)`);
  console.log(failures ? `${failures} FAILURES` : 'all auth tests passed');
  server.close();
  process.exit(failures ? 1 : 0);
});
'use strict';

/**
 * Access-token verification against the platform realm.
 *
 * Uses only node:crypto. Keys are fetched from the realm's JWKS endpoint and
 * cached; an unknown `kid` forces one refresh, which is how key rotation is
 * picked up without a restart.
 */

const crypto = require('node:crypto');

const ALLOWED_ALGS = new Set(['RS256', 'RS384', 'RS512']);

const ALG_TO_HASH = {
  RS256: 'sha256',
  RS384: 'sha384',
  RS512: 'sha512',
};

class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

class TokenVerifier {
  constructor({ issuer, jwksUri, audience, clockToleranceSeconds = 30 }) {
    this.issuer = issuer.replace(/\/+$/, '');
    this.jwksUri = jwksUri || `${this.issuer}/protocol/openid-connect/certs`;
    this.audience = audience;
    this.clockTolerance = clockToleranceSeconds;
    this.keys = new Map();
    this.lastFetch = 0;
    this.inflight = null;
  }

  async _refreshKeys(force = false) {
    const age = Date.now() - this.lastFetch;
    if (!force && this.keys.size && age < 10 * 60 * 1000) return;

    // Collapse concurrent refreshes into one request.
    if (this.inflight) return this.inflight;

    this.inflight = (async () => {
      const res = await fetch(this.jwksUri, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new AuthError('Could not fetch signing keys.', 503);

      const { keys } = await res.json();
      this.keys.clear();
      for (const jwk of keys || []) {
        if (jwk.kty !== 'RSA' || (jwk.use && jwk.use !== 'sig')) continue;
        try {
          this.keys.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
        } catch {
          /* skip unusable key */
        }
      }
      this.lastFetch = Date.now();
    })().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  async verify(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) throw new AuthError('Malformed token.');

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    let header;
    let claims;
    try {
      header = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8'));
      claims = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8'));
    } catch {
      throw new AuthError('Token is not valid JSON.');
    }

    if (!ALLOWED_ALGS.has(header.alg)) {
      throw new AuthError(`Unsupported signing algorithm: ${header.alg}`);
    }

    await this._refreshKeys();
    let key = this.keys.get(header.kid);
    if (!key) {
      await this._refreshKeys(true);
      key = this.keys.get(header.kid);
    }
    if (!key) throw new AuthError('Token was signed with an unknown key.');

    const signed = Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8');
    const signature = base64UrlDecode(encodedSignature);

    if (!crypto.verify(ALG_TO_HASH[header.alg], signed, key, signature)) {
      throw new AuthError('Token signature does not verify.');
    }

    const now = Math.floor(Date.now() / 1000);

    if (typeof claims.exp !== 'number' || claims.exp + this.clockTolerance < now) {
      throw new AuthError('Token has expired.');
    }
    if (typeof claims.nbf === 'number' && claims.nbf - this.clockTolerance > now) {
      throw new AuthError('Token is not valid yet.');
    }
    if (claims.iss !== this.issuer) {
      throw new AuthError(`Token was issued by ${claims.iss}, not ${this.issuer}.`);
    }
    if (this.audience) {
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!audiences.includes(this.audience) && claims.azp !== this.audience) {
        throw new AuthError('Token was not issued for this API.');
      }
    }

    return claims;
  }

  /** Reads and verifies the bearer token on a request. */
  async fromRequest(req) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (!token || scheme.toLowerCase() !== 'bearer') {
      throw new AuthError('Send an access token in the Authorization header.');
    }
    return this.verify(token);
  }
}

function base64UrlDecode(value) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

module.exports = { TokenVerifier, AuthError };
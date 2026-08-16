'use strict';

/**
 * Authorization Code flow with PKCE against the platform realm.
 *
 * The web client is public: it holds no secret, and the code verifier is what
 * proves the token request came from the browser that started the flow.
 *
 * Tokens live in sessionStorage so a page reload does not force a new sign-in.
 * That is a deliberate trade: it is readable by any script running on this
 * origin. For anything handling sensitive data, put a backend-for-frontend in
 * front of this and keep tokens in an httpOnly cookie instead.
 */

const CONFIG = window.__CONFIG || {};
const STORE = window.sessionStorage;

const $ = (id) => document.getElementById(id);

const views = {
  anon: $('view-anon'),
  user: $('view-user'),
  loading: $('view-loading'),
};

let endpoints = null;
let session = null;

// --- Discovery --------------------------------------------------------------

async function discover() {
  if (endpoints) return endpoints;
  const res = await fetch(`${CONFIG.authority}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error('Cannot reach the identity service.');
  const doc = await res.json();
  endpoints = {
    authorization: doc.authorization_endpoint,
    token: doc.token_endpoint,
    endSession: doc.end_session_endpoint,
    // Keycloak exposes self-registration one path along from the auth endpoint.
    registration: doc.authorization_endpoint.replace(/\/auth$/, '/registrations'),
  };
  return endpoints;
}

// --- PKCE -------------------------------------------------------------------

function randomString(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64Url(buffer);
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

async function startAuth({ endpoint, idpHint } = {}) {
  const { authorization } = await discover();
  const verifier = randomString();
  const state = randomString(16);

  STORE.setItem('pkce_verifier', verifier);
  STORE.setItem('auth_state', state);

  const params = new URLSearchParams({
    client_id: CONFIG.clientId,
    response_type: 'code',
    scope: 'openid profile email',
    redirect_uri: redirectUri(),
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: 'S256',
  });

  // Skips the Keycloak login page and goes straight to Google.
  if (idpHint) params.set('kc_idp_hint', idpHint);

  window.location.assign(`${endpoint || authorization}?${params}`);
}

function redirectUri() {
  return `${window.location.origin}/callback`;
}

async function completeAuth(code, state) {
  if (state !== STORE.getItem('auth_state')) {
    throw new Error('Sign-in could not be verified. Start again.');
  }

  const { token } = await discover();
  const verifier = STORE.getItem('pkce_verifier');

  const res = await fetch(token, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CONFIG.clientId,
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  });

  STORE.removeItem('pkce_verifier');
  STORE.removeItem('auth_state');

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error_description || 'The identity service rejected the sign-in.');
  }

  const tokens = await res.json();
  STORE.setItem('tokens', JSON.stringify(tokens));
  window.history.replaceState({}, '', '/');
  return tokens;
}

function loadTokens() {
  try {
    return JSON.parse(STORE.getItem('tokens') || 'null');
  } catch {
    return null;
  }
}

function signOut() {
  const tokens = loadTokens();
  STORE.removeItem('tokens');

  if (!endpoints || !endpoints.endSession) {
    window.location.assign('/');
    return;
  }

  const params = new URLSearchParams({
    post_logout_redirect_uri: window.location.origin,
    client_id: CONFIG.clientId,
  });
  if (tokens && tokens.id_token) params.set('id_token_hint', tokens.id_token);

  window.location.assign(`${endpoints.endSession}?${params}`);
}

// --- API --------------------------------------------------------------------

async function api(method, path, body) {
  const tokens = loadTokens();
  if (!tokens) throw new Error('Not signed in.');

  const res = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${tokens.access_token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    STORE.removeItem('tokens');
    throw new Error('Your session expired. Sign in again.');
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `The API returned ${res.status}.`);
  return payload;
}

// --- Rendering --------------------------------------------------------------

function show(name, message) {
  for (const [key, node] of Object.entries(views)) node.hidden = key !== name;
  if (name === 'loading' && message) $('loading-text').textContent = message;
}

function renderUser(profile) {
  $('user-name').textContent = profile.name || 'Signed in';
  $('user-email').textContent = profile.email || '';
  $('fact-idp').textContent = profile.identityProvider
    ? titleCase(profile.identityProvider)
    : 'A password held by this platform';
  $('fact-verified').textContent = profile.emailVerified ? 'Yes' : 'Not yet';
  $('fact-sub').textContent = profile.subject;
  $('user-stamp').firstElementChild.textContent = profile.emailVerified ? 'Verified' : 'Admitted';
}

function renderNotes(notes) {
  const list = $('notelist');
  list.textContent = '';

  if (!notes.length) {
    const empty = document.createElement('li');
    empty.className = 'notelist__empty';
    empty.textContent = 'Nothing here yet. Add the first one.';
    list.append(empty);
    return;
  }

  for (const note of notes) {
    const item = document.createElement('li');
    item.className = 'note';

    const body = document.createElement('p');
    body.className = 'note__body';
    body.textContent = note.body;

    const when = document.createElement('p');
    when.className = 'note__when';
    when.textContent = new Date(note.created_at).toLocaleString();

    item.append(body, when);
    list.append(item);
  }
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function footnote(id, message, tone) {
  const node = $(id);
  node.textContent = message || '';
  if (tone) node.dataset.tone = tone;
  else delete node.dataset.tone;
}

// --- Wiring -----------------------------------------------------------------

$('btn-signin').addEventListener('click', () => startAuth().catch(fail));
$('btn-google').addEventListener('click', () => startAuth({ idpHint: 'google' }).catch(fail));

$('btn-register').addEventListener('click', async () => {
  try {
    const { registration } = await discover();
    await startAuth({ endpoint: registration });
  } catch (err) {
    fail(err);
  }
});

$('btn-signout').addEventListener('click', signOut);

$('btn-add-note').addEventListener('click', async () => {
  const input = $('note-body');
  const text = input.value.trim();
  if (!text) return;

  const button = $('btn-add-note');
  button.disabled = true;
  try {
    await api('POST', '/api/notes', { body: text });
    input.value = '';
    const { notes } = await api('GET', '/api/notes');
    renderNotes(notes);
    footnote('notes-note', '');
  } catch (err) {
    footnote('notes-note', err.message, 'bad');
  } finally {
    button.disabled = false;
  }
});

function fail(err) {
  show('anon');
  footnote('anon-note', err.message, 'bad');
}

async function start() {
  $('anon-title').textContent = CONFIG.platformName || 'Platform';
  $('colophon').textContent = `${CONFIG.platformName || 'Platform'} — starter frontend`;
  show('loading');

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    window.history.replaceState({}, '', '/');
    return fail(new Error(url.searchParams.get('error_description') || error));
  }

  try {
    if (code) {
      show('loading', 'Completing sign-in');
      await completeAuth(code, url.searchParams.get('state'));
    }

    if (!loadTokens()) return show('anon');

    show('loading', 'Loading your account');
    await discover();
    const profile = await api('GET', '/api/whoami');
    renderUser(profile);

    try {
      const { notes } = await api('GET', '/api/notes');
      renderNotes(notes);
    } catch (err) {
      footnote('notes-note', err.message, 'bad');
    }

    show('user');
  } catch (err) {
    fail(err);
  }
}

start();
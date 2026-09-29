/* ================= BACKEND CLIENT =================
   Every server call goes through api(). The server answers writes with
   { data, state }: `data` is the operation's result, `state` the caller's
   fresh snapshot, which hydrate() pours into the same S object the pages
   already read — so screens redraw exactly as before, just from real data. */
import { S, HIST_DATES, PAGE_URLS, notify, goTo, staffDefaults } from './state';

const TOKEN_KEY = 'rad.token';
const USER_KEY = 'rad.user';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}
function setSession(token, user) {
  try {
    if (token) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); }
    else { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
  } catch (e) { /* private mode: session lives until reload */ }
}
export function currentUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) { return null; }
}

/* ---------- transport ---------- */
let issued = 0;    // sequence of requests sent
let applied = 0;   // sequence of the newest snapshot already shown

export async function api(method, path, body) {
  const seq = ++issued;
  const token = getToken();
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (e) {
    S.serverDown = true; notify();
    const err = new Error('Cannot reach the server — check your connection and try again.');
    err.network = true;
    throw err;
  }
  let json = null;
  try { json = await res.json(); } catch (e) { /* empty body */ }
  if (S.serverDown) { S.serverDown = false; notify(); }
  if (!res.ok) {
    if (res.status === 401 && token && path !== '/auth/login') expireSession();
    const err = new Error((json && json.error) || 'Request failed (' + res.status + ')');
    err.status = res.status;
    throw err;
  }
  /* Only the newest snapshot wins, so a slow poll can never overwrite a fresh write */
  if (json && json.state && seq >= applied) {
    applied = seq;
    hydrate(json.state);
  }
  return json ? json.data : null;
}

/* Run an action; failures show the server's message the way the prototype showed validation alerts */
export async function run(fn) {
  try { return await fn(); }
  catch (e) { alert(e.message); return undefined; }
}

/* Ignore a second tap on the same button while its request is still in flight */
const inflight = new Set();
export async function once(key, fn) {
  if (inflight.has(key)) return undefined;
  inflight.add(key);
  try { return await fn(); }
  finally { inflight.delete(key); }
}

/* ---------- snapshot -> S ---------- */
export function hydrate(st) {
  /* Anything the snapshot doesn't carry belongs to a role the caller doesn't have */
  const defaults = staffDefaults();
  Object.keys(defaults).forEach((k) => { S[k] = defaults[k]; });
  Object.keys(st).forEach((k) => {
    if (k === 'HIST_DATES') HIST_DATES.splice(0, HIST_DATES.length, ...st.HIST_DATES);
    else if (k === 'today') S.today = st.today;
    else S[k] = st[k];
  });
  S.role = st.role || null;
  Object.keys(S.billingState).forEach((id) => { S.billingState[id].startedAt = new Date(S.billingState[id].startedAt); });
  if (HIST_DATES.indexOf(S.histDate) === -1) S.histDate = HIST_DATES[0];
  if (HIST_DATES.indexOf(S.rptDate) === -1) S.rptDate = HIST_DATES[0];
  S.ready = true;
  notify();
}

/* ---------- loading & polling ---------- */
export async function refresh() {
  try { await api('GET', '/state'); }
  catch (e) { S.ready = true; notify(); }   // stop the splash even when the server is down
}

let pollTimer = null;
export function startPolling(ms = 5000) {
  if (pollTimer) return;
  pollTimer = setInterval(() => { if (!document.hidden) refresh(); }, ms);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
}

/* ---------- sessions ---------- */
function expireSession() {
  setSession(null);
  S.role = null;
  goTo(window.location.pathname.indexOf('/owner') === 0 ? PAGE_URLS['owner-login'] : PAGE_URLS['admin-login']);
  refresh();
}

export async function login(role, name, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, name, password })
  }).catch(() => { throw new Error('Cannot reach the server — check your connection and try again.'); });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Sign-in failed');
  setSession(json.token, json.user);
  applied = ++issued;
  hydrate(json.state);
  return json.user;
}

export function logout() {
  setSession(null);
  refresh();
}

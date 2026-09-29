/* Small shared helpers: time formatting in the shop's timezone, input
   validation and the HTTP error type every route throws. */

export const TZ = process.env.SHOP_TZ || 'Asia/Jakarta';
export const MEMBER_POINT_CAP = 300;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const bad = (msg) => new HttpError(400, msg);
export const notFound = (msg) => new HttpError(404, msg || 'Not found');
export const conflict = (msg) => new HttpError(409, msg);

/* ---------- time ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short'
});

export function parts(ts) {
  const o = {};
  partsFmt.formatToParts(new Date(ts)).forEach((p) => { o[p.type] = p.value; });
  return {
    y: +o.year, m: +o.month, d: +o.day,
    h: +o.hour % 24, min: +o.minute, weekday: o.weekday
  };
}
const p2 = (n) => (n < 10 ? '0' + n : '' + n);

/* '16 Sep 2026' — the format every date column and date picker uses */
export function fmtDate(ts) {
  const q = parts(ts);
  return p2(q.d) + ' ' + MONTHS[q.m - 1] + ' ' + q.y;
}
/* '16 Sep' — feedback list */
export function fmtDay(ts) {
  const q = parts(ts);
  return p2(q.d) + ' ' + MONTHS[q.m - 1];
}
export function fmtClock(ts) {
  const q = parts(ts);
  return p2(q.h) + ':' + p2(q.min);
}
/* '16092026' — used inside booking codes */
export function fmtCompact(ts) {
  const q = parts(ts);
  return p2(q.d) + p2(q.m) + q.y;
}
export const todayStr = () => fmtDate(Date.now());

/* 'Today · 19:55' or '15 Sep · 21:10', decided when the row is read so a
   stored timestamp never says "Today" about yesterday. */
export function atLabel(ts, sep = ' · ') {
  const day = fmtDate(ts) === todayStr() ? 'Today' : fmtDay(ts);
  return day + sep + fmtClock(ts);
}

/* The last n calendar days, newest first: today, yesterday, ... */
export function lastDates(n) {
  const out = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) out.push(fmtDate(now - i * 86400000));
  return out;
}

/* ---------- validation ---------- */
export function str(v, name, { max = 200, required = true } = {}) {
  const s = typeof v === 'string' ? v.trim() : (v == null ? '' : String(v).trim());
  if (required && !s) throw bad(name + ' is required');
  if (s.length > max) throw bad(name + ' is too long');
  return s;
}
export function int(v, name, { min = 0, max = 1e9, required = true } = {}) {
  if (v === undefined || v === null || v === '') {
    if (required) throw bad(name + ' is required');
    return null;
  }
  const n = typeof v === 'number' ? v : parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
  if (!Number.isInteger(n)) throw bad(name + ' must be a whole number');
  if (n < min) throw bad(name + ' must be at least ' + min);
  if (n > max) throw bad(name + ' must be at most ' + max);
  return n;
}
export function oneOf(v, name, list) {
  if (list.indexOf(v) === -1) throw bad(name + ' must be one of: ' + list.join(', '));
  return v;
}
export function arr(v, name, { max = 200 } = {}) {
  if (!Array.isArray(v)) throw bad(name + ' must be a list');
  if (v.length > max) throw bad(name + ' has too many entries');
  return v;
}

export const digits = (s) => String(s || '').replace(/[^0-9]/g, '');
export const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

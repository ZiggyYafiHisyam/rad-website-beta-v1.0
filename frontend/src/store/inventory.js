import { S, notify, ADDON_SCOPES } from './state';
import { docOpen } from './docs';
import { api, run } from './api';

export function liveRoomById(id) {
  for (let i = 0; i < S.LIVE_ROOMS.length; i++) { if (S.LIVE_ROOMS[i].id === id) return S.LIVE_ROOMS[i]; }
  return null;
}

export function addonScopeLabel(key) {
  for (let i = 0; i < ADDON_SCOPES.length; i++) { if (ADDON_SCOPES[i].key === key) return ADDON_SCOPES[i].label; }
  return 'Anywhere';
}

export function addonFree(a) { return Math.max(0, (a.units || 0) - (a.booked || 0)); }

export function lowSnacks() {
  return S.snackStock.filter((s) => s.qty <= (s.low || 5));
}

/* ================= BOOKINGS TODAY =================
   LIVE_BOOKED was rebuilt from todayBookings on every change; derive it the same way. */
export function liveBooked() {
  const out = {};
  S.todayBookings.forEach((b) => { out[b.boxId] = b.cust + ' · ' + b.time; });
  return out;
}

export function bookingById(id) {
  for (let i = 0; i < S.todayBookings.length; i++) { if (S.todayBookings[i].id === id) return S.todayBookings[i]; }
  return null;
}

export function bookingForRoom(boxId) {
  for (let i = 0; i < S.todayBookings.length; i++) { if (S.todayBookings[i].boxId === boxId) return S.todayBookings[i]; }
  return null;
}

/* ================= ROOM META / INVENTORY STATE ================= */
export function invSetState(id, v) {
  return run(() => api('PUT', '/operator/rooms/' + id + '/maintenance', { maintenance: v === 'maintenance' }));
}

/* ================= OWNER-ONLY ADD-ON CONTROL ================= */
export function ownerOpenAddonEditor() {
  S.ui.addonEditor = S.addOns.map((a) => ({ id:a.id, name:a.name, price:a.price, scope:a.scope || 'all', units:a.units || 0, booked:a.booked || 0, upgradesTo:a.upgradesTo }));
  notify();
}
export function ownerCloseAddonEditor() {
  S.ui.addonEditor = null;
  notify();
}
export function ownerEditorAddAddon() {
  S.ui.addonEditor.push({ name:'', price:'', scope:'all', units:1, booked:0 });
  notify();
}
export function ownerEditorRemoveAddon(i) {
  S.ui.addonEditor.splice(i, 1);
  notify();
}
export async function ownerSaveAddons() {
  const ok = await run(() => api('PUT', '/owner/addons', { rows: S.ui.addonEditor }).then(() => true));
  if (ok) ownerCloseAddonEditor();
}

/* ================= OWNER-ONLY SNACK CONTROL ================= */
export function ownerOpenSnackEditor() {
  S.ui.snackEditor = S.snackStock.map((s) => ({ id:s.id, name:s.name, qty:s.qty, cost:(s.cost || 0), price:s.price, low:s.low, code:s.code }));
  notify();
}
export function ownerCloseSnackEditor() {
  S.ui.snackEditor = null;
  notify();
}
export function ownerEditorAddSnack() {
  S.ui.snackEditor.push({ name:'', qty:'', cost:'', price:'', low:5 });
  notify();
}
export function ownerEditorRemoveSnack(i) {
  S.ui.snackEditor.splice(i, 1);
  notify();
}
export async function ownerSaveSnacks() {
  const draft = S.ui.snackEditor;
  for (let i = 0; i < draft.length; i++) {
    const s = draft[i];
    if (!String(s.name).trim()) continue;
    const qty = parseInt(String(s.qty).replace(/[^0-9]/g, ''), 10);
    const price = parseInt(String(s.price).replace(/[^0-9]/g, ''), 10);
    if (isNaN(qty) || isNaN(price)) { alert('Enter qty and selling price for "' + s.name + '"'); return; }
  }
  const ok = await run(() => api('PUT', '/owner/snacks', { rows: draft }).then(() => true));
  if (ok) ownerCloseSnackEditor();
}

/* ================= OWNER-ONLY TV / ROOM RATE CONTROL ================= */
export function ownerOpenRateEditor() {
  const running = S.LIVE_ROOMS.filter((r) => S.billingState[r.id] && S.billingState[r.id].running);
  S.ui.rateEditor = {
    rows: S.LIVE_ROOMS.map((r) => ({ id:r.id, name:r.name, rate:r.rate, weekend:(r.weekend || r.rate) })),
    warn: running.length
      ? running.length + (running.length > 1 ? ' sessions' : ' session') + ' running right now (' + running.map((r) => r.name).join(', ') + ') — ' + (running.length > 1 ? 'those keep their current rates' : 'that keeps its current rate') + ' until the bill is closed.'
      : null
  };
  notify();
}

export function ownerCloseRateEditor() {
  S.ui.rateEditor = null;
  notify();
}

export async function ownerSaveRates() {
  const rateDraft = S.ui.rateEditor.rows;
  for (let i = 0; i < rateDraft.length; i++) {
    const d = rateDraft[i];
    const wd = parseInt(String(d.rate).replace(/[^0-9]/g, ''), 10);
    const we = parseInt(String(d.weekend).replace(/[^0-9]/g, ''), 10);
    if (isNaN(wd) || wd <= 0 || isNaN(we) || we <= 0) { alert('Enter a weekday and weekend rate for ' + d.name + '.'); return; }
  }
  const changes = await run(() => api('PUT', '/owner/rates', { rows: rateDraft }));
  if (!changes) return;
  ownerCloseRateEditor();
  if (changes.length) docOpen('Rates updated', { kind:'rates', changes:changes }, 'Running sessions keep the rate they started on.');
}

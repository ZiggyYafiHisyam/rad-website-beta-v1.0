import { S, notify, ADDON_SCOPES } from './state';
import { rupiah } from './format';
import { ownerNotice } from './members';
import { adminOverride } from './audit';
import { docOpen } from './docs';

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
  S.roomMaintenance[id] = (v === 'maintenance');
  notify();
}

/* Add-ons are rentable gear: booked units come back to stock once the bill is paid */
export function addonRelease(charges) {
  (charges || []).forEach((c) => {
    if (c.kind !== 'addon') return;
    for (let i = 0; i < S.addOns.length; i++) {
      if (S.addOns[i].name === c.name) {
        S.addOns[i].booked = Math.max(0, (S.addOns[i].booked || 0) - c.qty);
        break;
      }
    }
  });
}

/* ================= OWNER-ONLY ADD-ON CONTROL ================= */
export function ownerOpenAddonEditor() {
  S.ui.addonEditor = S.addOns.map((a) => ({ name:a.name, price:a.price, scope:a.scope || 'all', units:a.units || 0, booked:a.booked || 0, upgradesTo:a.upgradesTo }));
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
export function ownerSaveAddons() {
  const out = [];
  const draft = S.ui.addonEditor;
  for (let i = 0; i < draft.length; i++) {
    const a = draft[i];
    if (!String(a.name).trim()) continue;
    let price = parseInt(String(a.price).replace(/[^0-9]/g, ''), 10);
    if (isNaN(price)) price = 0;
    let units = parseInt(String(a.units).replace(/[^0-9]/g, ''), 10);
    if (isNaN(units)) units = 0;
    out.push({ name:String(a.name).trim(), price:price, scope:a.scope || 'all', units:units, booked:Math.min(a.booked || 0, units), upgradesTo:a.upgradesTo });
  }
  S.addOns = out;
  ownerCloseAddonEditor();
}

/* ================= OWNER-ONLY SNACK CONTROL ================= */
export function ownerOpenSnackEditor() {
  S.ui.snackEditor = S.snackStock.map((s) => ({ name:s.name, qty:s.qty, cost:(s.cost || 0), price:s.price, low:s.low, code:s.code }));
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
export function ownerSaveSnacks() {
  const out = [];
  const draft = S.ui.snackEditor;
  for (let i = 0; i < draft.length; i++) {
    const s = draft[i];
    if (!String(s.name).trim()) continue;
    const qty = parseInt(String(s.qty).replace(/[^0-9]/g, ''), 10);
    const price = parseInt(String(s.price).replace(/[^0-9]/g, ''), 10);
    let cost = parseInt(String(s.cost).replace(/[^0-9]/g, ''), 10);
    if (isNaN(cost)) cost = 0;
    if (isNaN(qty) || isNaN(price)) { alert('Enter qty and selling price for "' + s.name + '"'); return; }
    out.push({ name:String(s.name).trim(), qty:qty, cost:cost, price:price, low:s.low || 5,
               code:s.code || ('B-' + (out.length + 1)) });
  }
  S.snackStock = out;
  ownerCloseSnackEditor();
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

export function ownerSaveRates() {
  const changes = [];
  const rateDraft = S.ui.rateEditor.rows;
  for (let i = 0; i < rateDraft.length; i++) {
    const d = rateDraft[i];
    const wd = parseInt(String(d.rate).replace(/[^0-9]/g, ''), 10);
    const we = parseInt(String(d.weekend).replace(/[^0-9]/g, ''), 10);
    if (isNaN(wd) || wd <= 0 || isNaN(we) || we <= 0) { alert('Enter a weekday and weekend rate for ' + d.name + '.'); return; }
    const live = S.LIVE_ROOMS[i];
    if (live.rate !== wd) changes.push(d.name + ': ' + rupiah(live.rate) + ' → ' + rupiah(wd) + ' / jam');
    if ((live.weekend || live.rate) !== we) changes.push(d.name + ' weekend: ' + rupiah(live.weekend || live.rate) + ' → ' + rupiah(we) + ' / jam');
    live.rate = wd;
    live.weekend = we;
  }
  ownerCloseRateEditor();
  if (changes.length) {
    ownerNotice('Price update — ' + (changes.length === 1 ? changes[0].split(':')[0] : changes.length + ' units'),
      changes.join(' · ') + '. Quote the new rate at the counter.', 'All operators');
    adminOverride('Pricing — owner updated ' + changes.length + ' rate' + (changes.length > 1 ? 's' : '') + ' · ' + changes.join(' · '));
    docOpen('Rates updated', { kind:'rates', changes:changes }, 'Running sessions keep the rate they started on.');
  }
}

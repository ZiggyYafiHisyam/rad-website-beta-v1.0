import { S, notify, goTo, ROOM_META } from './state';
import { liveRoomById, addonFree } from './inventory';
import { api, once } from './api';

/* The fourteen hourly slots on the TV detail page. Which ones are taken comes
   from the server (S.slotsTaken[room]) — other customers, running sessions and hours already gone. */
export const TV_SLOTS = [
  '10.00', '11.00', '12.00', '13.00', '14.00', '15.00', '16.00',
  '17.00', '18.00', '19.00', '20.00', '21.00', '22.00', '23.00'
].map((label, idx) => ({ idx: idx, label: label }));

export function tvIsAvailable(idx) {
  const taken = S.slotsTaken[S.custRoomId] || [];
  return taken.indexOf(idx) === -1;
}

export function tvRangeClear(from, to) {
  for (let i = from; i <= to; i++) { if (!tvIsAvailable(i)) return false; }
  return true;
}

/* URL id -> room: /tv/3 is the third unit, /tv/billing-vip works too */
export function roomIdFromParam(param) {
  if (!param) return null;
  const n = parseInt(param, 10);
  if (String(n) === String(param) && S.LIVE_ROOMS[n - 1]) return S.LIVE_ROOMS[n - 1].id;
  return liveRoomById(param) ? param : null;
}

/* Pick the unit the detail page is quoting and start with a clean form */
export function selectRoom(boxId) {
  const meta = ROOM_META[boxId] || { type: 'tv', console: 'ps5' };
  const room = liveRoomById(boxId);
  S.custRoomId = boxId;
  S.tvVenue = { name: room ? room.name : boxId, type: meta.type, console: meta.console };
  S.tvRangeStart = S.tvRangeEnd = null;
  S.tvAddonQty = {};
  S.tvGalleryIndex = 0;
  notify();
}

/* Home page card -> detail page for that unit */
export function openRoom(boxId) {
  selectRoom(boxId);
  const n = S.LIVE_ROOMS.findIndex((r) => r.id === boxId) + 1;
  goTo('/tv/' + (n || 1));
}

/* Which unit the customer detail page is quoting. Rate comes from LIVE_ROOMS,
   so whatever the owner sets on Stock & Rewards is what the customer sees. */
export function custRateFor(id) {
  const r = liveRoomById(id || S.custRoomId);
  return r ? r.rate : 50000;
}

/* Rp 5.000 off each extra hour, capped at 2 extra hours */
export function tvCalcPrice(hours) {
  if (hours <= 0) return 0;
  return custRateFor() * hours - Math.min(hours - 1, 2) * 5000;
}

export function tvAddonTotal() {
  let t = 0;
  S.addOns.forEach((a, i) => { t += (S.tvAddonQty[i] || 0) * a.price; });
  return t;
}

export function tvAddonCount() {
  let c = 0;
  S.addOns.forEach((a, i) => { c += (S.tvAddonQty[i] || 0); });
  return c;
}

export function tvActiveConsole() {
  let c = S.tvVenue.console;
  S.addOns.forEach((a, i) => { if (a.upgradesTo && S.tvAddonQty[i]) c = a.upgradesTo; });
  return c;
}

export function tvAddonFits(a, activeConsole) {
  if (!a.scope || a.scope === 'all') return true;
  if (a.scope === 'room') return S.tvVenue.type === 'room';
  return a.scope === activeConsole;
}

export function tvSetAddon(i, delta) {
  const a = S.addOns[i];
  let q = (S.tvAddonQty[i] || 0) + delta;
  if (q < 0) q = 0;
  if (q > addonFree(a)) q = addonFree(a);
  S.tvAddonQty[i] = q;
  const active = tvActiveConsole();
  S.addOns.forEach((x, j) => { if (!tvAddonFits(x, active)) S.tvAddonQty[j] = 0; });
  notify();
}

export function selectSlot(idx) {
  if (S.tvRangeStart === null) {
    S.tvRangeStart = S.tvRangeEnd = idx;
  } else if (idx === S.tvRangeStart && idx === S.tvRangeEnd) {
    S.tvRangeStart = S.tvRangeEnd = null;
  } else if (idx > S.tvRangeEnd && tvRangeClear(S.tvRangeEnd + 1, idx)) {
    S.tvRangeEnd = idx;
  } else if (idx < S.tvRangeStart && tvRangeClear(idx, S.tvRangeStart - 1)) {
    S.tvRangeStart = idx;
  } else if (idx === S.tvRangeEnd) {
    S.tvRangeEnd = S.tvRangeEnd - 1;
    if (S.tvRangeEnd < S.tvRangeStart) { S.tvRangeStart = S.tvRangeEnd = null; }
  } else if (idx === S.tvRangeStart) {
    S.tvRangeStart = S.tvRangeStart + 1;
    if (S.tvRangeStart > S.tvRangeEnd) { S.tvRangeStart = S.tvRangeEnd = null; }
  } else {
    S.tvRangeStart = S.tvRangeEnd = idx;
  }
  notify();
}

export function selectMethod(label) {
  S.tvPaymentMethod = label;
  notify();
}

export function tvGalleryShow(index) {
  S.tvGalleryIndex = index;
  notify();
}

/* ---- booking identity: guest or member ---- */
export function custIdMode(mode) {
  S.custIdModeValue = mode;
  if (mode === 'guest') {
    S.custMember = null;
    S.custMemberResult = null;
  }
  notify();
}

export function custSetField(key, v) {
  S.custForm[key] = v;
  notify();
}

export async function custMemberCheck() {
  try {
    const m = await api('POST', '/public/member-lookup', { phone: S.custForm.memberInput || '' });
    S.custMember = m;
    S.custForm.name = m.name;
    S.custForm.wa = m.phone;
    S.custMemberResult = 'found';
  } catch (e) {
    if (e.network) { alert(e.message); return; }
    S.custMember = null;
    S.custMemberResult = 'notfound';
  }
  notify();
}

export async function bookAndPay() {
  if (S.tvRangeStart === null) { alert('Pilih jam main dulu.'); return; }
  if (!S.tvPaymentMethod) { alert('Pilih cara bayar dulu.'); return; }
  if (!S.custMember && (!S.custForm.name.trim() || !S.custForm.wa.trim())) { alert('Isi nama dan nomor WhatsApp dulu.'); return; }
  const addons = [];
  S.addOns.forEach((a, i) => { if (S.tvAddonQty[i]) addons.push({ id: a.id, qty: S.tvAddonQty[i] }); });
  await once('book', async () => {
    let b;
    try {
      b = await api('POST', '/public/bookings', {
        boxId: S.custRoomId, startIdx: S.tvRangeStart, endIdx: S.tvRangeEnd,
        name: S.custForm.name, wa: S.custForm.wa, note: S.custForm.note,
        method: S.tvPaymentMethod, addons, memberPhone: S.custMember ? S.custMember.phone : undefined
      });
    } catch (e) { alert(e.message); return; }
    S.booking = b;
    S.receipt.addons = b.addons;
    S.receipt.member = b.member;
    S.tvRangeStart = S.tvRangeEnd = null;
    S.tvAddonQty = {};
    notify();
    goTo((b.method === 'QRIS' ? '/payment/qris/' : '/payment/cash/') + encodeURIComponent(b.code));
  });
}

/* Payment pages: open by booking code, also after a reload or from a saved link */
export async function loadBooking(code) {
  try {
    S.booking = await api('GET', '/public/bookings/' + encodeURIComponent(code));
    S.receipt.addons = S.booking.addons;
  } catch (e) {
    S.booking = { missing: true, code };
  }
  notify();
}

/* ================= CUSTOMER HOME FILTER ================= */
export function custFilter(f) {
  S.custFilterValue = f;
  notify();
}

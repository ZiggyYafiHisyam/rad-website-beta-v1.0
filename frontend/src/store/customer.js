import { S, notify, showPage } from './state';
import { liveRoomById, addonFree } from './inventory';
import { pointsFor, memberByPhone, memberHeadroom } from './members';

/* The fourteen hourly slots on the TV detail page. 12.00 and 19.00 are taken. */
export const TV_SLOTS = [
  '10.00', '11.00', '12.00', '13.00', '14.00', '15.00', '16.00',
  '17.00', '18.00', '19.00', '20.00', '21.00', '22.00', '23.00'
].map((label, idx) => ({ idx: idx, label: label, status: (idx === 2 || idx === 9) ? 'booked' : 'available' }));

export function tvIsAvailable(idx) {
  const el = TV_SLOTS[idx];
  return !!(el && el.status === 'available');
}

export function tvRangeClear(from, to) {
  for (let i = from; i <= to; i++) { if (!tvIsAvailable(i)) return false; }
  return true;
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

export function custMemberCheck() {
  const m = memberByPhone(S.custForm.memberInput || '');
  if (!m) {
    S.custMember = null;
    S.custMemberResult = 'notfound';
    notify();
    return;
  }
  S.custMember = m;
  S.custForm.name = m.name;
  S.custForm.wa = m.phone;
  S.custMemberResult = 'found';
  notify();
}

export function bookAndPay() {
  const method = S.tvPaymentMethod || '';
  const picked = [];
  S.addOns.forEach((a, i) => { if (S.tvAddonQty[i]) picked.push(a.name + (S.tvAddonQty[i] > 1 ? ' ×' + S.tvAddonQty[i] : '')); });
  S.receipt.addons = picked.length ? picked.join(', ') : '—';
  if (S.custMember) {
    const hrs = S.tvRangeStart === null ? 0 : (S.tvRangeEnd - S.tvRangeStart) + 1;
    const wouldPts = pointsFor(tvCalcPrice(hrs));
    const earnPts = Math.min(wouldPts, memberHeadroom(S.custMember));
    S.receipt.member = S.custMember.name + ' · ' + (earnPts ? '+' + earnPts + ' poin (pending)' : 'poin penuh');
  } else {
    S.receipt.member = null;
  }
  notify();
  if (method === 'Cash di Lokasi') {
    showPage('customer-payment-cash');
  } else {
    showPage('customer-payment-qris-pending');
  }
}

/* ================= CUSTOMER HOME FILTER ================= */
export function custFilter(f) {
  S.custFilterValue = f;
  notify();
}

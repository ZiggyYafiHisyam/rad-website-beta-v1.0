import { S, notify, ROOM_META } from './state';
import { billingFormatClock, billingFormatDuration } from './format';
import { liveRoomById, bookingById, addonFree } from './inventory';
import { docOpen } from './docs';
import { api, run, once } from './api';

/* The eight boxes on the operator dashboard, with the data-name each one carried */
export const BILLING_BOXES = [
  { id:'billing-tv1', name:'TV 1' },
  { id:'billing-tv2', name:'TV 2' },
  { id:'billing-tv3', name:'TV 3' },
  { id:'billing-tv4', name:'TV 4' },
  { id:'billing-tv5', name:'TV 5' },
  { id:'billing-private', name:'Private Room' },
  { id:'billing-vip', name:'VIP Room' },
  { id:'billing-lounge', name:'Lounge Room' }
];

export function box_name(boxId) {
  for (let i = 0; i < BILLING_BOXES.length; i++) { if (BILLING_BOXES[i].id === boxId) return BILLING_BOXES[i].name; }
  return boxId;
}

/* Personal billing: half-hour blocks, minimum 1 jam */
export function personalHours(sec) {
  const hrs = Math.ceil((sec || 0) / 1800) / 2;
  return Math.max(1, hrs);
}
export function personalAmount(st) {
  return Math.round(personalHours(st.elapsedSec) * (st.rate || 50000));
}

/* ================= BILLING MODAL ================= */
export function billingOpenStart(boxId, displayName) {
  const ri = liveRoomById(boxId);
  S.ui.billing = {
    stage: 'start', boxId: boxId,
    title: 'Start billing — ' + displayName,
    customer: '', hours: 1, mode: 'fixed',
    personalRate: ri ? ri.rate : 50000
  };
  notify();
}

export function billingSetMode(mode) {
  S.ui.billing.mode = mode;
  notify();
}

export function billingStep(delta) {
  let val = S.ui.billing.hours + delta;
  if (val < 1) val = 1;
  if (val > 12) val = 12;
  S.ui.billing.hours = val;
  notify();
}

export async function billingConfirmStart() {
  const m = S.ui.billing;
  const name = m.customer.trim();
  if (!name) { alert('Please enter the customer name'); return; }
  await once('start-' + m.boxId, async () => {
    const ok = await run(() => api('POST', '/operator/sessions', { boxId: m.boxId, customer: name, mode: m.mode, hours: m.hours }).then(() => true));
    if (ok) billingCloseModal();
  });
}

export function billingTogglePause(boxId) {
  const st = S.billingState[boxId];
  if (!st || st.mode !== 'personal') return;
  return run(() => api('POST', '/operator/sessions/' + boxId + '/pause'));
}

export function billingOpenStop(boxId) {
  const st = S.billingState[boxId];
  S.ui.billing = {
    stage: 'stop', boxId: boxId,
    title: 'Stop billing — ' + box_name(boxId),
    summary: st.customer + ' — started at ' + billingFormatClock(st.startedAt),
    reason: ''
  };
  notify();
}

export function billingConfirmStop() {
  const reason = S.ui.billing.reason.trim();
  if (!reason) { alert('Please enter a reason for stopping'); return; }
  const boxId = S.ui.billing.boxId;
  const st = S.billingState[boxId];
  const usedSec = (st.totalSec || 0) - st.remainingSec;
  const hours = Math.max(0.5, Math.ceil(usedSec / 1800) / 2);
  billingCloseModal();
  openPayment(boxId, hours, 'stop lebih awal · ' + billingFormatDuration(usedSec) + ' terpakai', reason);
}

export function billingFinish(boxId) {
  const st = S.billingState[boxId];
  if (!st) return;
  if (st.mode === 'personal') {
    const ph = personalHours(st.elapsedSec);
    openPayment(boxId, ph, 'personal · ' + billingFormatDuration(st.elapsedSec) + ' terpakai', null);
    return;
  }
  const hours = Math.round((st.totalSec || 3600) / 3600 * 2) / 2;
  openPayment(boxId, hours, 'selesai · ' + hours + ' jam penuh', null);
}

export function billingCloseModal() {
  S.ui.billing = null;
  notify();
}

/* One tick a second: the owner's live clock plus every running timer */
export function billingTick() {
  Object.keys(S.billingState).forEach((boxId) => {
    const st = S.billingState[boxId];
    if (st.running && st.mode === 'personal') {
      if (st.paused) return;
      st.elapsedSec = (st.elapsedSec || 0) + 1;
      return;
    }
    if (st.running && st.remainingSec > 0) {
      st.remainingSec -= 1;
    }
  });
  notify();
}

let clockTimer = null;
export function startClock() {
  if (clockTimer) return;
  clockTimer = setInterval(billingTick, 1000);
}

/* ================= ADMIN: EDIT BOOKING ================= */
export function adminOpenEditModal(id) {
  const b = bookingById(id);
  if (!b) return;
  S.ui.adminEdit = {
    booking: b, name: b.cust, time: b.time, method: b.method, originalMethod: b.method,
    methodNote: '', showDelete: false, deleteReason: ''
  };
  notify();
}

export function adminCloseEditModal() {
  S.ui.adminEdit = null;
  notify();
}

export function adminShowDeleteReason() {
  S.ui.adminEdit.showDelete = true;
  notify();
}

export async function adminConfirmDelete() {
  const ed = S.ui.adminEdit;
  const reason = ed.deleteReason.trim();
  if (!reason) { alert('Please enter a reason for deletion'); return; }
  if (!ed.booking) return;
  const ok = await run(() => api('POST', '/operator/bookings/' + ed.booking.dbId + '/delete', { reason }).then(() => true));
  if (ok) adminCloseEditModal();
}

export async function adminSaveEdit() {
  const ed = S.ui.adminEdit;
  if (!ed.booking) return;
  const ok = await run(() => api('PATCH', '/operator/bookings/' + ed.booking.dbId,
    { name: ed.name, time: ed.time, method: ed.method, methodNote: ed.methodNote }).then(() => true));
  if (ok) adminCloseEditModal();
}

/* ================= BOOKINGS TODAY ================= */
export function bookingStart(id) {
  const b = bookingById(id);
  if (!b) return;
  if (S.billingState[b.boxId] && S.billingState[b.boxId].running) { alert(b.room + ' already has a session running.'); return; }
  if (S.roomMaintenance[b.boxId]) { alert(b.room + ' is set to maintenance — change it on the Inventory page first.'); return; }
  return once('bk-' + id, () => run(() => api('POST', '/operator/sessions/from-booking', { bookingId: b.dbId })));
}

/* ================= MID-SESSION CHARGES ================= */
export function chargeList(boxId) {
  if (!S.sessionCharges) S.sessionCharges = {};
  if (!S.sessionCharges[boxId]) S.sessionCharges[boxId] = [];
  return S.sessionCharges[boxId];
}

export function chargeTotal(boxId) {
  let t = 0;
  chargeList(boxId).forEach((c) => { t += c.qty * c.price; });
  return t;
}

export function chargeFits(a, boxId) {
  const meta = ROOM_META[boxId] || { type:'tv', console:'ps5' };
  if (!a.scope || a.scope === 'all') return true;
  if (a.scope === 'room') return meta.type === 'room';
  return a.scope === meta.console;
}

export function chargeOpen(boxId) {
  S.ui.charge = { boxId: boxId, title: 'Add to session — ' + box_name(boxId), draft: { snack:{}, addon:{} } };
  notify();
}

export function chargeClose() {
  S.ui.charge = null;
  notify();
}

export function chargeStep(kind, i, d) {
  const draft = S.ui.charge.draft;
  const max = kind === 'snack' ? S.snackStock[i].qty : addonFree(S.addOns[i]);
  let cur = (draft[kind][i] || 0) + d;
  if (cur < 0) cur = 0;
  if (cur > max) cur = max;
  draft[kind][i] = cur;
  notify();
}

export async function chargeConfirm() {
  const boxId = S.ui.charge.boxId;
  const draft = S.ui.charge.draft;
  const snacks = Object.keys(draft.snack).filter((k) => draft.snack[k]).map((k) => ({ id: S.snackStock[k].id, qty: draft.snack[k] }));
  const addons = Object.keys(draft.addon).filter((k) => draft.addon[k]).map((k) => ({ id: S.addOns[k].id, qty: draft.addon[k] }));
  if (!snacks.length && !addons.length) { chargeClose(); return; }
  await once('charge-' + boxId, async () => {
    const ok = await run(() => api('POST', '/operator/sessions/' + boxId + '/charges', { snacks, addons }).then(() => true));
    if (ok) chargeClose();
  });
}

/* ================= PAYMENT AT COUNTER ================= */
export function payTotal() {
  const payCtx = S.ui.pay;
  if (!payCtx) return 0;
  let t = payCtx.roomAmt;
  payCtx.charges.forEach((c) => { t += c.qty * c.price; });
  return t;
}

export function openPayment(boxId, hours, note, reason) {
  const st = S.billingState[boxId];
  if (!st) return;
  S.ui.pay = {
    boxId: boxId,
    name: box_name(boxId),
    cust: st.customer,
    hours: hours,
    roomAmt: Math.round(hours * (st.rate || 50000)),
    charges: chargeList(boxId).slice(),
    note: note, reason: reason,
    memberPhone: st.memberPhone || null,
    method: st.method || null,
    started: billingFormatClock(st.startedAt),
    memberSearch: '',
    qrisRef: box_name(boxId).replace(/\s/g, '').toUpperCase() + '-' + billingFormatClock(new Date()).replace(':', '')
  };
  notify();
}

export function payMemberSearchSet(v) {
  S.ui.pay.memberSearch = v;
  notify();
}

export function payMemberHits() {
  const q = (S.ui.pay.memberSearch || '').toLowerCase().trim();
  const dq = q.replace(/[^0-9]/g, '');
  if (q.length < 2) return null;
  return S.ownerMembers.filter((m) => {
    if (m.name.toLowerCase().indexOf(q) > -1) return true;
    return dq.length > 2 && m.phone.replace(/[^0-9]/g, '').indexOf(dq) > -1;
  }).slice(0, 4);
}

/* payRender() rebuilt the QRIS reference from the clock every time it ran */
function payRefresh() {
  S.ui.pay.qrisRef = S.ui.pay.name.replace(/\s/g, '').toUpperCase() + '-' + billingFormatClock(new Date()).replace(':', '');
  notify();
}

export function payMemberAttach(phone) {
  if (!S.ui.pay) return;
  S.ui.pay.memberPhone = phone;
  payRefresh();
}

export function payMemberClear() {
  if (!S.ui.pay) return;
  S.ui.pay.memberPhone = null;
  payRefresh();
}

export function paySelect(m) {
  S.ui.pay.method = m;
  payRefresh();
}

export function payCancel() {
  S.ui.pay = null;
  notify();
}

export async function payConfirm() {
  const payCtx = S.ui.pay;
  if (!payCtx) return;
  if (!payCtx.method) { alert('Pick cash or QRIS — how did the customer pay?'); return; }
  await once('pay-' + payCtx.boxId, async () => {
    /* The server recomputes hours and amounts from its own timer */
    const rec = await run(() => api('POST', '/operator/sessions/' + payCtx.boxId + '/checkout',
      { method: payCtx.method, memberPhone: payCtx.memberPhone, reason: payCtx.reason }));
    if (!rec) return;
    S.ui.pay = null;
    docOpen('Payment received', { kind:'receipt', rec:rec }, 'Receipt ' + rec.id + ' sent to the owner’s transaction history.');
  });
}

/* ================= COUNTER ORDERS (snacks) ================= */
export function orderOpen() {
  S.ui.order = { draft: { snack: {} }, customer: '' };
  notify();
}

export function orderClose() {
  S.ui.order = null;
  notify();
}

export function coStep(kind, i, d) {
  const draft = S.ui.order.draft;
  const max = S.snackStock[i].qty;
  let cur = (draft[kind][i] || 0) + d;
  if (cur < 0) cur = 0;
  if (cur > max) cur = max;
  draft[kind][i] = cur;
  notify();
}

export function orderToPayment() {
  const draft = S.ui.order.draft;
  const items = [];
  let total = 0;
  Object.keys(draft.snack).forEach((k) => {
    const q = draft.snack[k]; if (!q) return;
    items.push({ kind:'snack', id:S.snackStock[k].id, name:S.snackStock[k].name, qty:q, price:S.snackStock[k].price });
    total += q * S.snackStock[k].price;
  });
  if (!items.length) { alert('Pick at least one snack.'); return; }
  const cust = S.ui.order.customer.trim() || 'Walk-in';
  S.ui.order = null;
  cpayOpen({ type: 'order', cust: cust, items: items, total: total });
}

/* --- counter payment popup (cash / QRIS) --- */
let counterRef = 0;
export function cpayOpen(ctx) {
  ctx.method = null;
  ctx.ref = 'CTR-' + billingFormatClock(new Date()).replace(':', '') + '-' + (++counterRef);
  ctx.opened = billingFormatClock(new Date());
  S.ui.cpay = ctx;
  notify();
}

export function cpayCancel() {
  S.ui.cpay = null;
  notify();
}

export function cpaySelect(m) {
  S.ui.cpay.method = m;
  S.ui.cpay.opened = billingFormatClock(new Date());
  notify();
}

export async function cpayConfirm() {
  const c = S.ui.cpay;
  if (!c) return;
  if (!c.method) { alert('Pick cash or QRIS — how did the customer pay?'); return; }
  await once('cpay', async () => {
    const rec = await run(() => api('POST', '/operator/counter-orders',
      { customer: c.cust, method: c.method, items: c.items.map((i) => ({ id: i.id, qty: i.qty })) }));
    if (!rec) return;
    S.ui.cpay = null;
    docOpen('Payment received', { kind:'receipt', rec:rec }, 'Receipt ' + rec.id + ' sent to the owner’s transaction history.');
  });
}

/* ================= OWNER: RUNNING SESSION DETAIL =================
   Snapshot at the moment the card is tapped — "reopen the card to refresh". */
export function ownerOpenSession(boxId) {
  const st = S.billingState[boxId];
  if (!st || !st.running) return;
  const room = liveRoomById(boxId) || { name: boxId, rate: 50000 };
  const personal = st.mode === 'personal';
  const used = personal ? (st.elapsedSec || 0) : (st.totalSec || 0) - st.remainingSec;
  const accrued = personal ? personalAmount(st) : Math.round(used / 3600 * (room.rate || 50000));
  docOpen('Running session · ' + room.name, {
    kind: 'session',
    head: st.customer + ' · started ' + billingFormatClock(st.startedAt) + ' · ' + (personal ? 'personal · stopwatch' : Math.round((st.totalSec || 0) / 3600) + ' jam booked'),
    used: billingFormatDuration(used),
    personal: personal,
    paused: !!st.paused,
    blocks: personalHours(st.elapsedSec),
    left: billingFormatDuration(st.remainingSec),
    rate: room.rate,
    accrued: accrued,
    charges: chargeList(boxId).slice(),
    total: accrued + chargeTotal(boxId),
    log: (st.log || []).slice().reverse()
  }, 'Live — reopen the card to refresh.');
}

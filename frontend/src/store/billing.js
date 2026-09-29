import { S, notify, showPage, ROOM_META, HIST_DATES, MEMBER_POINT_CAP } from './state';
import { rupiah, billingFormatClock, billingFormatDuration } from './format';
import { liveRoomById, bookingById, addonFree, addonRelease } from './inventory';
import { memberAward } from './members';
import { adminOverride, ownerTxn } from './audit';
import { docOpen } from './docs';

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

/* ================= OWNER: RUNNING SESSION DETAIL ================= */
export function sessionLog(boxId, text) {
  const st = S.billingState[boxId];
  if (!st) return;
  if (!st.log) st.log = [];
  st.log.push({ t: billingFormatClock(new Date()), text: text });
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

export function billingConfirmStart() {
  const m = S.ui.billing;
  const name = m.customer.trim();
  if (!name) { alert('Please enter the customer name'); return; }
  const boxId = m.boxId;
  const rateInfo = liveRoomById(boxId);
  const rate = rateInfo ? rateInfo.rate : 50000;
  const roomName = rateInfo ? rateInfo.name : boxId;
  if (m.mode === 'personal') {
    S.billingState[boxId] = {
      running: true, mode: 'personal', paused: false,
      customer: name, elapsedSec: 0, remainingSec: 0, totalSec: 0,
      rate: rate, startedAt: new Date()
    };
    S.sessionCharges[boxId] = [];
    sessionLog(boxId, 'Personal session started at the counter · stopwatch billing');
    ownerTxn({ room: roomName, cust: name, detail: 'personal · stopwatch started', amt: 0, method: 'Running', by: S.activeOperator });
  } else {
    const hours = m.hours;
    S.billingState[boxId] = {
      running: true, mode: 'fixed',
      customer: name,
      remainingSec: hours * 3600,
      totalSec: hours * 3600,
      rate: rate, startedAt: new Date()
    };
    S.sessionCharges[boxId] = [];
    sessionLog(boxId, 'Session started at the counter · ' + hours + ' jam');
    ownerTxn({ room: roomName, cust: name, detail: hours + ' jam · billing started', amt: rate * hours, method: 'Running', by: S.activeOperator });
  }
  billingCloseModal();
}

export function billingTogglePause(boxId) {
  const st = S.billingState[boxId];
  if (!st || st.mode !== 'personal') return;
  st.paused = !st.paused;
  sessionLog(boxId, st.paused ? 'Stopwatch paused at ' + billingFormatDuration(st.elapsedSec) : 'Stopwatch resumed at ' + billingFormatDuration(st.elapsedSec));
  adminOverride(box_name(boxId) + ' — personal stopwatch ' + (st.paused ? 'paused' : 'resumed') + ' for ' + st.customer + ' at ' + billingFormatDuration(st.elapsedSec));
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

export function adminConfirmDelete() {
  const ed = S.ui.adminEdit;
  const reason = ed.deleteReason.trim();
  if (!reason) { alert('Please enter a reason for deletion'); return; }
  const b = ed.booking;
  if (!b) return;
  const i = S.todayBookings.indexOf(b);
  if (i > -1) S.todayBookings.splice(i, 1);
  adminOverride(b.room + ' — booking deleted (' + reason + ')');
  adminCloseEditModal();
}

export function adminSaveEdit() {
  const ed = S.ui.adminEdit;
  const b = ed.booking;
  if (!b) return;
  b.cust = ed.name;
  b.time = ed.time;
  const method = ed.method;
  const methodNote = ed.methodNote.trim();
  b.method = method;
  let logMsg = b.room + ' — updated (' + b.cust + ', ' + b.time + ', ' + method + ')';
  if (method !== ed.originalMethod) {
    logMsg += ' — method changed: ' + (methodNote || 'no note provided');
  }
  adminOverride(logMsg);
  adminCloseEditModal();
}

/* ================= SHIFT START ================= */
export function adminStartShift() {
  S.activeOperator = S.adminLoginOperator || 'Zeke';
  notify();
  showPage('admin-home');
}

/* ================= BOOKINGS TODAY ================= */
export function bookingStart(id) {
  const b = bookingById(id);
  if (!b) return;
  if (S.billingState[b.boxId] && S.billingState[b.boxId].running) { alert(b.room + ' already has a session running.'); return; }
  if (S.roomMaintenance[b.boxId]) { alert(b.room + ' is set to maintenance — change it on the Inventory page first.'); return; }
  const rateInfo = liveRoomById(b.boxId);
  S.billingState[b.boxId] = {
    running: true, customer: b.cust,
    remainingSec: b.hours * 3600, totalSec: b.hours * 3600,
    rate: rateInfo ? rateInfo.rate : 50000, startedAt: new Date(), method: b.method,
    memberPhone: b.memberPhone || null
  };
  S.sessionCharges[b.boxId] = [];
  const i = S.todayBookings.indexOf(b);
  if (i > -1) S.todayBookings.splice(i, 1);
  sessionLog(b.boxId, 'Session started from booking · ' + b.hours + ' jam · ' + b.method + ' booking' + (b.memberPhone ? ' · member ' + b.cust : ''));
  ownerTxn({ room:b.room, cust:b.cust, detail:b.hours + ' jam · booking confirmed in progress', amt:(rateInfo ? rateInfo.rate : 50000) * b.hours, method:'Running', by:S.activeOperator });
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

export function chargeConfirm() {
  const boxId = S.ui.charge.boxId;
  const draft = S.ui.charge.draft;
  const added = [];
  let sum = 0;
  Object.keys(draft.snack).forEach((k) => {
    const q = draft.snack[k];
    if (!q) return;
    const s = S.snackStock[k];
    s.qty = Math.max(0, s.qty - q);
    chargeList(boxId).push({ name:s.name, qty:q, price:s.price, kind:'snack' });
    added.push(s.name + ' ×' + q);
    sum += q * s.price;
  });
  Object.keys(draft.addon).forEach((k) => {
    const q = draft.addon[k];
    if (!q) return;
    const a = S.addOns[k];
    a.booked = (a.booked || 0) + q;
    chargeList(boxId).push({ name:a.name, qty:q, price:a.price, kind:'addon' });
    added.push(a.name + ' ×' + q);
    sum += q * a.price;
  });
  if (!added.length) { chargeClose(); return; }
  const name = box_name(boxId);
  const st = S.billingState[boxId] || {};
  sessionLog(boxId, 'Added mid-session · ' + added.join(', ') + ' · ' + rupiah(sum));
  ownerTxn({ room:name, cust:st.customer || 'Walk-in', detail:'mid-session · ' + added.join(', '), amt:sum, method:'On bill', by:S.activeOperator });
  adminOverride(name + ' — ' + added.join(', ') + ' added mid-session (' + rupiah(sum) + ')');
  chargeClose();
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

export function payConfirm() {
  const payCtx = S.ui.pay;
  if (!payCtx) return;
  if (!payCtx.method) { alert('Pick cash or QRIS — how did the customer pay?'); return; }
  const award = payCtx.memberPhone
    ? memberAward(payCtx.memberPhone, payCtx.roomAmt, payCtx.name + ' · ' + payCtx.hours + ' jam')
    : null;
  const rec = {
    id: 'RCP-' + (1041 + S.ownerReceipts.length),
    date: HIST_DATES[0],
    room: payCtx.name, cust: payCtx.cust, hours: payCtx.hours,
    roomAmt: payCtx.roomAmt, charges: payCtx.charges, total: payTotal(),
    method: payCtx.method, by: S.activeOperator,
    at: 'Today · ' + billingFormatClock(new Date()),
    note: payCtx.note, reason: payCtx.reason,
    memberName: award ? award.member.name : null,
    memberPhone: award ? award.member.phone : null,
    pts: award ? award.earned : 0,
    ptsBalance: award ? award.balance : null,
    ptsDropped: award ? (award.would - award.earned) : 0
  };
  S.ownerReceipts.unshift(rec);
  addonRelease(rec.charges);
  delete S.billingState[payCtx.boxId];
  S.sessionCharges[payCtx.boxId] = [];
  ownerTxn({ room:rec.room, cust:rec.cust, detail:rec.hours + ' jam · paid at cashier' + (rec.reason ? ' · ' + rec.reason : ''), amt:rec.total, method:rec.method, by:S.activeOperator });
  if (rec.reason) adminOverride(rec.room + ' — billing stopped early for ' + rec.cust + ' (' + rec.reason + ')');
  if (award) {
    adminOverride(rec.room + ' — ' + rec.pts + ' poin credited to ' + award.member.name + ' (member · now ' + award.balance + '/' + MEMBER_POINT_CAP + ')' + (rec.ptsDropped ? ' · ' + rec.ptsDropped + ' dropped at cap' : ''));
  }
  S.ui.pay = null;
  docOpen('Payment received', { kind:'receipt', rec:rec }, 'Receipt ' + rec.id + ' sent to the owner’s transaction history.');
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
    items.push({ kind:'snack', idx:+k, name:S.snackStock[k].name, qty:q, price:S.snackStock[k].price });
    total += q * S.snackStock[k].price;
  });
  if (!items.length) { alert('Pick at least one snack.'); return; }
  const cust = S.ui.order.customer.trim() || 'Walk-in';
  S.ui.order = null;
  cpayOpen({ type: 'order', cust: cust, items: items, total: total });
}

/* --- counter payment popup (cash / QRIS) --- */
export function cpayOpen(ctx) {
  ctx.method = null;
  ctx.ref = 'CTR-' + billingFormatClock(new Date()).replace(':', '') + '-' + S.counterSeq;
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

export function cpayConfirm() {
  const c = S.ui.cpay;
  if (!c) return;
  if (!c.method) { alert('Pick cash or QRIS — how did the customer pay?'); return; }
  c.items.forEach((i) => {
    if (i.kind === 'snack') { S.snackStock[i.idx].qty = Math.max(0, S.snackStock[i.idx].qty - i.qty); }
    else { S.addOns[i.idx].booked = (S.addOns[i.idx].booked || 0) + i.qty; }
  });
  const detail = c.items.map((i) => i.name + ' ×' + i.qty).join(', ');
  const rec = {
    id: 'RCP-' + (1041 + S.ownerReceipts.length),
    date: HIST_DATES[0],
    kind: 'counter',
    room: 'Counter', cust: c.cust, hours: 0, roomAmt: 0,
    charges: (c.items || []).map((i) => ({ kind:i.kind, name:i.name, qty:i.qty, price:i.price })),
    message: null,
    total: c.total, method: c.method, by: S.activeOperator,
    at: 'Today · ' + billingFormatClock(new Date()),
    note: 'counter order', reason: null
  };
  S.ownerReceipts.unshift(rec);
  addonRelease(rec.charges);
  S.counterSeq++;
  ownerTxn({ room:'Counter', cust:c.cust, detail:detail, amt:c.total, method:c.method, by:S.activeOperator });
  S.ui.cpay = null;
  docOpen('Payment received', { kind:'receipt', rec:rec }, 'Receipt ' + rec.id + ' sent to the owner’s transaction history.');
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

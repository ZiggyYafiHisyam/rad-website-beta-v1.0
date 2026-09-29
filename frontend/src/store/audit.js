import { S, notify, RPT_TODAY } from './state';
import { billingFormatClock } from './format';

/* ================= LIVE TRANSACTION FEED ================= */
export function ownerTxn(o) {
  o.t = billingFormatClock(new Date());
  S.liveTxns.unshift(o);
  notify();
}

/* ================= BOOKING AUDIT LOG ================= */
export function adminOverride(label) {
  S.adminOverrideCount++;
  const parts = label.split(' — ');
  S.auditLog.unshift({
    id: 'LIVE-' + (1000 + S.adminOverrideCount),
    date: RPT_TODAY,
    room: parts[0] || 'Counter',
    admin: S.activeOperator,
    action: /deleted|stopped/i.test(label) ? 'Override' : 'Time edit',
    type: /deleted|stopped/i.test(label) ? 'override' : 'edit',
    reason: parts.slice(1).join(' — ') || label,
    booked: 'Today · ' + billingFormatClock(new Date()),
    started: 'Today · ' + billingFormatClock(new Date()),
    runEdit: '',
    snacks: '—',
    cust: '—',
    phone: '—'
  });
  notify();
}

export function rptPickDate(d) {
  S.rptDate = d;
  notify();
}

export function ownerOpenAudit(i) {
  S.ui.audit = i;
  notify();
}

export function ownerCloseAudit() {
  S.ui.audit = null;
  notify();
}

/* Rows shown on the audit details popup */
export function auditRows(e) {
  const rows = [
    ['Booking / Billing ID', e.id],
    ['TV / Room', e.room],
    [e.started ? 'Time started' : 'Time booked', e.started || e.booked]
  ];
  if (e.started) rows.push(['Time booked', e.booked]);
  if (e.started && e.runEdit) rows.push(['Running time edited', e.runEdit]);
  rows.push(['Snack billing', e.snacks]);
  rows.push(['Customer name', e.cust]);
  rows.push(['Customer number', e.phone]);
  rows.push(['Edited by', e.admin + ' · ' + e.action]);
  rows.push(['Reason', e.reason]);
  return rows;
}

/* ================= FEEDBACKS ================= */
export function ownerPinFeedback(id) {
  for (let i = 0; i < S.ownerFeedbacks.length; i++) {
    if (S.ownerFeedbacks[i].id === id) { S.ownerFeedbacks[i].pinned = true; break; }
  }
  notify();
}

export function ownerFeedbackMarkRead() {
  const open = S.ownerFeedbacks.filter((f) => !f.pinned).length;
  if (!open) return;
  if (!confirm('Mark ' + open + ' feedback as read? Pinned ones stay on your to-do list.')) return;
  S.ownerFeedbacks = S.ownerFeedbacks.filter((f) => f.pinned);
  notify();
}

export function ownerTodoOpen() {
  S.ui.todo = true;
  notify();
}

export function ownerTodoClose() {
  S.ui.todo = false;
  notify();
}

export function ownerTodoDone(id) {
  S.ownerFeedbacks = S.ownerFeedbacks.filter((f) => f.id !== id);
  notify();
}

export function pinnedFeedbacks() {
  return S.ownerFeedbacks.filter((f) => f.pinned);
}

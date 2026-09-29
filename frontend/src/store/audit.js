import { S, notify } from './state';
import { api, run, once } from './api';

/* The live feed and the audit trail are written by the server as each action happens. */

export function rptPickDate(d) {
  S.rptDate = d;
  notify();
}

/* Remember the entry's id, not its position — new entries arrive at the top while the popup is open */
export function ownerOpenAudit(i) {
  S.ui.audit = S.auditLog[i] ? S.auditLog[i].id : null;
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
  return run(() => api('POST', '/owner/feedback/' + id + '/pin'));
}

export function ownerFeedbackMarkRead() {
  const open = S.ownerFeedbacks.filter((f) => !f.pinned).length;
  if (!open) return;
  if (!confirm('Mark ' + open + ' feedback as read? Pinned ones stay on your to-do list.')) return;
  return run(() => api('POST', '/owner/feedback/mark-read'));
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
  return run(() => api('POST', '/owner/feedback/' + id + '/done'));
}

/* Customer side: anonymous feedback */
export async function customerSendFeedback() {
  const text = S.feedbackText.trim();
  if (!text) { alert('Write something first.'); return; }
  await once('feedback', async () => {
    const ok = await run(() => api('POST', '/public/feedback', { text }).then(() => true));
    if (!ok) return;
    S.feedbackText = '';
    S.feedbackSent = true;
    notify();
  });
}

export function pinnedFeedbacks() {
  return S.ownerFeedbacks.filter((f) => f.pinned);
}

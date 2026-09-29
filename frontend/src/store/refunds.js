import { S, notify, HIST_DATES } from './state';
import { rupiah } from './format';
import { docOpen } from './docs';
import { api, run, once } from './api';

/* ================= REFUNDS (operator requests -> owner confirms) =================
   Nothing leaves the drawer on the operator's word alone. A request sits in
   'pending' until the owner approves it; only then does it touch revenue,
   the closing figures and the statistics. */
export function refundById(id) {
  for (let i = 0; i < S.refunds.length; i++) { if (S.refunds[i].id === id) return S.refunds[i]; }
  return null;
}

export function refundPending() {
  return S.refunds.filter((r) => r.status === 'pending');
}

/* Approved refunds only — this is what revenue, closing and stats subtract */
export function refundApprovedTotal(method, date) {
  let t = 0;
  (S.refunds || []).forEach((r) => {
    if (r.status !== 'approved') return;
    if (date && r.date !== date) return;
    if (method && r.method !== method) return;
    t += r.amount;
  });
  return t;
}

/* Is this receipt already spoken for? */
export function refundForReceipt(recId) {
  for (let i = 0; i < S.refunds.length; i++) {
    if (S.refunds[i].recId === recId && S.refunds[i].status !== 'rejected') return S.refunds[i];
  }
  return null;
}

/* ---------- Admin: today's closed payments, each refundable ---------- */
export function todaysReceipts() {
  return (S.ownerReceipts || []).filter((r) => (r.date || HIST_DATES[0]) === HIST_DATES[0]);
}

export function refundOpen(recId) {
  let rec = null;
  (S.ownerReceipts || []).forEach((r) => { if (r.id === recId) rec = r; });
  if (!rec) return;
  if (refundForReceipt(recId)) { alert('This payment already has a refund on it.'); return; }
  S.ui.refund = { rec: rec, amount: String(rec.total), reason: '' };
  notify();
}

export function refundClose() {
  S.ui.refund = null;
  notify();
}

export async function refundSubmit() {
  const ctx = S.ui.refund;
  if (!ctx) return;
  const refundCtx = ctx.rec;
  const amt = parseInt(String(ctx.amount).replace(/[^0-9]/g, ''), 10);
  const reason = ctx.reason.trim();
  if (isNaN(amt) || amt <= 0) { alert('Enter how much is being refunded.'); return; }
  if (amt > refundCtx.total) { alert('A refund cannot be larger than the ' + rupiah(refundCtx.total) + ' that was paid.'); return; }
  if (!reason) { alert('Enter a reason — the owner needs it to decide.'); return; }
  await once('refund-' + refundCtx.id, async () => {
    const id = await run(() => api('POST', '/operator/refunds', { recId: refundCtx.id, amount: amt, reason }));
    if (!id) return;
    S.ui.refund = null;
    docOpen('Refund request sent', { kind:'refund', r:refundById(id) }, 'Nothing has left the drawer yet — the owner has to approve it first.');
  });
}

/* ---------- Owner: decide ---------- */
export function refundDecideOpen(id) {
  if (!refundById(id)) return;
  S.ui.refundDecide = { id: id, showReject: false, note: '' };
  notify();
}

export function refundDecideClose() {
  S.ui.refundDecide = null;
  notify();
}

export async function refundApprove() {
  const id = S.ui.refundDecide.id;
  await once('refund-decide-' + id, async () => {
    const ok = await run(() => api('POST', '/owner/refunds/' + id + '/approve').then(() => true));
    if (!ok) return;
    S.ui.refundDecide = null;
    docOpen('Refund approved', { kind:'refund', r:refundById(id) }, 'Revenue, the cash drawer and the statistics have all been adjusted.');
  });
}

/* First press shows the reason box, the second one rejects */
export async function refundRejectStep() {
  const d = S.ui.refundDecide;
  if (!d.showReject) {
    d.showReject = true;
    notify();
    return;
  }
  const note = d.note.trim();
  if (!note) { alert('Enter a reason — the operator needs to know why.'); return; }
  await once('refund-decide-' + d.id, async () => {
    const ok = await run(() => api('POST', '/owner/refunds/' + d.id + '/reject', { note }).then(() => true));
    if (ok) refundDecideClose();
  });
}

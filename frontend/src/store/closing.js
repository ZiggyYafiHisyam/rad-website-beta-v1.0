import { S, notify, HIST_DATES } from './state';
import { refundApprovedTotal } from './refunds';
import { docOpen } from './docs';
import { billingFormatClock } from './format';
import { api, run, once } from './api';

/* ================= SHIFT CLOSING ================= */
export function closeParse(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[^0-9]/g, '');
  if (!s.length) return null;
  return parseInt(s, 10);
}

export function closeFigures() {
  let cash = S.closeSeed.cash, qris = S.closeSeed.qris;
  (S.ownerReceipts || []).forEach((r) => {
    if ((r.date || HIST_DATES[0]) !== HIST_DATES[0]) return;
    if (r.method === 'Cash') cash += r.total; else qris += r.total;
  });
  /* Approved refunds have physically left the drawer, so the operator's count
     should match a figure that already has them taken out */
  const rc = refundApprovedTotal('Cash', HIST_DATES[0]);
  const rq = refundApprovedTotal('QRIS', HIST_DATES[0]);
  cash -= rc; qris -= rq;
  return { cash:cash, qris:qris, total:cash + qris, refundCash:rc, refundQris:rq, refunds:rc + rq };
}

export function closeSnackFigures() {
  const gaps = [];
  let value = 0;
  S.snackStock.forEach((s, i) => {
    const c = closeParse(S.closeSnackCount[i]);
    if (c === null) return;
    const gap = c - s.qty;
    if (gap !== 0) { gaps.push({ name:s.name, gap:gap, value:gap * s.price }); value += gap * s.price; }
  });
  return { gaps:gaps, value:value };
}

/* Counted-vs-expected gap across cash and QRIS (the dashboard shows it too) */
export function closeDiscrepancy() {
  const f = closeFigures();
  const cashAct = closeParse(S.closeCashActual);
  const qrisAct = closeParse(S.closeQrisActual);
  return (cashAct === null ? 0 : cashAct - f.cash) + (qrisAct === null ? 0 : qrisAct - f.qris);
}

export function closeSetCash(v) { S.closeCashActual = v; notify(); }
export function closeSetQris(v) { S.closeQrisActual = v; notify(); }
export function closeSnackSet(i, v) { S.closeSnackCount[i] = v; notify(); }

export async function closeShift() {
  const cashAct = closeParse(S.closeCashActual);
  const qrisAct = closeParse(S.closeQrisActual);
  if (cashAct === null || qrisAct === null) { alert('Enter the cash you counted and the QRIS total on the GoPay merchant app.'); return; }
  /* Snack counts are keyed by row on screen; the server wants snack ids */
  const snackCounts = {};
  S.snackStock.forEach((sn, i) => { if (closeParse(S.closeSnackCount[i]) !== null) snackCounts[sn.id] = closeParse(S.closeSnackCount[i]); });
  await once('close-shift', async () => {
    const seq = await run(() => api('POST', '/operator/shift/close', { cashActual: cashAct, qrisActual: qrisAct, snackCounts }));
    if (!seq) return;
    /* Owner sees the saved shift in their snapshot; operators get the summary built from the same figures */
    const f = closeFigures();
    const sf = closeSnackFigures();
    const shift = {
      id: 'SHIFT-' + seq, date: HIST_DATES[0], by: S.activeOperator, at: HIST_DATES[0] + ' · ' + billingFormatClock(new Date()),
      cashExpected: f.cash, cashActual: cashAct, qrisExpected: f.qris, qrisActual: qrisAct,
      disc: (cashAct - f.cash) + (qrisAct - f.qris), total: f.total, refunds: f.refunds,
      snackGaps: sf.gaps, snackGapValue: sf.value
    };
    docOpen('Shift summary — ' + shift.by, { kind:'shift', s:shift }, 'Photograph this screen for your own record. A copy is already in the owner’s transaction history.');
  });
}

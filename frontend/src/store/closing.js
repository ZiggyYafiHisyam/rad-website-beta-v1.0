import { S, notify, HIST_DATES, CLOSE_SEED } from './state';
import { billingFormatClock } from './format';
import { refundApprovedTotal } from './refunds';
import { docOpen } from './docs';

/* ================= SHIFT CLOSING ================= */
export function closeParse(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[^0-9]/g, '');
  if (!s.length) return null;
  return parseInt(s, 10);
}

export function closeFigures() {
  let cash = CLOSE_SEED.cash, qris = CLOSE_SEED.qris;
  (S.ownerReceipts || []).forEach((r) => {
    if ((r.date || '16 Sep 2026') !== '16 Sep 2026') return;
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

export function closeShift() {
  const f = closeFigures();
  const cashAct = closeParse(S.closeCashActual);
  const qrisAct = closeParse(S.closeQrisActual);
  if (cashAct === null || qrisAct === null) { alert('Enter the cash you counted and the QRIS total on the GoPay merchant app.'); return; }
  const sf = closeSnackFigures();
  const shift = {
    id: 'SHIFT-' + (201 + S.ownerShifts.length),
    date: HIST_DATES[0],
    by: S.activeOperator,
    at: '16 Sep 2026 · ' + billingFormatClock(new Date()),
    cashExpected: f.cash, cashActual: cashAct,
    qrisExpected: f.qris, qrisActual: qrisAct,
    disc: (cashAct - f.cash) + (qrisAct - f.qris),
    total: f.total,
    refunds: f.refunds,
    snackGaps: sf.gaps, snackGapValue: sf.value
  };
  S.ownerShifts.unshift(shift);
  docOpen('Shift summary — ' + shift.by, { kind:'shift', s:shift }, 'Photograph this screen for your own record. A copy is already in the owner’s transaction history.');
}

/* Shift closing. Expected figures are computed here from the day's receipts
   and approved refunds, then compared with what the operator counted. */
import { getSetting } from '../db.js';
import { bad, int, fmtDate, todayStr } from '../util.js';

export function closeFigures(db) {
  const today = todayStr();
  const sum = (method) => db.prepare(
    method === 'Cash'
      ? "SELECT COALESCE(SUM(total),0) s FROM receipts WHERE date=? AND method='Cash'"
      : "SELECT COALESCE(SUM(total),0) s FROM receipts WHERE date=? AND method!='Cash'").get(today).s;
  const refunded = (method) => db.prepare(
    "SELECT COALESCE(SUM(amount),0) s FROM refunds WHERE status='approved' AND date=? AND method=?").get(today, method).s;
  const rc = refunded('Cash'), rq = refunded('QRIS');
  const cash = +getSetting(db, 'close_seed_cash') + sum('Cash') - rc;
  const qris = +getSetting(db, 'close_seed_qris') + sum('QRIS') - rq;
  return { cash, qris, total: cash + qris, refundCash: rc, refundQris: rq, refunds: rc + rq };
}

export function closeShift(db, op, body) {
  return db.transaction(() => {
    const f = closeFigures(db);
    const cashAct = int(body.cashActual, 'Counted cash', { min: 0 });
    const qrisAct = int(body.qrisActual, 'QRIS total', { min: 0 });

    /* snackCounts: { "<snack id>": counted } — only snacks the operator actually counted */
    const counts = body.snackCounts && typeof body.snackCounts === 'object' ? body.snackCounts : {};
    const gaps = [];
    let gapValue = 0;
    Object.keys(counts).forEach((id) => {
      if (counts[id] === '' || counts[id] === null || counts[id] === undefined) return;
      const counted = int(counts[id], 'Snack count', { min: 0 });
      const sn = db.prepare('SELECT * FROM snacks WHERE id=?').get(+id);
      if (!sn) throw bad('Unknown snack in count');
      const gap = counted - sn.qty;
      if (gap !== 0) { gaps.push({ name: sn.name, gap, value: gap * sn.price }); gapValue += gap * sn.price; }
    });

    const seq = Math.max(200, db.prepare('SELECT COALESCE(MAX(seq),0) m FROM shifts').get().m) + 1;
    const now = Date.now();
    db.prepare(`INSERT INTO shifts
      (seq,date,ts,by,cash_expected,cash_actual,qris_expected,qris_actual,disc,total,refunds,snack_gaps,snack_gap_value)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      seq, fmtDate(now), now, op, f.cash, cashAct, f.qris, qrisAct,
      (cashAct - f.cash) + (qrisAct - f.qris), f.total, f.refunds, JSON.stringify(gaps), gapValue);
    return seq;
  })();
}

/* Real aggregates over the stored receipts and refunds — for the owner's
   own analysis and accounting export. (The Statistics screens in the UI still
   draw from their built-in demo month table.) */
import { fmtDate } from '../util.js';

const clampDays = (d) => Math.min(366, Math.max(1, parseInt(d, 10) || 30));

export function summary(db, days) {
  const since = Date.now() - clampDays(days) * 86400000;
  const group = (col) => db.prepare(
    `SELECT ${col} AS key, COUNT(*) AS count, SUM(total) AS total FROM receipts WHERE ts>=? GROUP BY ${col} ORDER BY total DESC`).all(since);
  const byDay = db.prepare(
    `SELECT date, COUNT(*) AS count, SUM(total) AS total,
       SUM(CASE WHEN method='Cash' THEN total ELSE 0 END) AS cash,
       SUM(CASE WHEN method!='Cash' THEN total ELSE 0 END) AS qris
     FROM receipts WHERE ts>=? GROUP BY date ORDER BY MIN(ts) DESC`).all(since);
  const refunded = db.prepare("SELECT COALESCE(SUM(amount),0) s, COUNT(*) c FROM refunds WHERE status='approved' AND ts>=?").get(since);
  const gross = byDay.reduce((t, d) => t + d.total, 0);
  return {
    days: clampDays(days), gross, refunded: refunded.s, refundCount: refunded.c, net: gross - refunded.s,
    byDay, byMethod: group('method'), byRoom: group('room'), byOperator: group('by'),
    generatedFor: fmtDate(Date.now())
  };
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  /* neutralise spreadsheet formulas in user-typed text */
  const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return /[",\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
};

export function receiptsCsv(db, days) {
  const since = Date.now() - clampDays(days) * 86400000;
  const rows = db.prepare('SELECT * FROM receipts WHERE ts>=? ORDER BY seq').all(since);
  const head = ['id', 'date', 'room', 'customer', 'hours', 'room_amount', 'total', 'method', 'operator', 'member', 'points', 'note', 'reason'];
  const lines = [head.join(',')];
  rows.forEach((r) => lines.push([
    'RCP-' + r.seq, r.date, r.room, r.cust, r.hours, r.room_amt, r.total, r.method, r.by,
    r.member_name, r.pts, r.note, r.reason].map(csvCell).join(',')));
  return lines.join('\n');
}

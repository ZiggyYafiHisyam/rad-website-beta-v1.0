/* Refunds: operator requests, owner decides. Nothing touches revenue, the
   drawer or the statistics until the owner approves. */
import { audit, liveTxn, notice, memberDeduct } from './core.js';
import { bad, conflict, notFound, str, int, rupiah, fmtDate } from '../util.js';

const seqOf = (id) => {
  const n = parseInt(String(id).replace(/^RFD-/, ''), 10);
  if (!Number.isInteger(n)) throw bad('Bad refund id');
  return n;
};

export function requestRefund(db, op, body) {
  return db.transaction(() => {
    const recSeq = parseInt(String(body.recId || '').replace(/^RCP-/, ''), 10);
    const rec = db.prepare('SELECT * FROM receipts WHERE seq=?').get(recSeq);
    if (!rec) throw notFound('Receipt not found');
    if (db.prepare("SELECT 1 FROM refunds WHERE rec_id=? AND status!='rejected'").get('RCP-' + rec.seq)) {
      throw conflict('This payment already has a refund on it.');
    }
    const amount = int(body.amount, 'Refund amount', { min: 1 });
    if (amount > rec.total) throw bad('A refund cannot be larger than the ' + rupiah(rec.total) + ' that was paid.');
    const reason = str(body.reason, 'Reason', { max: 300 });
    const seq = Math.max(301, db.prepare('SELECT COALESCE(MAX(seq),0) m FROM refunds').get().m) + 1;
    const now = Date.now();
    db.prepare(`INSERT INTO refunds
      (seq,rec_id,date,ts,room,cust,paid,amount,method,pts,member_phone,member_name,reason,by,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`).run(
      seq, 'RCP-' + rec.seq, fmtDate(now), now, rec.room, rec.cust, rec.total, amount, rec.method,
      rec.pts || 0, rec.member_phone, rec.member_name, reason, op);
    audit(db, op, rec.room + ' — refund requested for ' + rec.cust + ' (' + rupiah(amount) + (amount < rec.total ? ' partial' : ' full') + ') · ' + reason);
    return 'RFD-' + seq;
  })();
}

export function approveRefund(db, id) {
  return db.transaction(() => {
    const r = db.prepare('SELECT * FROM refunds WHERE seq=?').get(seqOf(id));
    if (!r) throw notFound('Refund not found');
    if (r.status !== 'pending') throw conflict('This refund was already ' + r.status + '.');
    db.prepare("UPDATE refunds SET status='approved', settled_ts=? WHERE seq=?").run(Date.now(), r.seq);
    if (r.member_phone && r.pts) memberDeduct(db, r.member_phone, r.pts, 'Refund · ' + r.room);
    notice(db, 'Refund approved — ' + r.room,
      rupiah(r.amount) + ' back to ' + r.cust + ' via ' + r.method + '. Hand it over and note it on the shift closing.', r.by);
    audit(db, 'Owner', r.room + ' — refund approved by owner for ' + r.cust + ' (' + rupiah(r.amount) + ') · ' + r.reason);
    liveTxn(db, { room: r.room, cust: r.cust, detail: 'refund approved · ' + r.reason, amt: -r.amount, method: r.method, by: 'Owner' });
  })();
}

export function rejectRefund(db, id, body) {
  return db.transaction(() => {
    const r = db.prepare('SELECT * FROM refunds WHERE seq=?').get(seqOf(id));
    if (!r) throw notFound('Refund not found');
    if (r.status !== 'pending') throw conflict('This refund was already ' + r.status + '.');
    const note = str(body.note, 'Reason', { max: 300 });
    db.prepare("UPDATE refunds SET status='rejected', owner_note=?, settled_ts=? WHERE seq=?").run(note, Date.now(), r.seq);
    notice(db, 'Refund rejected — ' + r.room, note + ' (' + rupiah(r.amount) + ' for ' + r.cust + ')', r.by);
    audit(db, 'Owner', r.room + ' — refund rejected by owner for ' + r.cust + ' · ' + note);
  })();
}

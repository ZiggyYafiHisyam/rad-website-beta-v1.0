/* Cross-cutting bits every workflow uses: the audit trail, the owner's live
   feed, notices to operators and the member points engine. Everything takes
   the db handle so callers can run inside their own transaction. */
import { getSetting, setSettingValue } from '../db.js';
import { MEMBER_POINT_CAP, digits, fmtDate, fmtClock, notFound } from '../util.js';

/* ---------- audit trail (the frontend's adminOverride) ---------- */
export function audit(db, operator, label, extra = {}) {
  const seq = +getSetting(db, 'audit_seq') + 1;
  setSettingValue(db, 'audit_seq', seq);
  const now = Date.now();
  const parts = label.split(' — ');
  const override = /deleted|stopped/i.test(label);
  const stamp = 'Today · ' + fmtClock(now);
  db.prepare(`INSERT INTO audit_log
    (ref,date,ts,room,admin,action,type,reason,booked,started,run_edit,snacks,cust,phone)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'LIVE-' + seq, fmtDate(now), now, parts[0] || 'Counter', operator,
    override ? 'Override' : 'Time edit', override ? 'override' : 'edit',
    parts.slice(1).join(' — ') || label, stamp, stamp, extra.runEdit || '',
    extra.snacks || '—', extra.cust || '—', extra.phone || '—');
}

/* ---------- live transaction feed ---------- */
export function liveTxn(db, o) {
  const now = Date.now();
  db.prepare('INSERT INTO live_txns (date,ts,room,cust,detail,amt,method,by) VALUES (?,?,?,?,?,?,?,?)')
    .run(fmtDate(now), now, o.room, o.cust, o.detail, o.amt, o.method, o.by);
}

/* ---------- owner -> operator notices ---------- */
export function notice(db, title, body, to) {
  db.prepare('INSERT INTO notices (title,body,to_who,ts,unread) VALUES (?,?,?,?,1)')
    .run(title, body, to || 'All operators', Date.now());
}

/* ---------- session log ---------- */
export function sessionLog(db, boxId, text) {
  db.prepare('INSERT INTO session_log (box_id,ts,text) VALUES (?,?,?)').run(boxId, Date.now(), text);
}

/* ---------- member points ---------- */
export function pointBlock(db) {
  return { pts: +getSetting(db, 'point_block_pts'), rp: +getSetting(db, 'point_block_rp') };
}

export function pointsFor(db, amount) {
  if (!amount || amount < 0) return 0;
  const b = pointBlock(db);
  return Math.floor(amount / b.rp) * b.pts;
}

export function memberByPhone(db, phone) {
  const d = digits(phone);
  if (d.length < 6) return null;
  const rows = db.prepare('SELECT * FROM members').all();
  for (const m of rows) if (digits(m.phone) === d) return m;
  return null;
}

export function memberOrThrow(db, id) {
  const m = db.prepare('SELECT * FROM members WHERE id=?').get(id);
  if (!m) throw notFound('Member not found');
  return m;
}

/* Time-based rent only earns points; stops at the cap. Returns null for non-members. */
export function memberAward(db, phone, roomAmt, source) {
  const m = memberByPhone(db, phone);
  if (!m) return null;
  const would = pointsFor(db, roomAmt);
  const earned = Math.min(would, Math.max(0, MEMBER_POINT_CAP - m.points));
  const balance = m.points + earned;
  db.prepare('UPDATE members SET points=? WHERE id=?').run(balance, m.id);
  db.prepare('INSERT INTO member_ledger (member_id,ts,source,pts,dropped) VALUES (?,?,?,?,?)')
    .run(m.id, Date.now(), source, earned, would - earned);
  return { member: m, earned, would, balance };
}

/* A refund pulls its points back — never below zero */
export function memberDeduct(db, phone, pts, source) {
  const m = memberByPhone(db, phone);
  if (!m || !pts) return null;
  const taken = Math.min(pts, m.points);
  db.prepare('UPDATE members SET points=? WHERE id=?').run(m.points - taken, m.id);
  db.prepare('INSERT INTO member_ledger (member_id,ts,source,pts,dropped) VALUES (?,?,?,?,0)')
    .run(m.id, Date.now(), source, -taken);
  return { member: m, taken, balance: m.points - taken };
}

/* ---------- rooms & rentable add-ons ---------- */
export function roomOrThrow(db, id) {
  const r = db.prepare('SELECT * FROM rooms WHERE id=?').get(id);
  if (!r) throw notFound('Unknown room');
  return r;
}

export function addonFits(a, room) {
  if (!a.scope || a.scope === 'all') return true;
  if (a.scope === 'room') return room.type === 'room';
  return a.scope === room.console;
}

export function addonFree(a) { return Math.max(0, (a.units || 0) - (a.booked || 0)); }

/* Booked add-on units come back to stock once the bill is paid */
export function addonRelease(db, charges) {
  (charges || []).forEach((c) => {
    if (c.kind !== 'addon') return;
    const a = db.prepare('SELECT id,booked FROM addons WHERE name=?').get(c.name);
    if (a) db.prepare('UPDATE addons SET booked=? WHERE id=?').run(Math.max(0, a.booked - c.qty), a.id);
  });
}

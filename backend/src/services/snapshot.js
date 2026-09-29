/* Builds the JSON the React store hydrates from. Field names match the
   frontend's state object (S) one-to-one, so pages keep reading S.* as before.
   What a caller gets depends on their role:
     public   – rooms, rates, add-ons, rewards, which slots are taken
     operator – + billing, stock, members, today's receipts, refunds, notices
     owner    – + full history, audit log, live feed, feedback, shifts */
import { getSetting } from '../db.js';
import { atLabel, fmtClock, fmtDate, fmtDay, lastDates, parts, todayStr } from '../util.js';
import { addonFree } from './core.js';

const HISTORY_DAYS = 45;

/* ---------- running sessions ---------- */
export function sessionView(db, s, now = Date.now()) {
  const log = db.prepare('SELECT ts,text FROM session_log WHERE box_id=? ORDER BY id').all(s.box_id)
    .map((l) => ({ t: fmtClock(l.ts), text: l.text }));
  const base = {
    running: true, mode: s.mode, customer: s.customer, rate: s.rate,
    startedAt: new Date(s.started_at).toISOString(), method: s.method || undefined,
    memberPhone: s.member_phone || undefined, log
  };
  if (s.mode === 'personal') {
    const elapsed = s.elapsed_base + (s.paused || !s.resumed_at ? 0 : (now - s.resumed_at) / 1000);
    return { ...base, paused: !!s.paused, elapsedSec: Math.floor(elapsed), remainingSec: 0, totalSec: 0 };
  }
  const used = (now - s.started_at) / 1000;
  return { ...base, totalSec: s.total_sec, remainingSec: Math.max(0, Math.ceil(s.total_sec - used)) };
}

export function sessionElapsed(s, now = Date.now()) {
  if (s.mode === 'personal') return s.elapsed_base + (s.paused || !s.resumed_at ? 0 : (now - s.resumed_at) / 1000);
  return Math.min(s.total_sec, (now - s.started_at) / 1000);
}

/* ---------- row -> frontend shape ---------- */
const room = (r) => ({ id: r.id, name: r.name, rate: r.rate, weekend: r.weekend, type: r.type, console: r.console, amen: r.amenities });

const addon = (a) => ({
  id: a.id, name: a.name, price: a.price, scope: a.scope, units: a.units, booked: a.booked,
  free: addonFree(a), ...(a.upgrades_to ? { upgradesTo: a.upgrades_to } : {})
});

const receipt = (r) => ({
  id: 'RCP-' + r.seq, date: r.date, ...(r.kind ? { kind: r.kind } : {}),
  room: r.room, cust: r.cust, hours: r.hours, roomAmt: r.room_amt,
  charges: JSON.parse(r.charges), total: r.total, method: r.method, by: r.by,
  at: atLabel(r.ts), note: r.note, reason: r.reason,
  memberName: r.member_name, memberPhone: r.member_phone, pts: r.pts,
  ptsBalance: r.pts_balance, ptsDropped: r.pts_dropped
});

const refund = (r) => ({
  id: 'RFD-' + r.seq, recId: r.rec_id, date: r.date, room: r.room, cust: r.cust,
  paid: r.paid, amount: r.amount, partial: r.amount < r.paid, method: r.method, pts: r.pts,
  memberPhone: r.member_phone, memberName: r.member_name, reason: r.reason, by: r.by,
  at: atLabel(r.ts), status: r.status, ownerNote: r.owner_note,
  ...(r.settled_ts ? { settledAt: atLabel(r.settled_ts) } : {})
});

const shift = (s) => ({
  id: 'SHIFT-' + s.seq, date: s.date, by: s.by, at: s.date + ' · ' + fmtClock(s.ts),
  cashExpected: s.cash_expected, cashActual: s.cash_actual,
  qrisExpected: s.qris_expected, qrisActual: s.qris_actual,
  disc: s.disc, total: s.total, refunds: s.refunds,
  snackGaps: JSON.parse(s.snack_gaps), snackGapValue: s.snack_gap_value
});

const auditRow = (a) => ({
  id: a.ref, date: a.date, room: a.room, admin: a.admin, action: a.action, type: a.type,
  reason: a.reason, booked: a.booked, started: a.started, runEdit: a.run_edit,
  snacks: a.snacks, cust: a.cust, phone: a.phone
});

const booking = (b) => ({
  id: 'bk' + b.id, dbId: b.id, code: b.code, boxId: b.box_id, room: b.room, cust: b.cust,
  time: b.time, hours: b.hours, method: b.method, ...(b.member_phone ? { memberPhone: b.member_phone } : {}),
  addons: JSON.parse(b.addons), note: b.note || ''
});

/* ---------- which one-hour slots (10.00 … 23.00) are taken today ---------- */
export function takenSlots(db) {
  const out = {};
  const rooms = db.prepare('SELECT id FROM rooms').all();
  rooms.forEach((r) => { out[r.id] = new Set(); });
  const hourNow = +fmtClock(Date.now()).slice(0, 2);
  const mark = (id, fromHour, toHourExclusive) => {
    for (let h = fromHour; h < toHourExclusive; h++) if (h >= 10 && h <= 23 && out[id]) out[id].add(h - 10);
  };
  rooms.forEach((r) => mark(r.id, 10, hourNow)); // hours already gone
  db.prepare("SELECT box_id,time,hours FROM bookings WHERE date=? AND status='pending'").all(todayStr())
    .forEach((b) => { const h = +b.time.slice(0, 2); mark(b.box_id, h, h + b.hours); });
  db.prepare('SELECT * FROM sessions').all().forEach((s) => {
    const startH = parts(s.started_at).h;
    const endTs = s.mode === 'fixed' ? s.started_at + s.total_sec * 1000 : Date.now();
    const q = parts(endTs);
    const endH = q.h + (q.min > 0 ? 1 : 0);
    mark(s.box_id, startH, Math.max(endH, startH + 1));
  });
  const res = {};
  Object.keys(out).forEach((k) => { res[k] = [...out[k]].sort((a, b) => a - b); });
  return res;
}

/* ---------- public ---------- */
export function publicState(db) {
  const maintenance = {};
  db.prepare('SELECT id,maintenance FROM rooms').all().forEach((r) => { maintenance[r.id] = !!r.maintenance; });
  return {
    today: todayStr(),
    HIST_DATES: lastDates(5),
    POINT_BLOCK_PTS: +getSetting(db, 'point_block_pts'),
    POINT_BLOCK_RP: +getSetting(db, 'point_block_rp'),
    LIVE_ROOMS: db.prepare('SELECT * FROM rooms ORDER BY sort').all().map(room),
    addOns: db.prepare('SELECT * FROM addons ORDER BY sort,id').all().map(addon),
    rewardCatalog: db.prepare('SELECT name,cost FROM rewards ORDER BY cost,id').all(),
    roomMaintenance: maintenance,
    slotsTaken: takenSlots(db),
    operatorNames: db.prepare("SELECT name FROM users WHERE role='operator' ORDER BY id").all().map((u) => u.name)
  };
}

/* ---------- staff ---------- */
function staffState(db, user) {
  const today = todayStr();
  const sessions = {}, charges = {};
  const now = Date.now();
  db.prepare('SELECT * FROM sessions').all().forEach((s) => {
    sessions[s.box_id] = sessionView(db, s, now);
    charges[s.box_id] = db.prepare('SELECT kind,name,qty,price FROM session_charges WHERE box_id=? ORDER BY id').all(s.box_id);
  });
  const members = db.prepare('SELECT * FROM members ORDER BY id').all().map((m) => ({
    id: m.id, name: m.name, phone: m.phone, points: m.points, joined: m.joined,
    ledger: db.prepare('SELECT ts,source,pts,dropped FROM member_ledger WHERE member_id=? ORDER BY id DESC').all(m.id)
      .map((l) => ({ at: atLabel(l.ts), source: l.source, pts: l.pts, dropped: l.dropped }))
  }));
  const since = Date.now() - HISTORY_DAYS * 86400000;
  const owner = user.role === 'owner';
  const dateFilter = owner ? 'ts >= ?' : 'date = ?';
  const dateArg = owner ? since : today;

  const state = {
    ...publicState(db),
    activeOperator: user.name,
    role: user.role,
    ownerOperators: db.prepare("SELECT id,name FROM users WHERE role='operator' ORDER BY id").all()
      .map((u) => ({ id: u.id, name: u.name, pass: '••••••' })),
    snackStock: db.prepare('SELECT * FROM snacks ORDER BY sort,id').all()
      .map((s) => ({ id: s.id, name: s.name, qty: s.qty, cost: s.cost, price: s.price, low: s.low, code: s.code })),
    billingState: sessions,
    sessionCharges: charges,
    todayBookings: db.prepare("SELECT * FROM bookings WHERE date=? AND status='pending' ORDER BY time,id").all(today).map(booking),
    ownerMembers: members,
    memberRequests: db.prepare('SELECT * FROM member_requests ORDER BY id').all()
      .map((r) => ({ id: r.id, name: r.name, phone: r.phone, by: r.by, at: atLabel(r.ts, ' ') })),
    ownerNotices: db.prepare('SELECT * FROM notices ORDER BY id DESC LIMIT 50').all()
      .map((n) => ({ id: n.id, title: n.title, body: n.body, to: n.to_who, at: atLabel(n.ts), unread: !!n.unread })),
    ownerReceipts: db.prepare(`SELECT * FROM receipts WHERE ${dateFilter} ORDER BY seq DESC`).all(dateArg).map(receipt),
    refunds: db.prepare(`SELECT * FROM refunds WHERE ${dateFilter} OR status='pending' ORDER BY seq DESC`).all(dateArg).map(refund),
    closeSeed: { cash: +getSetting(db, 'close_seed_cash'), qris: +getSetting(db, 'close_seed_qris') }
  };

  if (owner) {
    state.ownerShifts = db.prepare('SELECT * FROM shifts WHERE ts >= ? ORDER BY seq DESC').all(since).map(shift);
    state.auditLog = db.prepare('SELECT * FROM audit_log WHERE ts >= ? ORDER BY id DESC LIMIT 1000').all(since).map(auditRow);
    state.liveTxns = db.prepare('SELECT * FROM live_txns WHERE date=? ORDER BY id DESC LIMIT 200').all(today)
      .map((t) => ({ t: fmtClock(t.ts), room: t.room, cust: t.cust, detail: t.detail, amt: t.amt, method: t.method, by: t.by }));
    const collected = db.prepare('SELECT COALESCE(SUM(total),0) s FROM receipts WHERE date=?').get(today).s
      - db.prepare("SELECT COALESCE(SUM(amount),0) s FROM refunds WHERE status='approved' AND date=?").get(today).s;
    state.liveCollectedToday = collected;
    state.ownerFeedbacks = db.prepare('SELECT * FROM feedbacks WHERE done=0 ORDER BY id DESC').all()
      .map((f) => ({ id: f.id, date: fmtDay(f.ts), text: f.text, pinned: !!f.pinned }));
  }
  return state;
}

export function stateFor(db, user) {
  return user ? staffState(db, user) : publicState(db);
}

export { fmtDate };

/* Counter workflows: starting / pausing / charging / paying running sessions,
   counter snack orders and booking edits. Every export runs in one SQLite
   transaction, so a failed step never leaves half a payment behind. */
import { sessionElapsed } from './snapshot.js';
import {
  audit, liveTxn, sessionLog, memberAward, roomOrThrow, addonFits, addonFree, addonRelease
} from './core.js';
import {
  HttpError, bad, conflict, notFound, str, int, oneOf, arr, fmtClock, fmtDate, rupiah
} from '../util.js';

const METHODS = ['Cash', 'QRIS'];

export const personalHours = (sec) => Math.max(1, Math.ceil((sec || 0) / 1800) / 2);

function duration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return p(Math.floor(sec / 3600)) + ':' + p(Math.floor((sec % 3600) / 60)) + ':' + p(sec % 60);
}

function sessionOrThrow(db, boxId) {
  const s = db.prepare('SELECT * FROM sessions WHERE box_id=?').get(boxId);
  if (!s) throw notFound('No session is running on that unit');
  return s;
}

function nextSeq(db, table, floor) {
  return Math.max(floor, db.prepare(`SELECT COALESCE(MAX(seq),0) m FROM ${table}`).get().m) + 1;
}

function chargesOf(db, boxId) {
  return db.prepare('SELECT kind,name,qty,price FROM session_charges WHERE box_id=? ORDER BY id').all(boxId);
}

function assertBillable(db, room) {
  if (room.maintenance) throw conflict(room.name + ' is set to maintenance — change it on the Inventory page first.');
  if (db.prepare('SELECT 1 FROM sessions WHERE box_id=?').get(room.id)) throw conflict(room.name + ' already has a session running.');
}

/* ---------- start ---------- */
export function startSession(db, op, body) {
  return db.transaction(() => {
    const room = roomOrThrow(db, str(body.boxId, 'boxId'));
    const customer = str(body.customer, 'Customer name', { max: 80 });
    const mode = oneOf(body.mode || 'fixed', 'mode', ['fixed', 'personal']);
    assertBillable(db, room);
    const now = Date.now();
    if (mode === 'personal') {
      db.prepare(`INSERT INTO sessions (box_id,mode,customer,total_sec,rate,started_at,resumed_at,operator)
        VALUES (?,?,?,?,?,?,?,?)`).run(room.id, 'personal', customer, 0, room.rate, now, now, op);
      sessionLog(db, room.id, 'Personal session started at the counter · stopwatch billing');
      liveTxn(db, { room: room.name, cust: customer, detail: 'personal · stopwatch started', amt: 0, method: 'Running', by: op });
    } else {
      const hours = int(body.hours, 'Hours', { min: 1, max: 12 });
      db.prepare(`INSERT INTO sessions (box_id,mode,customer,total_sec,rate,started_at,operator)
        VALUES (?,?,?,?,?,?,?)`).run(room.id, 'fixed', customer, hours * 3600, room.rate, now, op);
      sessionLog(db, room.id, 'Session started at the counter · ' + hours + ' jam');
      liveTxn(db, { room: room.name, cust: customer, detail: hours + ' jam · billing started', amt: room.rate * hours, method: 'Running', by: op });
    }
  })();
}

export function startFromBooking(db, op, bookingId) {
  return db.transaction(() => {
    const b = db.prepare("SELECT * FROM bookings WHERE id=? AND status='pending'").get(int(bookingId, 'bookingId'));
    if (!b) throw notFound('Booking not found (maybe it was already started)');
    const room = roomOrThrow(db, b.box_id);
    assertBillable(db, room);
    const now = Date.now();
    db.prepare(`INSERT INTO sessions (box_id,mode,customer,total_sec,rate,started_at,method,member_phone,operator)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(room.id, 'fixed', b.cust, b.hours * 3600, room.rate, now, b.method, b.member_phone, op);
    sessionLog(db, room.id, 'Session started from booking · ' + b.hours + ' jam · ' + b.method + ' booking' + (b.member_phone ? ' · member ' + b.cust : ''));

    /* Add-ons the customer picked online go onto the bill (as many as are free now) */
    JSON.parse(b.addons).forEach((line) => {
      const a = db.prepare('SELECT * FROM addons WHERE id=?').get(line.id);
      if (!a || !addonFits(a, room)) return;
      const q = Math.min(line.qty, addonFree(a));
      if (q <= 0) return;
      db.prepare('UPDATE addons SET booked=booked+? WHERE id=?').run(q, a.id);
      db.prepare('INSERT INTO session_charges (box_id,kind,name,qty,price) VALUES (?,?,?,?,?)').run(room.id, 'addon', a.name, q, a.price);
      sessionLog(db, room.id, 'Booked add-on · ' + a.name + ' ×' + q);
    });

    db.prepare("UPDATE bookings SET status='started' WHERE id=?").run(b.id);
    liveTxn(db, { room: b.room, cust: b.cust, detail: b.hours + ' jam · booking confirmed in progress', amt: room.rate * b.hours, method: 'Running', by: op });
  })();
}

/* ---------- personal stopwatch ---------- */
export function togglePause(db, op, boxId) {
  return db.transaction(() => {
    const s = sessionOrThrow(db, boxId);
    if (s.mode !== 'personal') throw bad('Only personal stopwatch sessions can be paused');
    const now = Date.now();
    const elapsed = sessionElapsed(s, now);
    const room = roomOrThrow(db, boxId);
    if (s.paused) {
      db.prepare('UPDATE sessions SET paused=0, resumed_at=? WHERE box_id=?').run(now, boxId);
    } else {
      db.prepare('UPDATE sessions SET paused=1, elapsed_base=?, resumed_at=NULL WHERE box_id=?').run(Math.floor(elapsed), boxId);
    }
    const word = s.paused ? 'resumed' : 'paused';
    sessionLog(db, boxId, 'Stopwatch ' + word + ' at ' + duration(elapsed));
    audit(db, op, room.name + ' — personal stopwatch ' + word + ' for ' + s.customer + ' at ' + duration(elapsed));
  })();
}

/* ---------- charges added mid-session ---------- */
export function addCharges(db, op, boxId, body) {
  return db.transaction(() => {
    const s = sessionOrThrow(db, boxId);
    const room = roomOrThrow(db, boxId);
    const added = [];
    let sum = 0;
    arr(body.snacks || [], 'snacks').forEach((line) => {
      const q = int(line.qty, 'Quantity', { min: 0, max: 999 });
      if (!q) return;
      const sn = db.prepare('SELECT * FROM snacks WHERE id=?').get(int(line.id, 'snack id'));
      if (!sn) throw notFound('Unknown snack');
      if (q > sn.qty) throw conflict('Only ' + sn.qty + ' × ' + sn.name + ' left in stock');
      db.prepare('UPDATE snacks SET qty=qty-? WHERE id=?').run(q, sn.id);
      db.prepare('INSERT INTO session_charges (box_id,kind,name,qty,price) VALUES (?,?,?,?,?)').run(boxId, 'snack', sn.name, q, sn.price);
      added.push(sn.name + ' ×' + q); sum += q * sn.price;
    });
    arr(body.addons || [], 'addons').forEach((line) => {
      const q = int(line.qty, 'Quantity', { min: 0, max: 99 });
      if (!q) return;
      const a = db.prepare('SELECT * FROM addons WHERE id=?').get(int(line.id, 'add-on id'));
      if (!a) throw notFound('Unknown add-on');
      if (!addonFits(a, room)) throw conflict(a.name + ' does not fit ' + room.name);
      if (q > addonFree(a)) throw conflict('Only ' + addonFree(a) + ' × ' + a.name + ' free');
      db.prepare('UPDATE addons SET booked=booked+? WHERE id=?').run(q, a.id);
      db.prepare('INSERT INTO session_charges (box_id,kind,name,qty,price) VALUES (?,?,?,?,?)').run(boxId, 'addon', a.name, q, a.price);
      added.push(a.name + ' ×' + q); sum += q * a.price;
    });
    if (!added.length) return;
    sessionLog(db, boxId, 'Added mid-session · ' + added.join(', ') + ' · ' + rupiah(sum));
    liveTxn(db, { room: room.name, cust: s.customer, detail: 'mid-session · ' + added.join(', '), amt: sum, method: 'On bill', by: op });
    audit(db, op, room.name + ' — ' + added.join(', ') + ' added mid-session (' + rupiah(sum) + ')');
  })();
}

/* ---------- receipts ---------- */
function insertReceipt(db, r) {
  const seq = nextSeq(db, 'receipts', 1040);
  const now = Date.now();
  db.prepare(`INSERT INTO receipts
    (seq,date,ts,kind,room,cust,hours,room_amt,charges,total,method,by,note,reason,member_name,member_phone,pts,pts_balance,pts_dropped)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    seq, fmtDate(now), now, r.kind || null, r.room, r.cust, r.hours, r.roomAmt, JSON.stringify(r.charges), r.total,
    r.method, r.by, r.note, r.reason || null, r.memberName || null, r.memberPhone || null,
    r.pts || 0, r.ptsBalance ?? null, r.ptsDropped || 0);
  return seq;
}

function receiptOut(db, seq) {
  const r = db.prepare('SELECT * FROM receipts WHERE seq=?').get(seq);
  return {
    id: 'RCP-' + r.seq, date: r.date, room: r.room, cust: r.cust, hours: r.hours, roomAmt: r.room_amt,
    charges: JSON.parse(r.charges), total: r.total, method: r.method, by: r.by,
    at: 'Today · ' + fmtClock(r.ts), note: r.note, reason: r.reason,
    memberName: r.member_name, memberPhone: r.member_phone, pts: r.pts, ptsBalance: r.pts_balance, ptsDropped: r.pts_dropped
  };
}

/* ---------- pay & close a session ----------
   The server works out hours and amounts itself from the stored timer, so a
   tampered client cannot change what a session costs. */
export function checkout(db, op, boxId, body) {
  return db.transaction(() => {
    const s = sessionOrThrow(db, boxId);
    const room = roomOrThrow(db, boxId);
    const method = oneOf(body.method, 'Payment method', METHODS);
    const now = Date.now();
    const elapsed = sessionElapsed(s, now);
    let hours, note, reason = null;
    if (s.mode === 'personal') {
      hours = personalHours(elapsed);
      note = 'personal · ' + duration(elapsed) + ' terpakai';
    } else if (s.total_sec - elapsed > 30) {
      reason = str(body.reason, 'Reason for stopping early', { max: 200 });
      hours = Math.max(0.5, Math.ceil(elapsed / 1800) / 2);
      note = 'stop lebih awal · ' + duration(elapsed) + ' terpakai';
    } else {
      hours = Math.round(s.total_sec / 3600 * 2) / 2;
      note = 'selesai · ' + hours + ' jam penuh';
    }
    const roomAmt = Math.round(hours * s.rate);
    const charges = chargesOf(db, boxId);
    const total = roomAmt + charges.reduce((t, c) => t + c.qty * c.price, 0);

    const phone = body.memberPhone || s.member_phone || null;
    const award = phone ? memberAward(db, phone, roomAmt, room.name + ' · ' + hours + ' jam') : null;

    const seq = insertReceipt(db, {
      room: room.name, cust: s.customer, hours, roomAmt, charges, total, method, by: op, note, reason,
      memberName: award && award.member.name, memberPhone: award && award.member.phone,
      pts: award ? award.earned : 0, ptsBalance: award ? award.balance : null,
      ptsDropped: award ? award.would - award.earned : 0
    });

    addonRelease(db, charges);
    db.prepare('DELETE FROM sessions WHERE box_id=?').run(boxId);
    db.prepare('DELETE FROM session_charges WHERE box_id=?').run(boxId);
    db.prepare('DELETE FROM session_log WHERE box_id=?').run(boxId);

    liveTxn(db, { room: room.name, cust: s.customer, detail: hours + ' jam · paid at cashier' + (reason ? ' · ' + reason : ''), amt: total, method, by: op });
    if (reason) audit(db, op, room.name + ' — billing stopped early for ' + s.customer + ' (' + reason + ')');
    if (award) {
      const dropped = award.would - award.earned;
      audit(db, op, room.name + ' — ' + award.earned + ' poin credited to ' + award.member.name + ' (member · now ' + award.balance + '/300)' + (dropped ? ' · ' + dropped + ' dropped at cap' : ''));
    }
    return receiptOut(db, seq);
  })();
}

/* ---------- counter snack order ---------- */
export function counterOrder(db, op, body) {
  return db.transaction(() => {
    const method = oneOf(body.method, 'Payment method', METHODS);
    const cust = str(body.customer, 'Customer', { required: false, max: 80 }) || 'Walk-in';
    const items = [];
    arr(body.items, 'items').forEach((line) => {
      const q = int(line.qty, 'Quantity', { min: 0, max: 999 });
      if (!q) return;
      const sn = db.prepare('SELECT * FROM snacks WHERE id=?').get(int(line.id, 'snack id'));
      if (!sn) throw notFound('Unknown snack');
      if (q > sn.qty) throw conflict('Only ' + sn.qty + ' × ' + sn.name + ' left in stock');
      db.prepare('UPDATE snacks SET qty=qty-? WHERE id=?').run(q, sn.id);
      items.push({ kind: 'snack', name: sn.name, qty: q, price: sn.price });
    });
    if (!items.length) throw bad('Pick at least one snack.');
    const total = items.reduce((t, i) => t + i.qty * i.price, 0);
    const seq = insertReceipt(db, {
      kind: 'counter', room: 'Counter', cust, hours: 0, roomAmt: 0, charges: items, total,
      method, by: op, note: 'counter order'
    });
    liveTxn(db, { room: 'Counter', cust, detail: items.map((i) => i.name + ' ×' + i.qty).join(', '), amt: total, method, by: op });
    return receiptOut(db, seq);
  })();
}

/* ---------- edit / delete a pending booking ---------- */
export function editBooking(db, op, id, body) {
  return db.transaction(() => {
    const b = db.prepare("SELECT * FROM bookings WHERE id=? AND status='pending'").get(int(id, 'id'));
    if (!b) throw notFound('Booking not found');
    const name = str(body.name, 'Name', { max: 80 });
    const time = str(body.time, 'Time', { max: 5 });
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) throw bad('Time must look like 17:00');
    const method = oneOf(body.method, 'Payment method', METHODS);
    const note = str(body.methodNote, 'Note', { required: false, max: 200 });
    db.prepare('UPDATE bookings SET cust=?, time=?, method=? WHERE id=?').run(name, time, method, b.id);
    let msg = b.room + ' — updated (' + name + ', ' + time + ', ' + method + ')';
    if (method !== b.method) msg += ' — method changed: ' + (note || 'no note provided');
    audit(db, op, msg, { cust: name, phone: b.phone || '—' });
  })();
}

export function deleteBooking(db, op, id, body) {
  return db.transaction(() => {
    const b = db.prepare("SELECT * FROM bookings WHERE id=? AND status='pending'").get(int(id, 'id'));
    if (!b) throw notFound('Booking not found');
    const reason = str(body.reason, 'Reason for deletion', { max: 200 });
    db.prepare("UPDATE bookings SET status='deleted' WHERE id=?").run(b.id);
    audit(db, op, b.room + ' — booking deleted (' + reason + ')', { cust: b.cust, phone: b.phone || '—' });
  })();
}

export function setMaintenance(db, roomId, on) {
  const room = roomOrThrow(db, roomId);
  db.prepare('UPDATE rooms SET maintenance=? WHERE id=?').run(on ? 1 : 0, room.id);
}

export { HttpError };

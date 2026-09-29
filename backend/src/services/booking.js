/* Customer-facing booking + member lookup. Prices are computed here, never
   trusted from the browser. */
import { takenSlots } from './snapshot.js';
import { roomOrThrow, addonFits, addonFree, memberByPhone, pointsFor } from './core.js';
import { MEMBER_POINT_CAP, atLabel, bad, conflict, notFound, str, int, oneOf, arr, fmtDate, fmtCompact, todayStr } from '../util.js';

const OPEN_HOUR = 10;   // first slot 10.00
const SLOT_COUNT = 14;  // ... last slot 23.00

/* Rp 5.000 off each extra hour, capped at 2 extra hours */
export function quote(rate, hours) {
  if (hours <= 0) return 0;
  return rate * hours - Math.min(hours - 1, 2) * 5000;
}

export function lookupMember(db, phone) {
  const m = memberByPhone(db, phone);
  if (!m) throw notFound('Nomor ini belum terdaftar sebagai member.');
  const ledger = db.prepare('SELECT ts,source,pts,dropped FROM member_ledger WHERE member_id=? ORDER BY id DESC LIMIT 6').all(m.id)
    .map((l) => ({ at: atLabel(l.ts), source: l.source, pts: l.pts, dropped: l.dropped }));
  return {
    name: m.name, phone: m.phone, points: m.points, joined: m.joined,
    headroom: Math.max(0, MEMBER_POINT_CAP - m.points), ledger
  };
}

export function createBooking(db, body) {
  return db.transaction(() => {
    const room = roomOrThrow(db, str(body.boxId, 'Room'));
    if (room.maintenance) throw conflict(room.name + ' is under maintenance right now.');

    const startIdx = int(body.startIdx, 'Start time', { min: 0, max: SLOT_COUNT - 1 });
    const endIdx = int(body.endIdx, 'End time', { min: startIdx, max: SLOT_COUNT - 1 });
    const hours = endIdx - startIdx + 1;
    const taken = new Set(takenSlots(db)[room.id] || []);
    for (let i = startIdx; i <= endIdx; i++) {
      if (taken.has(i)) throw conflict('Jam ' + (OPEN_HOUR + i) + '.00 sudah tidak tersedia — pilih jam lain.');
    }

    const method = oneOf(body.method, 'Payment method', ['Cash di Lokasi', 'QRIS']);
    let name = str(body.name, 'Nama', { max: 80 });
    let wa = str(body.wa, 'Nomor WA', { max: 30 });
    const note = str(body.note, 'Note', { required: false, max: 300 });

    let member = null;
    if (body.memberPhone) {
      member = memberByPhone(db, body.memberPhone);
      if (!member) throw bad('Nomor member tidak ditemukan.');
      name = member.name; wa = member.phone;
    }

    /* add-ons: validated against fit + free units, held on the booking until it starts */
    const lines = [];
    let addonTotal = 0;
    arr(body.addons || [], 'add-ons', { max: 20 }).forEach((l) => {
      const q = int(l.qty, 'Add-on quantity', { min: 0, max: 20 });
      if (!q) return;
      const a = db.prepare('SELECT * FROM addons WHERE id=?').get(int(l.id, 'add-on'));
      if (!a) throw notFound('Unknown add-on');
      if (!addonFits(a, room)) throw conflict(a.name + ' tidak tersedia untuk ' + room.name);
      if (q > addonFree(a)) throw conflict('Stok ' + a.name + ' tinggal ' + addonFree(a));
      lines.push({ id: a.id, name: a.name, qty: q, price: a.price });
      addonTotal += q * a.price;
    });

    const total = quote(room.rate, hours) + addonTotal;
    const now = Date.now();
    const seq = db.prepare('SELECT COUNT(*) c FROM bookings WHERE date=?').get(todayStr()).c + 1;
    const roomNo = String(db.prepare('SELECT sort FROM rooms WHERE id=?').get(room.id).sort + 1).padStart(2, '0');
    const code = (method === 'QRIS' ? 'QRIS' : 'CASH') + roomNo + '-' + fmtCompact(now) + '-' + String(seq).padStart(3, '0');
    const time = (OPEN_HOUR + startIdx) + ':00';

    db.prepare(`INSERT INTO bookings
      (code,box_id,room,cust,phone,time,hours,method,member_phone,note,addons,total,date,status,ts)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending', ?)`).run(
      code, room.id, room.name, name, wa, time, hours, method === 'QRIS' ? 'QRIS' : 'Cash',
      member ? member.phone : null, note, JSON.stringify(lines), total, fmtDate(now), now);

    const would = member ? pointsFor(db, quote(room.rate, hours)) : 0;
    const earn = member ? Math.min(would, Math.max(0, MEMBER_POINT_CAP - member.points)) : 0;
    return {
      code, room: room.name, name, wa, note, hours, total, method,
      start: (OPEN_HOUR + startIdx) + '.00', end: (OPEN_HOUR + endIdx + 1) + '.00',
      addons: lines.length ? lines.map((l) => l.name + (l.qty > 1 ? ' ×' + l.qty : '')).join(', ') : '—',
      member: member ? member.name + ' · ' + (earn ? '+' + earn + ' poin (pending)' : 'poin penuh') : null
    };
  })();
}

export function getBooking(db, code) {
  const b = db.prepare('SELECT * FROM bookings WHERE code=?').get(String(code));
  if (!b) throw notFound('Booking not found');
  return {
    code: b.code, room: b.room, name: b.cust, wa: b.phone, note: b.note || '', hours: b.hours, total: b.total,
    addons: (() => {
      const l = JSON.parse(b.addons);
      return l.length ? l.map((x) => x.name + (x.qty > 1 ? ' ×' + x.qty : '')).join(', ') : '—';
    })(),
    method: b.method === 'QRIS' ? 'QRIS' : 'Cash di Lokasi', status: b.status,
    start: b.time.replace(':', '.'), end: (+b.time.slice(0, 2) + b.hours) + '.00'
  };
}

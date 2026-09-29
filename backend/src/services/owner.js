/* Owner-only management: accounts, members, rewards, stock, prices, feedback. */
import { hashPassword, verifyPassword } from '../auth.js';
import { setSettingValue } from '../db.js';
import { audit, notice, memberByPhone } from './core.js';
import {
  MEMBER_POINT_CAP, bad, conflict, notFound, str, int, oneOf, arr, digits, rupiah, fmtDate
} from '../util.js';

const PLACEHOLDER = '••••••';

/* ---------- operator accounts ---------- */
export function saveOperators(db, rows) {
  db.transaction(() => {
    arr(rows, 'operators', { max: 30 });
    const clean = rows.filter((r) => r && String(r.name || '').trim());
    if (!clean.length) throw bad('Keep at least one operator account.');
    const names = clean.map((r) => String(r.name).trim().toLowerCase());
    if (new Set(names).size !== names.length) throw bad('Operator names must be unique.');

    const keep = [];
    clean.forEach((r) => {
      const name = str(r.name, 'Operator name', { max: 40 });
      const pass = typeof r.pass === 'string' && r.pass !== PLACEHOLDER ? r.pass : '';
      if (pass && pass.length < 6) throw bad('Passwords need at least 6 characters (' + name + ').');
      const existing = r.id ? db.prepare("SELECT id FROM users WHERE id=? AND role='operator'").get(+r.id) : null;
      if (existing) {
        db.prepare('UPDATE users SET name=? WHERE id=?').run(name, existing.id);
        if (pass) db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(hashPassword(pass), existing.id);
        keep.push(existing.id);
      } else {
        if (!pass) throw bad('Set a password for the new operator ' + name + '.');
        keep.push(db.prepare("INSERT INTO users (role,name,pass_hash) VALUES ('operator',?,?)").run(name, hashPassword(pass)).lastInsertRowid);
      }
    });
    db.prepare("SELECT id FROM users WHERE role='operator'").all()
      .filter((u) => keep.indexOf(u.id) === -1)
      .forEach((u) => db.prepare('DELETE FROM users WHERE id=?').run(u.id));
  })();
}

export function changeOwnerPassword(db, ownerId, current, next) {
  const u = db.prepare("SELECT * FROM users WHERE id=? AND role='owner'").get(ownerId);
  if (!u || !verifyPassword(current, u.pass_hash)) throw bad('Current password is wrong');
  if (String(next || '').length < 8) throw bad('New password needs at least 8 characters');
  db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(hashPassword(next), u.id);
}

/* ---------- members ---------- */
export function updateMember(db, id, body) {
  db.transaction(() => {
    const m = db.prepare('SELECT * FROM members WHERE id=?').get(int(id, 'id'));
    if (!m) throw notFound('Member not found');
    const name = str(body.name, 'Name', { max: 80 });
    const phone = str(body.phone, 'Number', { max: 30 });
    const points = int(body.points, 'Points', { min: 0 });
    if (points > MEMBER_POINT_CAP) throw bad('Points cap at ' + MEMBER_POINT_CAP + '.');
    const clash = memberByPhone(db, phone);
    if (clash && clash.id !== m.id) throw conflict('Another member already uses that number.');
    db.prepare('UPDATE members SET name=?, phone=?, points=? WHERE id=?').run(name, phone, points, m.id);
    if (points !== m.points) {
      db.prepare('INSERT INTO member_ledger (member_id,ts,source,pts,dropped) VALUES (?,?,?,?,0)')
        .run(m.id, Date.now(), 'Adjusted by owner', points - m.points);
    }
  })();
}

export function deleteMember(db, id) {
  const r = db.prepare('DELETE FROM members WHERE id=?').run(int(id, 'id'));
  if (!r.changes) throw notFound('Member not found');
}

export function requestMember(db, op, body) {
  const name = str(body.name, 'Customer name', { max: 80 });
  const phone = str(body.phone, 'Phone number', { max: 30 });
  if (digits(phone).length < 8) throw bad('Enter a valid phone number');
  if (memberByPhone(db, phone)) throw conflict('That number is already a member.');
  if (db.prepare('SELECT COUNT(*) c FROM member_requests').get().c >= 200) throw conflict('Too many pending requests');
  db.prepare('INSERT INTO member_requests (name,phone,by,ts) VALUES (?,?,?,?)').run(name, phone, op, Date.now());
}

export function approveRequest(db, id) {
  db.transaction(() => {
    const r = db.prepare('SELECT * FROM member_requests WHERE id=?').get(int(id, 'id'));
    if (!r) throw notFound('Request not found');
    if (memberByPhone(db, r.phone)) throw conflict('That number is already a member.');
    db.prepare('INSERT INTO members (name,phone,points,joined) VALUES (?,?,0,?)').run(r.name, r.phone, fmtDate(Date.now()));
    db.prepare('DELETE FROM member_requests WHERE id=?').run(r.id);
  })();
}

export function rejectRequest(db, id, body) {
  db.transaction(() => {
    const r = db.prepare('SELECT * FROM member_requests WHERE id=?').get(int(id, 'id'));
    if (!r) throw notFound('Request not found');
    const reason = str(body.reason, 'Reason', { max: 300 });
    db.prepare('DELETE FROM member_requests WHERE id=?').run(r.id);
    notice(db, 'Membership rejected — ' + r.name, reason, r.by);
  })();
}

/* ---------- reward catalog + points rate ---------- */
export function saveRewards(db, body) {
  db.transaction(() => {
    const rp = int(body.rp, 'Rp per block', { min: 1000 });
    const pts = int(body.pts, 'Points per block', { min: 1 });
    const out = [];
    arr(body.rows, 'rewards').forEach((rw) => {
      const name = String(rw.name || '').trim();
      if (!name) return;
      const cost = int(rw.cost, 'Point cost for "' + name + '"', { min: 0 });
      if (cost > MEMBER_POINT_CAP) throw bad('"' + name + '" costs more than the ' + MEMBER_POINT_CAP + '-point cap.');
      out.push({ name: name.slice(0, 120), cost });
    });
    setSettingValue(db, 'point_block_rp', rp);
    setSettingValue(db, 'point_block_pts', pts);
    db.prepare('DELETE FROM rewards').run();
    const ins = db.prepare('INSERT INTO rewards (name,cost) VALUES (?,?)');
    out.forEach((r) => ins.run(r.name, r.cost));
  })();
}

/* ---------- snacks ---------- */
export function saveSnacks(db, rows) {
  db.transaction(() => {
    const keep = [];
    arr(rows, 'snacks').forEach((s, i) => {
      const name = String(s.name || '').trim();
      if (!name) return;
      const qty = int(s.qty, 'Qty for "' + name + '"', { min: 0 });
      const price = int(s.price, 'Selling price for "' + name + '"', { min: 0 });
      const cost = int(s.cost, 'Cost for "' + name + '"', { min: 0, required: false }) || 0;
      const low = int(s.low, 'Low-stock level', { min: 0, required: false }) ?? 5;
      const code = String(s.code || 'B-' + (keep.length + 1)).slice(0, 12);
      const ex = s.id ? db.prepare('SELECT id FROM snacks WHERE id=?').get(+s.id) : null;
      if (ex) {
        db.prepare('UPDATE snacks SET name=?,qty=?,cost=?,price=?,low=?,code=?,sort=? WHERE id=?').run(name, qty, cost, price, low, code, i, ex.id);
        keep.push(ex.id);
      } else {
        keep.push(db.prepare('INSERT INTO snacks (name,qty,cost,price,low,code,sort) VALUES (?,?,?,?,?,?,?)').run(name, qty, cost, price, low, code, i).lastInsertRowid);
      }
    });
    db.prepare('SELECT id FROM snacks').all().filter((r) => keep.indexOf(r.id) === -1)
      .forEach((r) => db.prepare('DELETE FROM snacks WHERE id=?').run(r.id));
  })();
}

/* ---------- rental add-ons ---------- */
export function saveAddons(db, rows) {
  db.transaction(() => {
    const keep = [];
    arr(rows, 'add-ons').forEach((a, i) => {
      const name = String(a.name || '').trim();
      if (!name) return;
      const price = int(a.price, 'Price for "' + name + '"', { min: 0, required: false }) || 0;
      const units = int(a.units, 'Units for "' + name + '"', { min: 0, required: false }) || 0;
      const scope = oneOf(a.scope || 'all', 'Scope', ['all', 'ps4', 'ps5', 'room']);
      const upgrades = a.upgradesTo ? oneOf(a.upgradesTo, 'upgradesTo', ['ps4', 'ps5']) : null;
      const ex = a.id ? db.prepare('SELECT * FROM addons WHERE id=?').get(+a.id) : null;
      if (ex) {
        db.prepare('UPDATE addons SET name=?,price=?,scope=?,units=?,booked=?,upgrades_to=?,sort=? WHERE id=?')
          .run(name, price, scope, units, Math.min(ex.booked, units), upgrades, i, ex.id);
        keep.push(ex.id);
      } else {
        keep.push(db.prepare('INSERT INTO addons (name,price,scope,units,booked,upgrades_to,sort) VALUES (?,?,?,?,0,?,?)')
          .run(name, price, scope, units, upgrades, i).lastInsertRowid);
      }
    });
    db.prepare('SELECT id FROM addons').all().filter((r) => keep.indexOf(r.id) === -1)
      .forEach((r) => db.prepare('DELETE FROM addons WHERE id=?').run(r.id));
  })();
}

/* ---------- TV / room rates ---------- */
export function saveRates(db, rows) {
  return db.transaction(() => {
    const changes = [];
    arr(rows, 'rates').forEach((d) => {
      const room = db.prepare('SELECT * FROM rooms WHERE id=?').get(String(d.id));
      if (!room) throw notFound('Unknown room ' + d.id);
      const wd = int(d.rate, 'Weekday rate for ' + room.name, { min: 1 });
      const we = int(d.weekend, 'Weekend rate for ' + room.name, { min: 1 });
      if (room.rate !== wd) changes.push(room.name + ': ' + rupiah(room.rate) + ' → ' + rupiah(wd) + ' / jam');
      if (room.weekend !== we) changes.push(room.name + ' weekend: ' + rupiah(room.weekend) + ' → ' + rupiah(we) + ' / jam');
      db.prepare('UPDATE rooms SET rate=?, weekend=? WHERE id=?').run(wd, we, room.id);
    });
    if (changes.length) {
      notice(db, 'Price update — ' + (changes.length === 1 ? changes[0].split(':')[0] : changes.length + ' units'),
        changes.join(' · ') + '. Quote the new rate at the counter.', 'All operators');
      audit(db, 'Owner', 'Pricing — owner updated ' + changes.length + ' rate' + (changes.length > 1 ? 's' : '') + ' · ' + changes.join(' · '));
    }
    return changes;
  })();
}

/* ---------- feedback ---------- */
export function addFeedback(db, text) {
  db.prepare('INSERT INTO feedbacks (ts,text) VALUES (?,?)').run(Date.now(), str(text, 'Feedback', { max: 1000 }));
}
export function pinFeedback(db, id) {
  db.prepare('UPDATE feedbacks SET pinned=1 WHERE id=?').run(int(id, 'id'));
}
export function feedbackDone(db, id) {
  db.prepare('UPDATE feedbacks SET done=1 WHERE id=?').run(int(id, 'id'));
}
export function feedbackMarkRead(db) {
  db.prepare('UPDATE feedbacks SET done=1 WHERE pinned=0 AND done=0').run();
}

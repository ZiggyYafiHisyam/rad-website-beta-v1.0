/* SQLite schema + first-run seed. The seed mirrors the demo data the React
   prototype started with, dated relative to "today" so history always looks
   current. Running sessions are NOT seeded — timers would be meaningless the
   moment the server restarts. */
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, setSecret } from './auth.js';
import { fmtDate, fmtCompact, parts } from './util.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.RAD_DB || path.join(here, '..', 'data', 'rad.sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('operator','owner')),
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  UNIQUE (role, name)
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, console TEXT NOT NULL,
  amenities TEXT NOT NULL, rate INTEGER NOT NULL, weekend INTEGER NOT NULL,
  maintenance INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS snacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT NOT NULL,
  qty INTEGER NOT NULL, cost INTEGER NOT NULL DEFAULT 0, price INTEGER NOT NULL,
  low INTEGER NOT NULL DEFAULT 5, sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price INTEGER NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all', units INTEGER NOT NULL DEFAULT 0,
  booked INTEGER NOT NULL DEFAULT 0, upgrades_to TEXT, sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cost INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0, joined TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS member_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ts INTEGER NOT NULL, source TEXT NOT NULL, pts INTEGER NOT NULL, dropped INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS member_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL,
  by TEXT NOT NULL, ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL,
  to_who TEXT NOT NULL, ts INTEGER NOT NULL, unread INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, box_id TEXT NOT NULL,
  room TEXT NOT NULL, cust TEXT NOT NULL, phone TEXT, time TEXT NOT NULL, hours INTEGER NOT NULL,
  method TEXT NOT NULL, member_phone TEXT, note TEXT, addons TEXT NOT NULL DEFAULT '[]',
  total INTEGER NOT NULL DEFAULT 0, date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','started','deleted')),
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  box_id TEXT PRIMARY KEY, mode TEXT NOT NULL CHECK (mode IN ('fixed','personal')),
  customer TEXT NOT NULL, total_sec INTEGER NOT NULL DEFAULT 0, rate INTEGER NOT NULL,
  started_at INTEGER NOT NULL, paused INTEGER NOT NULL DEFAULT 0,
  elapsed_base INTEGER NOT NULL DEFAULT 0, resumed_at INTEGER,
  method TEXT, member_phone TEXT, operator TEXT
);
CREATE TABLE IF NOT EXISTS session_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, box_id TEXT NOT NULL, ts INTEGER NOT NULL, text TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS session_charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT, box_id TEXT NOT NULL, kind TEXT NOT NULL,
  name TEXT NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  seq INTEGER PRIMARY KEY, date TEXT NOT NULL, ts INTEGER NOT NULL, kind TEXT,
  room TEXT NOT NULL, cust TEXT NOT NULL, hours REAL NOT NULL DEFAULT 0,
  room_amt INTEGER NOT NULL DEFAULT 0, charges TEXT NOT NULL DEFAULT '[]', total INTEGER NOT NULL,
  method TEXT NOT NULL, by TEXT NOT NULL, note TEXT, reason TEXT,
  member_name TEXT, member_phone TEXT, pts INTEGER NOT NULL DEFAULT 0,
  pts_balance INTEGER, pts_dropped INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS receipts_date ON receipts(date);

CREATE TABLE IF NOT EXISTS refunds (
  seq INTEGER PRIMARY KEY, rec_id TEXT NOT NULL, date TEXT NOT NULL, ts INTEGER NOT NULL,
  room TEXT NOT NULL, cust TEXT NOT NULL, paid INTEGER NOT NULL, amount INTEGER NOT NULL,
  method TEXT NOT NULL, pts INTEGER NOT NULL DEFAULT 0, member_phone TEXT, member_name TEXT,
  reason TEXT NOT NULL, by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  owner_note TEXT NOT NULL DEFAULT '', settled_ts INTEGER
);

CREATE TABLE IF NOT EXISTS shifts (
  seq INTEGER PRIMARY KEY, date TEXT NOT NULL, ts INTEGER NOT NULL, by TEXT NOT NULL,
  cash_expected INTEGER NOT NULL, cash_actual INTEGER NOT NULL,
  qris_expected INTEGER NOT NULL, qris_actual INTEGER NOT NULL,
  disc INTEGER NOT NULL, total INTEGER NOT NULL, refunds INTEGER NOT NULL DEFAULT 0,
  snack_gaps TEXT NOT NULL DEFAULT '[]', snack_gap_value INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT NOT NULL, date TEXT NOT NULL, ts INTEGER NOT NULL,
  room TEXT NOT NULL, admin TEXT NOT NULL, action TEXT NOT NULL, type TEXT NOT NULL,
  reason TEXT NOT NULL, booked TEXT, started TEXT, run_edit TEXT, snacks TEXT,
  cust TEXT, phone TEXT
);
CREATE INDEX IF NOT EXISTS audit_date ON audit_log(date);

CREATE TABLE IF NOT EXISTS live_txns (
  id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, ts INTEGER NOT NULL,
  room TEXT NOT NULL, cust TEXT NOT NULL, detail TEXT NOT NULL, amt INTEGER NOT NULL,
  method TEXT NOT NULL, by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, text TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0, done INTEGER NOT NULL DEFAULT 0
);
`;

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

/* ts for "N days ago at HH:MM" in the shop's timezone */
function when(daysAgo, hhmm) {
  const [H, M] = hhmm.split(':').map(Number);
  const t = Date.now() - daysAgo * 86400000;
  const q = parts(t);
  return t + ((H * 60 + M) - (q.h * 60 + q.min)) * 60000;
}

function seed(db) {
  const setSetting = db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)');
  const opPass = process.env.SEED_OPERATOR_PASSWORD || 'rad1234';
  const ownerPass = process.env.SEED_OWNER_PASSWORD || 'owner1234';

  db.transaction(() => {
    setSetting.run('point_block_pts', '5');
    setSetting.run('point_block_rp', '5000');
    setSetting.run('close_seed_cash', '250000');   // float carried into the drawer
    setSetting.run('close_seed_qris', '170000');
    setSetting.run('audit_seq', '1000');

    /* accounts */
    const addUser = db.prepare('INSERT INTO users (role,name,pass_hash) VALUES (?,?,?)');
    ['Zeke', 'Qori', 'Mutya'].forEach((n) => addUser.run('operator', n, hashPassword(opPass)));
    addUser.run('owner', 'owner', hashPassword(ownerPass));

    /* rooms */
    const addRoom = db.prepare('INSERT INTO rooms (id,name,type,console,amenities,rate,weekend,sort) VALUES (?,?,?,?,?,?,?,?)');
    [
      ['billing-tv1', 'TV 1', 'tv', 'ps5', 'Reguler · PS 5', 50000, 55000],
      ['billing-tv2', 'TV 2', 'tv', 'ps5', 'Reguler · PS 5', 50000, 55000],
      ['billing-tv3', 'TV 3', 'tv', 'ps5', 'Reguler · PS 5', 50000, 55000],
      ['billing-tv4', 'TV 4', 'tv', 'ps5', 'Reguler · PS 5', 50000, 55000],
      ['billing-tv5', 'TV 5', 'tv', 'ps4', 'Reguler · PS 4', 45000, 50000],
      ['billing-private', 'Private Room', 'room', 'ps4', 'Max 2 · PS 4, Netflix', 70000, 80000],
      ['billing-vip', 'VIP Room', 'room', 'ps4', 'Max 4 · PS 4, Netflix, Karaoke', 90000, 100000],
      ['billing-lounge', 'Lounge Room', 'room', 'ps4', 'Max 10 · PS 4, Netflix, Board Game, Meeting Table', 120000, 130000]
    ].forEach((r, i) => addRoom.run(...r, i));

    /* stock */
    const addSnack = db.prepare('INSERT INTO snacks (code,name,qty,cost,price,low,sort) VALUES (?,?,?,?,?,?,?)');
    [
      ['B-1', 'Mineral water', 4, 1500, 5000], ['B-2', 'Pucuk', 41, 3500, 6000],
      ['B-3', 'Pop Mie', 8, 5000, 8000], ['B-4', "Trick's", 2, 4200, 7000],
      ['B-5', 'Kacang Garuda', 48, 3000, 5000], ['B-6', 'Cimory', 18, 5900, 9000]
    ].forEach((s, i) => addSnack.run(s[0], s[1], s[2], s[3], s[4], 5, i));

    const addAddon = db.prepare('INSERT INTO addons (name,price,scope,units,booked,upgrades_to,sort) VALUES (?,?,?,?,?,?,?)');
    addAddon.run('Extra controller (PS 4)', 5000, 'ps4', 4, 0, null, 0);
    addAddon.run('Extra controller (PS 5)', 10000, 'ps5', 3, 0, null, 1);
    addAddon.run('PS 5 for Room', 15000, 'room', 2, 0, 'ps5', 2);

    const addReward = db.prepare('INSERT INTO rewards (name,cost) VALUES (?,?)');
    [['Mineral water', 20], ['Pop Mie + Pucuk', 45], ['Snack bundle (Kacang + Cimory)', 60],
      ['Free 1 jam TV reguler', 110], ['RAD lanyard merch', 150], ['Free 1 jam Private Room', 180],
      ['Free 2 jam VIP Room', 280], ['Lounge Room 2 jam (max 10 orang)', 300]].forEach((r) => addReward.run(...r));

    /* members */
    const addMember = db.prepare('INSERT INTO members (name,phone,points,joined) VALUES (?,?,?,?)');
    const addLedger = db.prepare('INSERT INTO member_ledger (member_id,ts,source,pts,dropped) VALUES (?,?,?,?,?)');
    const mem = (name, phone, pts, joined, ledger) => {
      const id = addMember.run(name, phone, pts, joined).lastInsertRowid;
      (ledger || []).forEach((l) => addLedger.run(id, when(l[0], l[1]), l[2], l[3], l[4]));
    };
    mem('Andi Saputra', '0812-3456-7890', 180, '12 Jul 2026', [[2, '20:10', 'TV 2 · 2 jam', 95, 0], [4, '19:05', 'Lounge Room · 1 jam', 85, 0]]);
    mem('Sinta Maharani', '0813-2244-1180', 275, '28 Jul 2026', [[1, '18:30', 'VIP Room · 2 jam', 190, 0]]);
    mem('Dedi Kurniawan', '0852-9087-6611', 290, '03 Jun 2026', [[0, '21:00', 'TV 4 · 1 jam', 50, 15]]);
    mem('Rizky Pratama', '0857-1122-3344', 120, '19 Aug 2026');
    mem('Nabila Azzahra', '0896-7788-2210', 60, '02 Sep 2026');
    mem('Fajar Ramadhan', '0821-5566-7788', 240, '15 Jun 2026');

    const addReq = db.prepare('INSERT INTO member_requests (name,phone,by,ts) VALUES (?,?,?,?)');
    addReq.run('Bayu Anggara', '0812-7788-1122', 'Zeke', when(0, '18:12'));
    addReq.run('Laras Wulandari', '0857-3321-9087', 'Mutya', when(0, '16:40'));

    db.prepare('INSERT INTO notices (title,body,to_who,ts,unread) VALUES (?,?,?,?,1)').run(
      'Price update — Lounge Room',
      'Weekend rate is Rp 130.000 / jam starting Saturday. Quote the new rate at the counter.',
      'All operators', when(1, '09:20'));

    /* today's bookings (they feed the operator's billing list) */
    const addBooking = db.prepare(`INSERT INTO bookings
      (code,box_id,room,cust,phone,time,hours,method,member_phone,total,date,status,ts)
      VALUES (?,?,?,?,?,?,?,?,?,?,?, 'pending', ?)`);
    const today = fmtDate(Date.now()), compact = fmtCompact(Date.now());
    addBooking.run('CASH08-' + compact + '-001', 'billing-lounge', 'Lounge Room', 'Andi Saputra', '0812-3456-7890', '17:00', 2, 'Cash', '0812-3456-7890', 230000, today, when(0, '09:00'));
    addBooking.run('QRIS01-' + compact + '-002', 'billing-tv1', 'TV 1', 'Sinta Maharani', '0813-2244-1180', '18:00', 1, 'QRIS', '0813-2244-1180', 50000, today, when(0, '09:30'));
    addBooking.run('QRIS04-' + compact + '-003', 'billing-tv4', 'TV 4', 'Fahmi', null, '19:00', 3, 'QRIS', null, 140000, today, when(0, '10:00'));

    /* receipts */
    const addRec = db.prepare(`INSERT INTO receipts
      (seq,date,ts,room,cust,hours,room_amt,charges,total,method,by,note,reason)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const rec = (seq, day, hhmm, room, cust, hours, roomAmt, charges, total, method, by, note, reason) => {
      const ts = when(day, hhmm);
      addRec.run(seq, fmtDate(ts), ts, room, cust, hours, roomAmt, JSON.stringify(charges), total, method, by, note, reason);
    };
    rec(1039, 0, '19:55', 'TV 2', 'Rizky', 2, 95000, [{ name: 'Pucuk', qty: 1, price: 6000, kind: 'snack' }], 101000, 'Cash', 'Qori', 'selesai · 2 jam penuh', null);
    rec(1040, 0, '18:20', 'TV 5', 'Nabila', 1, 45000, [{ name: 'Extra controller (PS 4)', qty: 1, price: 5000, kind: 'addon' }], 50000, 'QRIS', 'Qori', 'selesai · 1 jam penuh', null);
    rec(1034, 1, '21:10', 'Lounge Room', 'Andi', 2, 240000, [{ name: 'Cimory', qty: 4, price: 9000, kind: 'snack' }], 276000, 'QRIS', 'Mutya', 'selesai · 2 jam penuh', null);
    rec(1033, 1, '19:05', 'TV 3', 'Bayu', 1.5, 75000, [], 75000, 'Cash', 'Mutya', 'stop lebih awal · 01:30:00 terpakai', 'customer selesai lebih awal');

    /* one refund already waiting for the owner */
    const rts = when(0, '18:34');
    db.prepare(`INSERT INTO refunds (seq,rec_id,date,ts,room,cust,paid,amount,method,reason,by,status)
      VALUES (302,'RCP-1040',?,?, 'TV 5','Nabila',50000,50000,'QRIS',?,?, 'pending')`)
      .run(fmtDate(rts), rts, 'Stick PS 4 rusak 20 menit, customer batal main', 'Qori');

    const sts = when(1, '23:40');
    db.prepare(`INSERT INTO shifts (seq,date,ts,by,cash_expected,cash_actual,qris_expected,qris_actual,disc,total)
      VALUES (200,?,?, 'Mutya',310000,310000,276000,276000,0,586000)`).run(fmtDate(sts), sts);

    /* audit log */
    const addAudit = db.prepare(`INSERT INTO audit_log
      (ref,date,ts,room,admin,action,type,reason,booked,started,run_edit,snacks,cust,phone)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const aud = (prefix, seq, day, room, admin, action, type, reason, booked, started, runEdit, snacks, cust, phone) => {
      const ts = when(day, booked); // booked time also orders the row
      const d = fmtDate(ts);
      addAudit.run(prefix + '-' + fmtCompact(ts) + '-' + seq, d, ts, room, admin, action, type, reason,
        d + ' · ' + booked, started ? d + ' · ' + started : '', runEdit, snacks, cust, phone);
    };
    aud('CASH03', '014', 0, 'TV 3', 'Zeke', 'Time edit', 'edit', 'Requested later slot', '14:00', '14:06', '2 jam → 3 jam (+1 jam)', 'Pop Mie ×2, Pucuk ×1 — Rp 22.000', 'Rizky Pratama', '0857-1122-3344');
    aud('QRIS05', '011', 0, 'VIP Room', 'Qori', 'Override cancel', 'override', 'No-show 20 min', '19:00', '', '', 'none', 'Sinta Maharani', '0813-2244-1180');
    aud('CASH01', '003', 1, 'Lounge Room', 'Mutya', 'Method change', 'edit', 'Paid QRIS on arrival', '20:00', '20:04', 'no change', 'Cimory ×4, Kacang Garuda ×2 — Rp 46.000', 'Andi Saputra', '0812-3456-7890');
    aud('CASH02', '021', 2, 'TV 5', 'Zeke', 'Snack added', 'edit', 'Add-on billed mid-session', '16:30', '16:32', '1 jam → 2 jam (+1 jam)', 'Mineral water ×3 — Rp 15.000', 'Nabila Azzahra', '0896-7788-2210');
    aud('QRIS02', '018', 2, 'Private Room', 'Qori', 'Override stop', 'override', 'AC mati, sesi dihentikan', '21:00', '21:03', '3 jam → 1 jam (−2 jam)', 'none', 'Bagas Wicaksono', '0821-5566-7788');

    /* live feed (today) */
    const addTxn = db.prepare('INSERT INTO live_txns (date,ts,room,cust,detail,amt,method,by) VALUES (?,?,?,?,?,?,?,?)');
    [['19:30', 'Lounge Room', 'Andi', 'booking confirmed for 21:00', 120000, 'QRIS', 'Mutya'],
      ['19:55', 'TV 2', 'Rizky', '2 jam · paid', 95000, 'Cash', 'Qori'],
      ['20:18', 'Counter', 'Walk-in', 'Pop Mie ×2 · Pucuk ×1', 22000, 'Cash', 'Qori']].forEach((t) => {
      const ts = when(0, t[0]);
      addTxn.run(fmtDate(ts), ts, t[1], t[2], t[3], t[4], t[5], t[6]);
    });

    /* feedback */
    const addFb = db.prepare('INSERT INTO feedbacks (ts,text) VALUES (?,?)');
    [[9, 'Antrian jam ramai agak lama, mungkin bisa booking online'], [11, 'Point reward-nya bagus, udah tuker Pop Mie 2x'],
      [7, 'Tolong tambah game racing di TV 5'], [8, 'Private Room worth it, sofanya enak'],
      [5, 'Wifi sempat drop pas main online sekitar jam 8'], [4, 'Operator Qori ramah banget, bantuin setting stick'],
      [3, 'Lounge Room AC kurang dingin pas rame'], [2, 'Would love more snack options'],
      [1, 'Table 3 controller drifts a bit, might need replacing']].forEach((f) => addFb.run(when(f[0], '15:00'), f[1]));
  })();
}

export function getSetting(db, key) {
  const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return r ? r.value : null;
}
export function setSettingValue(db, key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run(key, String(value));
}

export function createDb(file = DB_FILE, { reset = false } = {}) {
  if (reset && file !== ':memory:') {
    for (const suffix of ['', '-wal', '-shm']) { try { fs.unlinkSync(file + suffix); } catch (e) { /* not there */ } }
  }
  const db = open(file);
  const fresh = !db.prepare("SELECT name FROM sqlite_master WHERE name='users'").get()
    || db.prepare('SELECT COUNT(*) c FROM users').get().c === 0;
  if (fresh) seed(db);

  /* Token signing secret: env wins, otherwise generated once and kept in the DB */
  let secret = process.env.AUTH_SECRET || getSetting(db, 'auth_secret');
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    setSettingValue(db, 'auth_secret', secret);
  }
  setSecret(secret);
  return db;
}

/* `node src/db.js --reset` wipes and re-seeds the file database */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createDb(DB_FILE, { reset: process.argv.includes('--reset') });
  console.log('Database ready at', DB_FILE);
}

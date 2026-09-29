import test from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../src/db.js';
import { createApp } from '../src/server.js';

let server, base;
const db = createDb(':memory:');

test.before(async () => {
  await new Promise((ok) => { server = createApp(db).listen(0, ok); });
  base = 'http://localhost:' + server.address().port + '/api';
});
test.after(() => server.close());

async function call(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, json };
}
const login = async (role, name, password) => (await call('POST', '/auth/login', { role, name, password })).json;

test('public state hides staff data', async () => {
  const { json } = await call('GET', '/state');
  assert.equal(json.state.LIVE_ROOMS.length, 8);
  assert.equal(json.state.ownerMembers, undefined);
  assert.equal(json.state.ownerReceipts, undefined);
});

test('auth: wrong password, roles enforced', async () => {
  assert.equal((await call('POST', '/auth/login', { role: 'operator', name: 'Qori', password: 'nope' })).status, 401);
  assert.equal((await call('POST', '/operator/sessions', { boxId: 'billing-tv1', customer: 'x' })).status, 401);
  const op = await login('operator', 'Qori', 'rad1234');
  assert.equal((await call('PUT', '/owner/rates', { rows: [] }, op.token)).status, 403);
});

test('full session: start, charge, pay, points, receipts', async () => {
  const op = (await login('operator', 'Qori', 'rad1234')).token;
  let r = await call('POST', '/operator/sessions', { boxId: 'billing-tv1', customer: 'Tester', mode: 'fixed', hours: 2 }, op);
  assert.equal(r.status, 200);
  assert.equal(r.json.state.billingState['billing-tv1'].totalSec, 7200);
  assert.equal((await call('POST', '/operator/sessions', { boxId: 'billing-tv1', customer: 'B', mode: 'fixed', hours: 1 }, op)).status, 409);

  const snack = r.json.state.snackStock.find((s) => s.name === 'Pucuk');
  r = await call('POST', '/operator/sessions/billing-tv1/charges', { snacks: [{ id: snack.id, qty: 2 }] }, op);
  assert.equal(r.json.state.sessionCharges['billing-tv1'][0].qty, 2);
  assert.equal(r.json.state.snackStock.find((s) => s.name === 'Pucuk').qty, 39);
  assert.equal((await call('POST', '/operator/sessions/billing-tv1/charges', { snacks: [{ id: snack.id, qty: 999 }] }, op)).status, 409);

  // stopping early needs a reason
  assert.equal((await call('POST', '/operator/sessions/billing-tv1/checkout', { method: 'Cash' }, op)).status, 400);
  const before = r.json.state.ownerMembers.find((m) => m.name === 'Andi Saputra').points;
  r = await call('POST', '/operator/sessions/billing-tv1/checkout',
    { method: 'Cash', reason: 'customer left', memberPhone: '0812-3456-7890' }, op);
  assert.equal(r.status, 200);
  const rec = r.json.data;
  assert.equal(rec.hours, 0.5);
  assert.equal(rec.roomAmt, 25000);
  assert.equal(rec.total, 25000 + 2 * 6000);
  assert.equal(rec.pts, 25);
  assert.equal(r.json.state.ownerMembers.find((m) => m.name === 'Andi Saputra').points, before + 25);
  assert.equal(r.json.state.billingState['billing-tv1'], undefined);
  assert.ok(r.json.state.ownerReceipts.some((x) => x.id === rec.id));
});

test('personal stopwatch pause/resume and pricing', async () => {
  const op = (await login('operator', 'Zeke', 'rad1234')).token;
  await call('POST', '/operator/sessions', { boxId: 'billing-tv2', customer: 'P', mode: 'personal' }, op);
  let r = await call('POST', '/operator/sessions/billing-tv2/pause', undefined, op);
  assert.equal(r.json.state.billingState['billing-tv2'].paused, true);
  r = await call('POST', '/operator/sessions/billing-tv2/pause', undefined, op);
  assert.equal(r.json.state.billingState['billing-tv2'].paused, false);
  r = await call('POST', '/operator/sessions/billing-tv2/checkout', { method: 'QRIS' }, op);
  assert.equal(r.json.data.hours, 1);
  assert.equal(r.json.data.total, 50000);
});

test('customer booking: validation, slot blocking, start from booking', async () => {
  const bad = await call('POST', '/public/bookings', { boxId: 'billing-tv3', startIdx: 5, endIdx: 4, name: 'A', wa: '1', method: 'QRIS' });
  assert.equal(bad.status, 400);
  const { json: pub } = await call('GET', '/state');
  const free = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].filter((i) => pub.state.slotsTaken['billing-tv3'].indexOf(i) === -1);
  const idx = free[free.length - 1];
  if (idx === undefined) return; // shop hours are over — nothing bookable today
  const ok = await call('POST', '/public/bookings', { boxId: 'billing-tv3', startIdx: idx, endIdx: idx, name: 'Cust', wa: '0811', method: 'Cash di Lokasi' });
  assert.equal(ok.status, 200);
  assert.match(ok.json.data.code, /^CASH03-\d{8}-\d{3}$/);
  assert.equal(ok.json.data.total, 50000);
  assert.ok(ok.json.state.slotsTaken['billing-tv3'].includes(idx));
  const dup = await call('POST', '/public/bookings', { boxId: 'billing-tv3', startIdx: idx, endIdx: idx, name: 'Cust2', wa: '0812', method: 'QRIS' });
  assert.equal(dup.status, 409);

  const op = (await login('operator', 'Mutya', 'rad1234')).token;
  const st = (await call('GET', '/state', undefined, op)).json.state;
  const bk = st.todayBookings.find((b) => b.code === ok.json.data.code);
  assert.ok(bk);
  const s = await call('POST', '/operator/sessions/from-booking', { bookingId: bk.dbId }, op);
  assert.equal(s.status, 200);
  assert.ok(s.json.state.billingState['billing-tv3']);
  assert.ok(!s.json.state.todayBookings.some((b) => b.code === bk.code));
});

test('refund workflow: request, owner approves, second decision refused', async () => {
  const op = (await login('operator', 'Qori', 'rad1234')).token;
  const owner = (await login('owner', 'owner', 'owner1234')).token;
  const st = (await call('GET', '/state', undefined, op)).json.state;
  assert.ok(st.ownerReceipts.find((r) => r.id === 'RCP-1039'));
  assert.equal((await call('POST', '/operator/refunds', { recId: 'RCP-1039', amount: 999999999, reason: 'x' }, op)).status, 400);
  const req = await call('POST', '/operator/refunds', { recId: 'RCP-1039', amount: 101000, reason: 'Stick rusak' }, op);
  assert.equal(req.status, 200);
  assert.equal((await call('POST', '/operator/refunds', { recId: 'RCP-1039', amount: 1, reason: 'again' }, op)).status, 409);
  const id = req.json.data;
  assert.equal((await call('POST', `/owner/refunds/${id}/approve`, undefined, op)).status, 403);
  const ap = await call('POST', `/owner/refunds/${id}/approve`, undefined, owner);
  assert.equal(ap.status, 200);
  assert.equal(ap.json.state.refunds.find((r) => r.id === id).status, 'approved');
  assert.equal((await call('POST', `/owner/refunds/${id}/approve`, undefined, owner)).status, 409);
});

test('shift closing computes expected figures server-side', async () => {
  const op = (await login('operator', 'Qori', 'rad1234')).token;
  const r = await call('POST', '/operator/shift/close', { cashActual: 0, qrisActual: 0, snackCounts: {} }, op);
  assert.equal(r.status, 200);
  const owner = (await login('owner', 'owner', 'owner1234')).token;
  const mine = (await call('GET', '/state', undefined, owner)).json.state.ownerShifts[0];
  assert.equal(mine.by, 'Qori');
  assert.equal(mine.disc, -(mine.cashExpected + mine.qrisExpected));
  assert.equal((await call('POST', '/operator/shift/close', { cashActual: '', qrisActual: 5 }, op)).status, 400);
});

test('owner editors keep ids, validate, and rates create a notice', async () => {
  const owner = (await login('owner', 'owner', 'owner1234')).token;
  const st = (await call('GET', '/state', undefined, owner)).json.state;
  const rows = st.LIVE_ROOMS.map((r) => ({ id: r.id, rate: r.rate, weekend: r.weekend }));
  rows[0].rate = 60000;
  const rr = await call('PUT', '/owner/rates', { rows }, owner);
  assert.equal(rr.json.data.length, 1);
  assert.equal(rr.json.state.LIVE_ROOMS[0].rate, 60000);
  assert.match(rr.json.state.ownerNotices[0].title, /Price update/);
  assert.equal((await call('PUT', '/owner/rates', { rows: [{ id: 'billing-tv1', rate: 0, weekend: 1 }] }, owner)).status, 400);

  const snacks = st.snackStock.map((s) => ({ ...s }));
  snacks.pop();
  snacks.push({ name: 'New chips', qty: 10, cost: 1000, price: 3000 });
  const sr = await call('PUT', '/owner/snacks', { rows: snacks }, owner);
  assert.equal(sr.json.state.snackStock.length, 6);
  assert.equal(sr.json.state.snackStock[5].name, 'New chips');

  const ops = st.ownerOperators.map((o) => ({ ...o }));
  assert.equal((await call('PUT', '/owner/operators', { rows: [...ops, { name: 'Newbie', pass: '' }] }, owner)).status, 400);
  const ok = await call('PUT', '/owner/operators', { rows: [...ops, { name: 'Newbie', pass: 'secret12' }] }, owner);
  assert.equal(ok.status, 200);
  assert.ok((await login('operator', 'Newbie', 'secret12')).token);
  assert.ok((await login('operator', 'Zeke', 'rad1234')).token);
});

test('members: cap, approve requests, public lookup', async () => {
  const owner = (await login('owner', 'owner', 'owner1234')).token;
  const op = (await login('operator', 'Zeke', 'rad1234')).token;
  const st = (await call('GET', '/state', undefined, owner)).json.state;
  const m = st.ownerMembers[0];
  assert.equal((await call('PATCH', `/owner/members/${m.id}`, { name: m.name, phone: m.phone, points: 301 }, owner)).status, 400);
  assert.equal((await call('POST', '/operator/member-requests', { name: 'Zed', phone: '0899-1111-2222' }, op)).status, 200);
  const zed = (await call('GET', '/state', undefined, owner)).json.state.memberRequests.find((r) => r.name === 'Zed');
  const ap = await call('POST', `/owner/member-requests/${zed.id}/approve`, undefined, owner);
  assert.ok(ap.json.state.ownerMembers.some((x) => x.name === 'Zed'));
  const look = await call('POST', '/public/member-lookup', { phone: '08991111 2222' });
  assert.equal(look.json.data.name, 'Zed');
  assert.equal((await call('POST', '/public/member-lookup', { phone: '0800000000' })).status, 404);
});

test('summary and csv export are owner only', async () => {
  const owner = (await login('owner', 'owner', 'owner1234')).token;
  const op = (await login('operator', 'Qori', 'rad1234')).token;
  assert.equal((await call('GET', '/owner/summary', undefined, op)).status, 403);
  const s = await call('GET', '/owner/summary?days=30', undefined, owner);
  assert.equal(s.status, 200);
  assert.ok(s.json.data.gross > 0);
  const csv = await call('GET', '/owner/export/receipts.csv', undefined, owner);
  assert.match(csv.json, /^id,date,room/);
});

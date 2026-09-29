/* REST API. Every write answers { data, state }: `data` is the operation's
   result (a receipt, a booking code…) and `state` is the caller's fresh
   snapshot, so the frontend never has to make a second request to redraw. */
import { Router } from 'express';
import { verifyPassword, signToken, requireRole, loginThrottle, clearThrottle } from '../auth.js';
import { stateFor } from '../services/snapshot.js';
import * as billing from '../services/billing.js';
import * as booking from '../services/booking.js';
import * as refunds from '../services/refunds.js';
import * as closing from '../services/closing.js';
import * as owner from '../services/owner.js';
import { summary, receiptsCsv } from '../services/reports.js';
import { HttpError, oneOf, str } from '../util.js';

/* tiny in-memory limiter for the unauthenticated write endpoints */
function limit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const rec = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (rec.length >= max) return next(new HttpError(429, 'Too many requests — try again in a minute'));
    rec.push(now);
    hits.set(req.ip, rec);
    next();
  };
}

export default function api(db) {
  const r = Router();

  /* wrap(fn): fn(req) returns the `data` part; the snapshot is attached here */
  const wrap = (fn) => (req, res) => {
    const data = fn(req);
    res.json({ data: data === undefined ? null : data, state: stateFor(db, req.user) });
  };
  const op = (req) => req.user.name;

  r.get('/health', (req, res) => res.json({ ok: true }));

  /* ---------- auth ---------- */
  r.post('/auth/login', loginThrottle, (req, res) => {
    const role = oneOf(req.body.role, 'role', ['operator', 'owner']);
    const name = str(req.body.name, 'Name', { max: 60 });
    const u = db.prepare('SELECT * FROM users WHERE role=? AND name=? COLLATE NOCASE').get(role, name);
    if (!u || !verifyPassword(String(req.body.password || ''), u.pass_hash)) throw new HttpError(401, 'Wrong name or password');
    clearThrottle(req);
    const user = { id: u.id, role: u.role, name: u.name };
    res.json({ token: signToken(user), user, state: stateFor(db, user) });
  });

  r.get('/auth/me', requireRole('operator'), (req, res) => res.json({ user: req.user }));

  /* ---------- state (role-aware) ---------- */
  r.get('/state', (req, res) => res.json({ state: stateFor(db, req.user) }));

  /* ---------- public / customer ---------- */
  const pub = limit(30, 60000);
  r.post('/public/member-lookup', pub, (req, res) => res.json({ data: booking.lookupMember(db, req.body.phone) }));
  r.post('/public/bookings', pub, wrap((req) => booking.createBooking(db, req.body)));
  r.get('/public/bookings/:code', (req, res) => res.json({ data: booking.getBooking(db, req.params.code) }));
  r.post('/public/feedback', limit(5, 60000), wrap((req) => owner.addFeedback(db, req.body.text)));

  /* ---------- operator (also open to the owner) ---------- */
  const staff = Router();
  staff.use(requireRole('operator'));
  staff.post('/sessions', wrap((req) => billing.startSession(db, op(req), req.body)));
  staff.post('/sessions/from-booking', wrap((req) => billing.startFromBooking(db, op(req), req.body.bookingId)));
  staff.post('/sessions/:boxId/pause', wrap((req) => billing.togglePause(db, op(req), req.params.boxId)));
  staff.post('/sessions/:boxId/charges', wrap((req) => billing.addCharges(db, op(req), req.params.boxId, req.body)));
  staff.post('/sessions/:boxId/checkout', wrap((req) => billing.checkout(db, op(req), req.params.boxId, req.body)));
  staff.post('/counter-orders', wrap((req) => billing.counterOrder(db, op(req), req.body)));
  staff.patch('/bookings/:id', wrap((req) => billing.editBooking(db, op(req), req.params.id, req.body)));
  staff.post('/bookings/:id/delete', wrap((req) => billing.deleteBooking(db, op(req), req.params.id, req.body)));
  staff.put('/rooms/:id/maintenance', wrap((req) => billing.setMaintenance(db, req.params.id, !!req.body.maintenance)));
  staff.post('/refunds', wrap((req) => refunds.requestRefund(db, op(req), req.body)));
  staff.post('/member-requests', wrap((req) => owner.requestMember(db, op(req), req.body)));
  staff.post('/shift/close', wrap((req) => closing.closeShift(db, op(req), req.body)));
  staff.post('/notices/read', wrap(() => db.prepare('UPDATE notices SET unread=0').run()));
  r.use('/operator', staff);

  /* ---------- owner only ---------- */
  const own = Router();
  own.use(requireRole('owner'));
  own.put('/operators', wrap((req) => owner.saveOperators(db, req.body.rows)));
  own.post('/password', wrap((req) => owner.changeOwnerPassword(db, req.user.id, req.body.current, req.body.next)));
  own.patch('/members/:id', wrap((req) => owner.updateMember(db, req.params.id, req.body)));
  own.delete('/members/:id', wrap((req) => owner.deleteMember(db, req.params.id)));
  own.post('/member-requests/:id/approve', wrap((req) => owner.approveRequest(db, req.params.id)));
  own.post('/member-requests/:id/reject', wrap((req) => owner.rejectRequest(db, req.params.id, req.body)));
  own.put('/rewards', wrap((req) => owner.saveRewards(db, req.body)));
  own.put('/snacks', wrap((req) => owner.saveSnacks(db, req.body.rows)));
  own.put('/addons', wrap((req) => owner.saveAddons(db, req.body.rows)));
  own.put('/rates', wrap((req) => owner.saveRates(db, req.body.rows)));
  own.post('/refunds/:id/approve', wrap((req) => refunds.approveRefund(db, req.params.id)));
  own.post('/refunds/:id/reject', wrap((req) => refunds.rejectRefund(db, req.params.id, req.body)));
  own.post('/feedback/mark-read', wrap(() => owner.feedbackMarkRead(db)));
  own.post('/feedback/:id/pin', wrap((req) => owner.pinFeedback(db, req.params.id)));
  own.post('/feedback/:id/done', wrap((req) => owner.feedbackDone(db, req.params.id)));
  own.get('/summary', (req, res) => res.json({ data: summary(db, req.query.days) }));
  own.get('/export/receipts.csv', (req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rad-receipts.csv"');
    res.send(receiptsCsv(db, req.query.days));
  });
  r.use('/owner', own);

  return r;
}

# RAD PlayStation — backend

Express + SQLite (better-sqlite3). One process serves the JSON API and, once the
frontend is built, the site itself.

## Run it

```powershell
# terminal 1 — API on :3001 (creates data/rad.sqlite and seeds demo data on first run)
cd backend
npm install
npm run dev

# terminal 2 — UI on :5173 (Vite proxies /api to :3001)
cd frontend
npm install
npm run dev
```

Production-style (single server): `cd frontend && npm run build`, then `cd backend && npm start` and open http://localhost:3001.

Needs Node 20.19+ (the frontend's Vite 7 needs it as well).

## Sign-in (seeded on first run)

| Role | Name | Password |
|---|---|---|
| Operator | Zeke / Qori / Mutya | `rad1234` |
| Owner | `owner` | `owner1234` |

Change them before real use: operators from **Owner → Operators** (leave the field as `••••••` to keep a password), the
owner with `POST /api/owner/password`. To seed different starting passwords set `SEED_OPERATOR_PASSWORD` /
`SEED_OWNER_PASSWORD` before the very first run. `npm run seed:reset` wipes the database and re-seeds it.

## Environment

| Variable | Default | |
|---|---|---|
| `PORT` | `3001` | |
| `RAD_DB` | `backend/data/rad.sqlite` | database file |
| `AUTH_SECRET` | generated, stored in the DB | token signing key |
| `SHOP_TZ` | `Asia/Jakarta` | timezone for "today", receipts and slots |
| `TRUST_PROXY` | unset | set to `1` behind a reverse proxy so rate limits see real IPs |

## API

Every write answers `{ data, state }`; `state` is the caller's fresh snapshot (the shape of the frontend's `S` object).
Send `Authorization: Bearer <token>` from `POST /api/auth/login`. Errors are `{ "error": "message" }`.

**Public** — `GET /api/state` · `POST /api/public/member-lookup` · `POST /api/public/bookings` · `GET /api/public/bookings/:code` · `POST /api/public/feedback`

**Operator** (owner allowed too) — `POST /api/operator/…`
`sessions` (start) · `sessions/from-booking` · `sessions/:box/pause` · `sessions/:box/charges` · `sessions/:box/checkout` ·
`counter-orders` · `PATCH bookings/:id` · `bookings/:id/delete` · `PUT rooms/:id/maintenance` · `refunds` ·
`member-requests` · `shift/close`

**Owner** — `/api/owner/…`
`PUT operators|rewards|snacks|addons|rates` · `POST password` · `PATCH|DELETE members/:id` ·
`member-requests/:id/approve|reject` · `refunds/:id/approve|reject` · `feedback/:id/pin|done`, `feedback/mark-read` ·
`GET summary?days=30` · `GET export/receipts.csv?days=30`

Money is always worked out on the server: checkout recomputes hours and amounts from the stored timer, points are
awarded/deducted server-side (cap 300), and shift-closing expectations come from the day's receipts and approved refunds.

## Tests

`npm test` — end-to-end API tests against an in-memory database.

## Not covered

* **QRIS is not connected to a payment gateway.** A QRIS booking is recorded, and the operator confirms the payment at the counter.
* **Weekend rates are stored but not applied** to billing — the frontend never used them; sessions bill at the weekday rate.
* The Statistics screens still read the built-in demo month table; use `GET /api/owner/summary` for real figures.
* The Vercel config only serves the static frontend — the API needs a Node host with a persistent disk (SQLite file).

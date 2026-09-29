# RAD Playstation — React frontend

A React + JSX + CSS port of `RAD_Website_Online_-_Beta_v1.0.html`. The screens, texts, styles,
demo data and business logic are carried over from that file unchanged; the only structural change is
that pages are reached by URL (react-router) instead of the prototype's left-hand demo sidebar.

## Run

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Routes

| Path | Page |
| --- | --- |
| `/` | Customer · Home |
| `/tv/:id` | Customer · TV / room detail + booking |
| `/payment/cash/:id` | Customer · booked, pay cash at location |
| `/payment/qris/:id` | Customer · QRIS waiting (`?paid=true` → payment successful) |
| `/member` | Customer · membership points |
| `/feedback` | Customer · anonymous feedback |
| `/admin/login` | Operator · start shift |
| `/admin/home` | Operator · dashboard (billing, bookings, refunds, requests) |
| `/admin/inventory` | Operator · inventory (read only) + room state |
| `/admin/closing` | Operator · shift closing |
| `/owner/login` | Owner · sign in |
| `/owner/live` | Owner · live floor |
| `/owner/stats` | Owner · statistics + report download |
| `/owner/reports` | Owner · refunds, audit log, feedback |
| `/owner/history` | Owner · receipts, settled refunds, shift summaries |
| `/owner/people` | Owner · operators, membership requests, members |
| `/owner/stock` | Owner · snacks, rates, add-ons, redeem catalog |
| `/owner/desktop` | Owner · desktop console |

### URL routing

`src/routes.js` is the one map of which URLs are pages. Anything else is redirected:

| You open | You land on |
| --- | --- |
| `/admin`, `/admin/<unknown>` | `/admin/login` |
| `/owner`, `/owner/<unknown>` | `/owner/login` |
| a page with extra segments, e.g. `/admin/home/x` | that page, `/admin/home` |
| a trailing slash, e.g. `/owner/stats/` | `/owner/stats` |
| any other unknown path | `/` |

The same map drives all three places a URL is resolved:

- `api/router.mjs` — the Vercel function; `vercel.json` serves the app for real page paths and sends every other path there for a 302 redirect.
- `vite.config.js` — the same redirects for `npm run dev` / `npm run preview`.
- `src/App.jsx` — in-app URL changes (back / forward) after the app has loaded.

When adding a page, add its path to `src/routes.js` and to the `/index.html` rewrites in `vercel.json`.

## Layout

```
src/
  main.jsx, App.jsx        router + global modals
  styles/app.css           the prototype's stylesheet (sidebar rules removed)
  assets/                  images that were inlined as base64
  store/                   state + logic, ported function by function
    state.js               all state and seed data, notify()/useStore()
    members.js             points engine, members, requests, notices, rewards
    inventory.js           snacks, add-ons, rates, room state, bookings lookup
    billing.js             billing timers, bookings, mid-session charges, payments, counter orders
    refunds.js  closing.js  stats.js  reports.js (CSV / PDF export)  audit.js  customer.js  desk.js
  components/              shared UI: phone frame + tabs, modals, document bodies, admin/owner lists
  pages/customer|admin|owner/   one component per page
```

State is in memory only, exactly like the prototype: it is shared across pages while you navigate
inside the app and resets on a full page reload.

/* ================= APP STATE =================
   Every variable the prototype kept at the top level of its <script> lives on
   this one object, seeded with exactly the same demo data. Actions mutate it in
   place (as the prototype did) and call notify(), which re-renders whatever is
   on screen — the React stand-in for the prototype's render*() calls. */
import { useSyncExternalStore } from 'react';

const listeners = new Set();
let version = 0;

export function notify() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore() {
  useSyncExternalStore(subscribe, () => version);
  return S;
}

/* ---------- navigation bridge ----------
   Actions such as "Start shift" jump to another page. The router registers its
   navigate function here so plain store code can do that. */
let navigateFn = null;
export function setNavigator(fn) { navigateFn = fn; }

export const PAGE_URLS = {
  'customer-home':                 '/',
  'customer-table':                '/tv/1',
  'customer-payment-cash':         '/payment/cash/1',
  'customer-payment-qris-pending': '/payment/qris/1',
  'customer-payment-qris-paid':    '/payment/qris/1?paid=true',
  'customer-member':               '/member',
  'customer-feedback':             '/feedback',
  'admin-login':                   '/admin/login',
  'admin-home':                    '/admin/home',
  'admin-inventory':               '/admin/inventory',
  'admin-closing':                 '/admin/closing',
  'owner-login':                   '/owner/login',
  'owner-live':                    '/owner/live',
  'owner-revenue':                 '/owner/stats',
  'owner-reports':                 '/owner/reports',
  'owner-history':                 '/owner/history',
  'owner-people':                  '/owner/people',
  'owner-stock':                   '/owner/stock',
  'owner-desktop':                 '/owner/desktop'
};

export function showPage(id) {
  goTo(PAGE_URLS[id] || '/');
}

export function goTo(url) {
  if (navigateFn) navigateFn(url);
}

export const MEMBER_POINT_CAP = 300;
/* The last five calendar days, newest first — the server sets them on every load */
export const HIST_DATES = [];

export const ADDON_SCOPES = [
  { key: 'all',  label: 'Anywhere' },
  { key: 'ps4',  label: 'PS 4' },
  { key: 'ps5',  label: 'PS 5' },
  { key: 'room', label: 'Room' }
];

export const ROOM_META = {
  'billing-tv1':     { type:'tv',   console:'ps5', amen:'Reguler · PS 5' },
  'billing-tv2':     { type:'tv',   console:'ps5', amen:'Reguler · PS 5' },
  'billing-tv3':     { type:'tv',   console:'ps5', amen:'Reguler · PS 5' },
  'billing-tv4':     { type:'tv',   console:'ps5', amen:'Reguler · PS 5' },
  'billing-tv5':     { type:'tv',   console:'ps4', amen:'Reguler · PS 4' },
  'billing-private': { type:'room', console:'ps4', amen:'Max 2 · PS 4, Netflix' },
  'billing-vip':     { type:'room', console:'ps4', amen:'Max 4 · PS 4, Netflix, Karaoke' },
  'billing-lounge':  { type:'room', console:'ps4', amen:'Max 10 · PS 4, Netflix, Board Game, Meeting Table' }
};

export const STAT_MONTHS = [
  { label:'September 2026', total:12400000, disc:-42000, days:30, tx:284 },
  { label:'August 2026',    total:11850000, disc:-18000, days:31, tx:271 },
  { label:'July 2026',      total:12960000, disc:-65000, days:31, tx:298 },
  { label:'June 2026',      total:10740000, disc:-31000, days:30, tx:246 },
  { label:'May 2026',       total:11200000, disc:-22000, days:31, tx:259 }
];

/* Occupancy per unit — the same numbers the occupancy chart draws.
   Revenue share is occupancy x the owner's current rate, so a price
   change on Stock & Rewards moves this breakdown too. */
export const STAT_OCC = {
  'billing-tv1':62, 'billing-tv2':74, 'billing-tv3':55, 'billing-tv4':48,
  'billing-tv5':39, 'billing-private':81, 'billing-vip':88, 'billing-lounge':67
};
export const STAT_OPERATORS = [
  { name:'Qori',  share:0.38, gap:0 },
  { name:'Zeke',  share:0.34, gap:-17000 },
  { name:'Mutya', share:0.28, gap:-3000 }
];

/* Everything the server owns. hydrate() (store/api.js) resets these to the
   values below and then fills in whatever the caller's role is allowed to see. */
export function staffDefaults() {
  return {
    today: '',
    role: null,
    activeOperator: '',
    operatorNames: [],
    slotsTaken: {},
    POINT_BLOCK_PTS: 5,
    POINT_BLOCK_RP: 5000,
    LIVE_ROOMS: [],
    addOns: [],
    rewardCatalog: [],
    roomMaintenance: {},
    ownerOperators: [],
    snackStock: [],
    billingState: {},
    sessionCharges: {},
    todayBookings: [],
    ownerMembers: [],
    memberRequests: [],
    ownerNotices: [],
    ownerReceipts: [],
    refunds: [],
    ownerShifts: [],
    auditLog: [],
    liveTxns: [],
    liveCollectedToday: 0,
    ownerFeedbacks: [],
    closeSeed: { cash: 0, qris: 0 }
  };
}

export const S = {
  ...staffDefaults(),
  ready: false,          // first snapshot from the server has arrived
  serverDown: false,
  demo: false,           // running on the bundled snapshot because no backend answered

  memberSearch: '',

  /* ---- customer TV detail page ---- */
  tvRangeStart: null,
  tvRangeEnd: null,
  custRoomId: 'billing-tv1',
  tvAddonQty: {},
  tvVenue: { name: 'TV 1', type: 'tv', console: 'ps5' },
  tvGalleryIndex: 0,
  tvPaymentMethod: null,
  custIdModeValue: 'guest',
  custMember: null,
  custMemberResult: null,          // null | 'notfound' | 'found'
  custForm: { memberInput: '', name: '', wa: '', note: '' },
  receipt: { addons: '—', member: null },
  booking: null,                   // what the server confirmed, shown on the payment pages
  custFilterValue: 'all',

  /* ---- customer membership page ---- */
  custPtsPhone: '',
  custPtsMember: null,             // result of the last "Cek" — { name, phone, points, ledger… }
  custPtsMsgError: false,
  custPtsMsgChecked: false,
  feedbackText: '',
  feedbackSent: false,

  /* ---- operator ---- */
  adminLoginOperator: '',
  opReqStatus: null,

  /* ---- owner desktop console / lists ---- */
  statMonthIdx: 0,
  statRange: { type:'month' },
  statGrain: 'week',
  statPerfOpen: false,
  rptDate: '',
  histDate: '',
  ownerDeskCurrent: 'overview',

  /* ---- shift closing (what the operator typed) ---- */
  closeCashActual: '',
  closeQrisActual: '',
  closeSnackCount: {},

  /* ---- modals / popups (the prototype toggled their display:none) ---- */
  ui: {
    billing: null,       // start / stop billing
    charge: null,        // add to running session
    pay: null,           // payment at counter (payCtx)
    order: null,         // counter snack order
    cpay: null,          // counter order payment (cpayCtx)
    todo: false,
    doc: null,           // receipt / summary document
    adminEdit: null,     // edit booking
    audit: null,         // audit log details (entry id)
    statDate: false,     // statistics date picker
    operatorEditor: null,
    memberEditor: null,
    reject: null,
    rateEditor: null,
    refund: null,
    refundDecide: null,
    addonEditor: null,
    snackEditor: null,
    rewardEditor: null
  }
};

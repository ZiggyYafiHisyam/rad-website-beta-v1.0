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
  const url = PAGE_URLS[id] || '/';
  if (navigateFn) navigateFn(url);
}

export const MEMBER_POINT_CAP = 300;
export const HIST_DATES = ['16 Sep 2026', '15 Sep 2026', '14 Sep 2026', '13 Sep 2026', '12 Sep 2026'];
export const RPT_TODAY = '16 Sep 2026';

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

export const CLOSE_SEED = { cash: 250000, qris: 170000 };

function clockNow() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return p(d.getHours()) + ':' + p(d.getMinutes());
}

const now = Date.now();

export const S = {
  ownerOperators: [
    { name: 'Zeke', pass: '••••••' },
    { name: 'Qori', pass: '••••••' },
    { name: 'Mutya', pass: '••••••' }
  ],

  /* ---- member points engine ---- */
  POINT_BLOCK_PTS: 5,
  POINT_BLOCK_RP: 5000,

  ownerMembers: [
    { name: 'Andi Saputra',   phone: '0812-3456-7890', points: 180, joined: '12 Jul 2026', ledger:[
      { at:'14 Sep · 20:10', source:'TV 2 · 2 jam', pts:95, dropped:0 },
      { at:'12 Sep · 19:05', source:'Lounge Room · 1 jam', pts:85, dropped:0 } ] },
    { name: 'Sinta Maharani', phone: '0813-2244-1180', points: 275, joined: '28 Jul 2026', ledger:[
      { at:'15 Sep · 18:30', source:'VIP Room · 2 jam', pts:190, dropped:0 } ] },
    { name: 'Dedi Kurniawan', phone: '0852-9087-6611', points: 290, joined: '03 Jun 2026', ledger:[
      { at:'16 Sep · 21:00', source:'TV 4 · 1 jam', pts:50, dropped:15 } ] },
    { name: 'Rizky Pratama',  phone: '0857-1122-3344', points: 120, joined: '19 Aug 2026' },
    { name: 'Nabila Azzahra', phone: '0896-7788-2210', points: 60,  joined: '02 Sep 2026' },
    { name: 'Fajar Ramadhan', phone: '0821-5566-7788', points: 240, joined: '15 Jun 2026' }
  ],
  memberSearch: '',

  /* ---- customer TV detail page ---- */
  tvRangeStart: null,
  tvRangeEnd: null,
  custRoomId: 'billing-tv1',
  tvAddonQty: {},
  tvVenue: { name: 'Lounge Room', type: 'room', console: 'ps4' },
  tvGalleryIndex: 0,
  tvPaymentMethod: null,
  custIdModeValue: 'guest',
  custMember: null,
  custMemberResult: null,          // null | 'notfound' | 'found'
  custForm: { memberInput: '', name: '', wa: '', note: '' },
  receipt: { addons: '—', member: null },
  custFilterValue: 'all',

  /* ---- customer membership page ---- */
  custViewPhone: '0812-3456-7890',
  custPtsPhone: '0812-3456-7890',
  custPtsMsgError: false,
  custPtsMsgChecked: false,
  feedbackText: '',

  /* cost = harga beli, price = harga jual. The gap is the Laba column on the
     monthly Penjualan Makanan & Minuman report. */
  snackStock: [
    { name: 'Mineral water', qty: 4,  cost: 1500, price: 5000,  low: 5, code:'B-1' },
    { name: 'Pucuk',         qty: 41, cost: 3500, price: 6000,  low: 5, code:'B-2' },
    { name: 'Pop Mie',       qty: 8,  cost: 5000, price: 8000,  low: 5, code:'B-3' },
    { name: "Trick's",       qty: 2,  cost: 4200, price: 7000,  low: 5, code:'B-4' },
    { name: 'Kacang Garuda', qty: 48, cost: 3000, price: 5000,  low: 5, code:'B-5' },
    { name: 'Cimory',        qty: 18, cost: 5900, price: 9000,  low: 5, code:'B-6' }
  ],

  addOns: [
    { name: 'Extra controller (PS 4)', price: 5000,  scope: 'ps4',  units: 4, booked: 3 },
    { name: 'Extra controller (PS 5)', price: 10000, scope: 'ps5',  units: 3, booked: 1 },
    { name: 'PS 5 for Room',           price: 15000, scope: 'room', units: 2, booked: 1, upgradesTo: 'ps5' }
  ],

  /* ---- billing ---- */
  billingState: {
    'billing-vip': {
      running: true, mode: 'fixed', customer: 'Dedi', remainingSec: 2 * 3600 + 47 * 60, totalSec: 3 * 3600,
      rate: 90000, startedAt: new Date(now - 13 * 60000), method: 'QRIS',
      log: [
        { t:'20:28', text:'Session started · 3 jam · QRIS booking' },
        { t:'20:46', text:'Added mid-session · Pop Mie ×2 · Rp 16.000' }
      ]
    },
    'billing-tv3': {
      running: true, mode: 'personal', paused: false, customer: 'Bagas', elapsedSec: 82 * 60 + 14,
      remainingSec: 0, totalSec: 0, rate: 50000, startedAt: new Date(now - (82 * 60 + 14) * 1000),
      log: [
        { t: clockNow(), text: 'Personal session started at the counter · stopwatch billing' },
        { t: clockNow(), text: 'Snack charged mid-session · Pucuk ×1 (Rp 6.000)' }
      ]
    }
  },
  sessionCharges: {
    'billing-tv3': [{ kind:'snack', name:'Pucuk', qty:1, price:6000 }],
    'billing-vip': [{ name:'Pop Mie', qty:2, price:8000, kind:'snack' }]
  },

  activeOperator: 'Qori',
  adminOverrideCount: 0,
  adminLoginOperator: 'Qori',

  /* ---- owner live floor ---- */
  LIVE_ROOMS: [
    { id:'billing-tv1', name:'TV 1', rate:50000, weekend:55000 },
    { id:'billing-tv2', name:'TV 2', rate:50000, weekend:55000 },
    { id:'billing-tv3', name:'TV 3', rate:50000, weekend:55000 },
    { id:'billing-tv4', name:'TV 4', rate:50000, weekend:55000 },
    { id:'billing-tv5', name:'TV 5', rate:45000, weekend:50000 },
    { id:'billing-private', name:'Private Room', rate:70000, weekend:80000 },
    { id:'billing-vip', name:'VIP Room', rate:90000, weekend:100000 },
    { id:'billing-lounge', name:'Lounge Room', rate:120000, weekend:130000 }
  ],
  liveCollectedToday: 480000,
  liveTxns: [
    { t:'20:41', room:'VIP Room', cust:'Dedi', detail:'3 jam · billing running', amt:270000, method:'QRIS', by:'Qori' },
    { t:'20:18', room:'Counter', cust:'Walk-in', detail:'Pop Mie ×2 · Pucuk ×1', amt:22000, method:'Cash', by:'Qori' },
    { t:'19:55', room:'TV 2', cust:'Rizky', detail:'2 jam · paid', amt:95000, method:'Cash', by:'Qori' },
    { t:'19:30', room:'Lounge Room', cust:'Andi', detail:'booking confirmed for 21:00', amt:120000, method:'QRIS', by:'Mutya' }
  ],

  /* ---- membership requests (operator -> owner) ---- */
  memberRequests: [
    { name:'Bayu Anggara', phone:'0812-7788-1122', by:'Zeke', at:'Today 18:12' },
    { name:'Laras Wulandari', phone:'0857-3321-9087', by:'Mutya', at:'Today 16:40' }
  ],
  opReqStatus: null,

  /* ---- info from owner (owner -> operator) ---- */
  ownerNotices: [
    { title:'Price update — Lounge Room', body:'Weekend rate is Rp 130.000 / jam starting Saturday. Quote the new rate at the counter.', to:'All operators', at:'15 Sep · 09:20', unread:true }
  ],

  /* ---- redeem catalog ---- */
  rewardCatalog: [
    { name:'Mineral water', cost:20 },
    { name:'Pop Mie + Pucuk', cost:45 },
    { name:'Snack bundle (Kacang + Cimory)', cost:60 },
    { name:'Free 1 jam TV reguler', cost:110 },
    { name:'RAD lanyard merch', cost:150 },
    { name:'Free 1 jam Private Room', cost:180 },
    { name:'Free 2 jam VIP Room', cost:280 },
    { name:'Lounge Room 2 jam (max 10 orang)', cost:300 }
  ],

  /* ---- refunds (operator requests -> owner confirms) ----
     One refund already sitting in the owner's queue, so the flow is visible on load */
  refunds: [{
    id:'RFD-302', recId:'RCP-1040', date:'16 Sep 2026',
    room:'TV 5', cust:'Nabila', paid:50000, amount:50000, partial:false,
    method:'QRIS', pts:0, memberPhone:null, memberName:null,
    reason:'Stick PS 4 rusak 20 menit, customer batal main',
    by:'Qori', at:'Today · 18:34', status:'pending', ownerNote:''
  }],
  refundSeq: 1,

  /* ---- statistics ---- */
  statMonthIdx: 0,
  statRange: { type:'month' },
  statGrain: 'week',
  statPerfOpen: false,

  /* ---- booking audit log ---- */
  auditLog: [
    { id:'CASH03-16092026-014', date:'16 Sep 2026', room:'TV 3', admin:'Zeke', action:'Time edit', type:'edit', reason:'Requested later slot',
      booked:'16 Sep 2026 · 14:00', started:'16 Sep 2026 · 14:06', runEdit:'2 jam → 3 jam (+1 jam)',
      snacks:'Pop Mie ×2, Pucuk ×1 — Rp 22.000', cust:'Rizky Pratama', phone:'0857-1122-3344' },
    { id:'QRIS05-16092026-011', date:'16 Sep 2026', room:'VIP Room', admin:'Qori', action:'Override cancel', type:'override', reason:'No-show 20 min',
      booked:'16 Sep 2026 · 19:00', started:'', runEdit:'',
      snacks:'none', cust:'Sinta Maharani', phone:'0813-2244-1180' },
    { id:'CASH01-15092026-003', date:'15 Sep 2026', room:'Lounge Room', admin:'Mutya', action:'Method change', type:'edit', reason:'Paid QRIS on arrival',
      booked:'15 Sep 2026 · 20:00', started:'15 Sep 2026 · 20:04', runEdit:'no change',
      snacks:'Cimory ×4, Kacang Garuda ×2 — Rp 46.000', cust:'Andi Saputra', phone:'0812-3456-7890' },
    { id:'CASH02-14092026-021', date:'14 Sep 2026', room:'TV 5', admin:'Zeke', action:'Snack added', type:'edit', reason:'Add-on billed mid-session',
      booked:'14 Sep 2026 · 16:30', started:'14 Sep 2026 · 16:32', runEdit:'1 jam → 2 jam (+1 jam)',
      snacks:'Mineral water ×3 — Rp 15.000', cust:'Nabila Azzahra', phone:'0896-7788-2210' },
    { id:'QRIS02-14092026-018', date:'14 Sep 2026', room:'Private Room', admin:'Qori', action:'Override stop', type:'override', reason:'AC mati, sesi dihentikan',
      booked:'14 Sep 2026 · 21:00', started:'14 Sep 2026 · 21:03', runEdit:'3 jam → 1 jam (−2 jam)',
      snacks:'none', cust:'Bagas Wicaksono', phone:'0821-5566-7788' }
  ],
  rptDate: RPT_TODAY,

  /* ---- feedbacks ---- */
  ownerFeedbacks: [
    { id:1, date:'15 Sep', text:'Table 3 controller drifts a bit, might need replacing', pinned:false },
    { id:2, date:'14 Sep', text:'Would love more snack options', pinned:false },
    { id:3, date:'13 Sep', text:'Lounge Room AC kurang dingin pas rame', pinned:false },
    { id:4, date:'12 Sep', text:'Operator Qori ramah banget, bantuin setting stick', pinned:false },
    { id:5, date:'11 Sep', text:'Wifi sempat drop pas main online sekitar jam 8', pinned:false },
    { id:6, date:'09 Sep', text:'Private Room worth it, sofanya enak', pinned:false },
    { id:7, date:'08 Sep', text:'Tolong tambah game racing di TV 5', pinned:false },
    { id:8, date:'06 Sep', text:'Antrian jam ramai agak lama, mungkin bisa booking online', pinned:false },
    { id:9, date:'04 Sep', text:'Point reward-nya bagus, udah tuker Pop Mie 2x', pinned:false }
  ],
  feedbackSeq: 10,

  /* ---- room state ---- */
  roomMaintenance: {},

  /* ---- bookings today (feeds the billing list) ---- */
  todayBookings: [
    { id:'bk1', boxId:'billing-lounge', room:'Lounge Room', cust:'Andi Saputra',   time:'17:00', hours:2, method:'Cash', memberPhone:'0812-3456-7890' },
    { id:'bk2', boxId:'billing-tv1',    room:'TV 1',        cust:'Sinta Maharani', time:'18:00', hours:1, method:'QRIS', memberPhone:'0813-2244-1180' },
    { id:'bk3', boxId:'billing-tv4',    room:'TV 4',        cust:'Fahmi',          time:'19:00', hours:3, method:'QRIS' }
  ],

  /* ---- payment at counter ---- */
  ownerReceipts: [
    { id:'RCP-1039', date:'16 Sep 2026', room:'TV 2', cust:'Rizky', hours:2, roomAmt:95000,
      charges:[{ name:'Pucuk', qty:1, price:6000, kind:'snack' }], total:101000,
      method:'Cash', by:'Qori', at:'Today · 19:55', note:'selesai · 2 jam penuh', reason:null },
    { id:'RCP-1040', date:'16 Sep 2026', room:'TV 5', cust:'Nabila', hours:1, roomAmt:45000,
      charges:[{ name:'Extra controller (PS 4)', qty:1, price:5000, kind:'addon' }], total:50000,
      method:'QRIS', by:'Qori', at:'Today · 18:20', note:'selesai · 1 jam penuh', reason:null },
    { id:'RCP-1034', date:'15 Sep 2026', room:'Lounge Room', cust:'Andi', hours:2, roomAmt:240000,
      charges:[{ name:'Cimory', qty:4, price:9000, kind:'snack' }], total:276000,
      method:'QRIS', by:'Mutya', at:'15 Sep · 21:10', note:'selesai · 2 jam penuh', reason:null },
    { id:'RCP-1033', date:'15 Sep 2026', room:'TV 3', cust:'Bayu', hours:1.5, roomAmt:75000,
      charges:[], total:75000,
      method:'Cash', by:'Mutya', at:'15 Sep · 19:05', note:'stop lebih awal · 01:30:00 terpakai', reason:'customer selesai lebih awal' }
  ],
  ownerShifts: [
    { id:'SHIFT-200', date:'15 Sep 2026', by:'Mutya', at:'15 Sep 2026 · 23:40',
      cashExpected:310000, cashActual:310000, qrisExpected:276000, qrisActual:276000,
      disc:0, total:586000, snackGaps:[], snackGapValue:0 }
  ],
  histDate: '16 Sep 2026',

  /* ---- shift closing ---- */
  closeCashActual: '',
  closeQrisActual: '',
  closeSnackCount: {},

  counterSeq: 1,

  /* ---- owner desktop console ---- */
  ownerDeskCurrent: 'overview',

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
    audit: null,         // audit log details (index)
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

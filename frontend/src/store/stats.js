import { S, notify, STAT_MONTHS, STAT_OCC, STAT_OPERATORS } from './state';
import { rupiah, statShort } from './format';
import { refundPending, refundApprovedTotal } from './refunds';
import { lowSnacks } from './inventory';

export function statSetGrain(g) {
  S.statGrain = g;
  notify();
}

export function statTogglePerf() {
  S.statPerfOpen = !S.statPerfOpen;
  notify();
}

export function statPickMonth(i) {
  S.statMonthIdx = i;
  S.statRange = { type:'month' };
  notify();
}

export function statSetRange(o) {
  S.statRange = (o.t === 'month') ? { type:'month' } : { type:'week', n:o.n };
  notify();
}

export const STAT_RANGE_OPTS = [
  { t:'month', l:'Whole month' }, { t:'week', n:1, l:'1st week' }, { t:'week', n:2, l:'2nd week' },
  { t:'week', n:3, l:'3rd week' }, { t:'week', n:4, l:'4th week' }, { t:'date', l:'Per date…' }
];

export function statRangeActive(o) {
  return (o.t === 'month' && S.statRange.type === 'month') ||
    (o.t === 'week' && S.statRange.type === 'week' && S.statRange.n === o.n) ||
    (o.t === 'date' && S.statRange.type === 'date');
}

export function statOpenDatePicker() {
  S.ui.statDate = true;
  notify();
}

export function statCloseDatePicker() {
  S.ui.statDate = false;
  notify();
}

export function statPickDate(day) {
  S.statRange = { type:'date', d:day };
  S.ui.statDate = false;
  notify();
}

export function statFigures() {
  const m = STAT_MONTHS[S.statMonthIdx];
  const statRange = S.statRange;
  const f = { monthLabel:m.label, disc:m.disc };
  if (statRange.type === 'month') {
    f.total = m.total; f.tx = m.tx;
    f.rangeLabel = 'Whole month';
    f.sub = 'Whole month · ' + m.label;
    f.discLabel = 'Discrepancy · ' + m.label;
    if (S.statGrain === 'day') {
      f.trendLabel = 'Revenue trend · by day';
      const dw = [];
      const dl = [];
      for (let d = 1; d <= m.days; d++) {
        const fac = 0.8 + ((d * 7) % 10) / 20;
        dw.push(Math.round(m.total / m.days * fac / 1000) * 1000);
        dl.push(d % 5 === 1 || d === m.days ? String(d) : '');
      }
      f.series = { labels:dl, vals:dw, dense:true };
    } else {
      f.trendLabel = 'Revenue trend · by week';
      f.series = { labels:['W1', 'W2', 'W3', 'W4'], vals:[0.23, 0.25, 0.27, 0.25].map((p) => Math.round(m.total * p)) };
    }
  } else if (statRange.type === 'week') {
    const pct = [0.23, 0.25, 0.27, 0.25][statRange.n - 1];
    f.total = Math.round(m.total * pct);
    f.tx = Math.round(m.tx * pct);
    const ord = ['1st', '2nd', '3rd', '4th'][statRange.n - 1];
    f.rangeLabel = ord + ' week';
    f.sub = ord + ' week of ' + m.label;
    f.discLabel = 'Discrepancy · ' + ord + ' week';
    f.disc = Math.round(m.disc * pct / 1000) * 1000;
    f.trendLabel = 'Revenue trend · ' + ord + ' week';
    const w = [0.12, 0.11, 0.13, 0.14, 0.17, 0.19, 0.14];
    f.series = { labels:['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], vals:w.map((p) => Math.round(f.total * p)) };
  } else {
    const dayFactor = 0.8 + ((statRange.d * 7) % 10) / 20;
    f.total = Math.round(m.total / m.days * dayFactor / 1000) * 1000;
    f.tx = Math.max(4, Math.round(m.tx / m.days * dayFactor));
    f.rangeLabel = statRange.d + ' ' + m.label.split(' ')[0].slice(0, 3);
    f.sub = statRange.d + ' ' + m.label + ' · single day';
    f.discLabel = 'Discrepancy · ' + statRange.d + ' ' + m.label;
    f.disc = Math.round(m.disc / m.days / 1000) * 1000;
    f.trendLabel = 'Revenue trend · by hour';
    const h = [0.07, 0.1, 0.13, 0.17, 0.22, 0.19, 0.12];
    f.series = { labels:['12', '14', '16', '18', '20', '22', '00'], vals:h.map((p) => Math.round(f.total * p)) };
  }

  /* Refunds the owner approved — only the current month carries live ones */
  const live = (S.statMonthIdx === 0 && statRange.type === 'month') ? refundApprovedTotal() : 0;
  const liveCount = (S.statMonthIdx === 0 && statRange.type === 'month')
    ? S.refunds.filter((r) => r.status === 'approved').length : 0;
  f.gross = f.total;
  f.refunds = live;
  f.refundCount = liveCount;
  f.total = f.gross - live;

  /* Month-on-month, only meaningful when looking at a whole month */
  const prev = STAT_MONTHS[S.statMonthIdx + 1];
  if (statRange.type === 'month' && prev) {
    f.deltaPct = Math.round((f.total - prev.total) / prev.total * 1000) / 10;
    f.deltaNote = 'vs ' + prev.label;
  } else {
    f.deltaPct = null;
    f.deltaNote = statRange.type === 'month' ? 'no earlier month on record' : 'comparison shown for whole months';
  }

  /* Per-unit split: occupancy x the owner's live rate */
  const rentals = Math.round(f.total * 0.85);
  const weights = S.LIVE_ROOMS.map((r) => (STAT_OCC[r.id] || 50) * r.rate);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  f.units = S.LIVE_ROOMS.map((r, i) => (
    { name:r.name, rate:r.rate, occ:STAT_OCC[r.id] || 0, amt:Math.round(rentals * weights[i] / wsum / 1000) * 1000 }
  )).sort((a, b) => b.amt - a.amt);
  f.unitMax = f.units.length ? f.units[0].amt : 1;

  /* Operator split */
  f.operators = STAT_OPERATORS.map((o) => (
    { name:o.name, amt:Math.round(f.total * o.share / 1000) * 1000, gap:o.gap }
  )).sort((a, b) => b.amt - a.amt);
  f.topOperator = f.operators[0];
  return f;
}

/* Whole-month figures regardless of the on-screen range (overview + reports) */
export function statMonthFigures() {
  const savedRange = S.statRange, savedGrain = S.statGrain;
  S.statRange = { type:'month' };
  S.statGrain = 'week';
  const f = statFigures();
  S.statRange = savedRange;
  S.statGrain = savedGrain;
  return f;
}

/* The one strip that answers "is anything wrong right now?" */
export function statAttentionRows(f) {
  const rows = [];
  const pend = refundPending();
  if (pend.length) {
    const sum = pend.reduce((a, r) => a + r.amount, 0);
    rows.push({
      tone:'red', icon:'refund',
      title: pend.length + ' refund' + (pend.length > 1 ? 's' : '') + ' waiting on you',
      note: rupiah(sum) + ' held up · ' + pend[0].room + (pend.length > 1 ? ' and ' + (pend.length - 1) + ' more' : ''),
      action:'Review', go:'reports'
    });
  }
  if (f.disc) {
    rows.push({
      tone:'amber', icon:'warn',
      title:'Drawer is off by ' + rupiah(Math.abs(f.disc)),
      note:'Across ' + f.rangeLabel.toLowerCase() + ' · worst shift was Zeke on Rab',
      action:'Shifts', go:'history'
    });
  }
  const lowStock = lowSnacks();
  if (lowStock.length) {
    rows.push({
      tone:'amber', icon:'box',
      title: lowStock.length + ' snack' + (lowStock.length > 1 ? 's' : '') + ' running low',
      note: lowStock.map((s) => s.name + ' (' + s.qty + ')').join(', '),
      action:'Stock', go:'stock'
    });
  }
  return rows;
}

/* Geometry of the revenue trend chart */
export function statChartGeometry(f) {
  const vals = f.series.vals, labels = f.series.labels, n = vals.length;
  const x0 = 34, x1 = 330, base = 110, top = 20;
  const max = Math.max.apply(null, vals) * 1.18 || 1;
  const pts = vals.map((v, i) => {
    const x = n === 1 ? (x0 + x1) / 2 : x0 + i * (x1 - x0) / (n - 1);
    const y = base - (v / max) * (base - top);
    return { x:Math.round(x * 10) / 10, y:Math.round(y * 10) / 10, v:v, l:labels[i] };
  });
  const line = pts.map((p) => p.x + ',' + p.y).join(' ');
  let peak = 0;
  pts.forEach((p, i) => { if (p.v > pts[peak].v) peak = i; });
  const g1 = 52, g2 = 25;
  function valAt(y) { return (base - y) / (base - top) * max; }
  return {
    pts, line, peak, base, g1, g2, n,
    g1Label: statShort(valAt(g1)).replace('Rp ', ''),
    g2Label: statShort(valAt(g2)).replace('Rp ', ''),
    peakLabel: statShort(pts[peak].v).replace('Rp ', '')
  };
}

/* ================= OWNER TRANSACTION HISTORY ================= */
export function histPickDate(d) {
  S.histDate = d;
  notify();
}

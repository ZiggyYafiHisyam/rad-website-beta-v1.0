/* Owner lists and cards. Each one is used by the mobile owner page AND by the
   desktop console — the prototype copied the mobile markup across; here both
   views render the same component. */
import {
  useStore, rupiah, statShort, billingFormatDuration, MEMBER_POINT_CAP, HIST_DATES, STAT_MONTHS,
  personalAmount, chargeTotal, liveBooked, ownerOpenSession,
  statPickMonth, STAT_RANGE_OPTS, statRangeActive, statOpenDatePicker, statSetRange, statExportPdf, statExportCsv,
  statAttentionRows, statChartGeometry, ownerGo,
  refundPending, refundDecideOpen, refundById, refundForReceipt, docOpen,
  ownerOpenAudit, rptPickDate, ownerPinFeedback, histPickDate,
  ownerOpenMemberEditor, ownerApproveRequest, ownerOpenReject, membersFiltered, memberHeadroom,
  ownerOpenSnackEditor, lowSnacks
} from '../store';

/* ---------- Live floor (ownerLiveTick) ---------- */
export function liveFloor(S) {
  const booked = liveBooked();
  let inUse = 0, nBooked = 0, avail = 0, runningTotal = 0;
  const cards = S.LIVE_ROOMS.map((room) => {
    const st = S.billingState[room.id];
    if (st && st.running) {
      inUse++;
      const personal = st.mode === 'personal';
      const used = personal ? (st.elapsedSec || 0) : (st.totalSec || 0) - st.remainingSec;
      const accrued = personal ? personalAmount(st) : Math.round(used / 3600 * (room.rate || 50000));
      runningTotal += accrued;
      const extras = chargeTotal(room.id);
      return { room, kind:'inuse', st, personal, accrued, extras };
    }
    if (booked[room.id]) { nBooked++; return { room, kind:'booked', who: booked[room.id] }; }
    avail++;
    return { room, kind:'avail' };
  });
  return { cards, inUse, booked: nBooked, avail, runningTotal };
}

export function liveClock() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

export function LiveRoomCards() {
  const S = useStore();
  const { cards } = liveFloor(S);
  return cards.map((c) => {
    const room = c.room;
    if (c.kind === 'inuse') {
      return (
        <div key={room.id} className="card" style={{ padding: "10px 11px", cursor: "pointer", borderColor: "rgba(95,178,255,0.35)" }} onClick={() => ownerOpenSession(room.id)}>
          <div className="row" style={{ marginBottom: "6px" }}><span style={{ fontSize: "12.5px", fontWeight: "600" }}>{room.name}</span><span className="pill inuse" style={{ fontSize: "9.5px" }}>In use</span></div>
          <div style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>{c.st.customer}</div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "17px", color: "var(--cyan)", margin: "2px 0" }}>{billingFormatDuration(c.personal ? (c.st.elapsedSec || 0) : c.st.remainingSec)}</div>
          <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>billed so far <span style={{ color: "var(--green)" }}>{rupiah(c.accrued + c.extras)}</span>{c.extras ? ' · incl. ' + rupiah(c.extras) + ' items' : ''}</div>
        </div>
      );
    }
    if (c.kind === 'booked') {
      return (
        <div key={room.id} className="card" style={{ padding: "10px 11px" }}>
          <div className="row" style={{ marginBottom: "6px" }}><span style={{ fontSize: "12.5px", fontWeight: "600" }}>{room.name}</span><span className="pill booked" style={{ fontSize: "9.5px" }}>Booked</span></div>
          <div style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>{c.who}</div>
          <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "14px" }}>{rupiah(room.rate)} / jam</div>
        </div>
      );
    }
    return (
      <div key={room.id} className="card" style={{ padding: "10px 11px" }}>
        <div className="row" style={{ marginBottom: "6px" }}><span style={{ fontSize: "12.5px", fontWeight: "600" }}>{room.name}</span><span className="pill available" style={{ fontSize: "9.5px" }}>Available</span></div>
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>free now</div>
        <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "14px" }}>{rupiah(room.rate)} / jam</div>
      </div>
    );
  });
}

/* ---------- Latest activity feed (ownerRenderTxns) ---------- */
export function TxnFeed() {
  const S = useStore();
  return S.liveTxns.slice(0, 12).map((x, i) => {
    const methodClass = x.method === 'Cash' ? 'booked' : (x.method === 'QRIS' ? 'available' : 'off');
    return (
      <div key={i} className="card" style={{ padding: "10px 12px", marginBottom: "6px" }}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <span>
            <span style={{ fontSize: "12.5px" }}>{x.room} · {x.cust}</span>
            <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-faint)", marginTop: "3px" }}>{x.t} · {x.detail} · {x.by}</span>
          </span>
          <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "14px" }}>{rupiah(x.amt)}</span>
            <span className={'pill ' + methodClass} style={{ display: "block", marginTop: "4px", fontSize: "9.5px" }}>{x.method}</span>
          </span>
        </div>
      </div>
    );
  });
}

/* ---------- dropdown option rows ---------- */
const optStyle = (active) => ({ padding: "10px 13px", fontSize: "12.5px", cursor: "pointer", borderBottom: "1px solid var(--border)", color: active ? "var(--blue-bright)" : undefined });

export function MonthMenuOptions({ onDone }) {
  const S = useStore();
  return STAT_MONTHS.map((m, i) => (
    <div key={i} style={optStyle(i === S.statMonthIdx)} onClick={() => { onDone(); statPickMonth(i); }}>
      {(i === 0 ? 'This Month · ' : '') + m.label}
    </div>
  ));
}

export function RangeMenuOptions({ onDone, compact }) {
  useStore();
  return STAT_RANGE_OPTS.map((o, i) => {
    const active = statRangeActive(o);
    const st = compact
      ? { padding: "9px 12px", fontSize: "12px", cursor: "pointer", borderBottom: "1px solid var(--border)", color: active ? "var(--blue-bright)" : undefined }
      : optStyle(active);
    return (
      <div key={i} style={st} onClick={() => { onDone(); if (o.t === 'date') statOpenDatePicker(); else statSetRange(o); }}>{o.l}</div>
    );
  });
}

export function ExportMenuOptions({ onDone, desktop }) {
  const S = useStore();
  const opts = [
    { l:'Sales report · PDF', s:'Opens the print dialog — choose Save as PDF', fn:statExportPdf },
    { l:'Sales data · CSV', s:'Opens in Excel or Google Sheets', fn:statExportCsv }
  ];
  return (
    <>
      <div style={{ padding: desktop ? "9px 13px" : "9px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Whole month</div>
        <div style={{ fontSize: "12px", marginTop: "2px", color: "var(--blue-bright)" }}>{STAT_MONTHS[S.statMonthIdx].label}</div>
      </div>
      {opts.map((o, i) => desktop
        ? (
          <div key={i} style={optStyle(false)} onClick={() => { onDone(); o.fn(); }}>
            {o.l}<div style={{ fontSize: "9.5px", color: "var(--text-faint)", marginTop: "2px" }}>{o.s}</div>
          </div>
        )
        : (
          <div key={i} style={{ padding: "10px 12px", cursor: "pointer", borderBottom: i < opts.length - 1 ? "1px solid var(--border)" : undefined }} onClick={() => { onDone(); o.fn(); }}>
            <div style={{ fontSize: "12px" }}>{o.l}</div><div style={{ fontSize: "9.5px", color: "var(--text-faint)", marginTop: "2px" }}>{o.s}</div>
          </div>
        ))}
    </>
  );
}

export function RptMenuOptions({ onDone }) {
  const S = useStore();
  return HIST_DATES.map((d, i) => {
    const n = S.auditLog.filter((e) => e.date === d).length;
    return <div key={d} style={optStyle(d === S.rptDate)} onClick={() => { onDone(); rptPickDate(d); }}>{(i === 0 ? 'Today · ' : '') + d + ' · ' + n + ' log'}</div>;
  });
}

export function HistMenuOptions({ onDone }) {
  const S = useStore();
  return HIST_DATES.map((d, i) => (
    <div key={d} style={optStyle(d === S.histDate)} onClick={() => { onDone(); histPickDate(d); }}>{(i === 0 ? 'Today · ' : '') + d}</div>
  ));
}

/* ---------- Needs attention strip (statRenderAttention) ---------- */
const ATTN_ICONS = {
  refund: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>,
  warn: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  box: <><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7L12 12l8.7-5" /><path d="M12 22V12" /></>
};

export function StatAttention({ f }) {
  const rows = statAttentionRows(f);
  if (!rows.length) {
    return (
      <div className="alert-row">
        <span className="ico" style={{ background: "rgba(53,227,156,0.13)", border: "1px solid rgba(53,227,156,0.4)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
        </span>
        <span><span style={{ display: "block" }}>All clear</span>
          <span style={{ display: "block", fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>No refunds pending, drawer matches, stock is healthy.</span></span>
      </div>
    );
  }
  return rows.map((r, i) => {
    const c = r.tone === 'red' ? '255,92,122' : '255,194,75';
    const stroke = r.tone === 'red' ? 'var(--red)' : 'var(--amber)';
    return (
      <div key={i} className="alert-row">
        <span className="ico" style={{ background: 'rgba(' + c + ',0.12)', border: '1px solid rgba(' + c + ',0.38)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{ATTN_ICONS[r.icon]}</svg>
        </span>
        <span style={{ minWidth: "0" }}><span style={{ display: "block" }}>{r.title}</span>
          <span style={{ display: "block", fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>{r.note}</span></span>
        <span className="btn sm ghost go" onClick={() => ownerGo(r.go)}>{r.action}</span>
      </div>
    );
  });
}

/* ---------- Revenue trend chart (statRenderChart) ---------- */
export function StatChart({ f }) {
  const g = statChartGeometry(f);
  const { pts, line, peak, base, g1, g2, n } = g;
  return (
    <svg viewBox="0 0 340 140" style={{ width: "100%", height: "auto" }}>
      <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5FB2FF" stopOpacity="0.35" /><stop offset="100%" stopColor="#5FB2FF" stopOpacity="0" /></linearGradient></defs>
      <line x1="32" y1={base} x2="336" y2={base} stroke="#232838" strokeWidth="1" />
      <line x1="32" y1={g1} x2="336" y2={g1} stroke="#232838" strokeWidth="0.7" strokeDasharray="3 4" />
      <line x1="32" y1={g2} x2="336" y2={g2} stroke="#232838" strokeWidth="0.7" strokeDasharray="3 4" />
      <text x="28" y={g1 + 3} fontSize="8.5" fill="#565E72" textAnchor="end">{g.g1Label}</text>
      <text x="28" y={g2 + 3} fontSize="8.5" fill="#565E72" textAnchor="end">{g.g2Label}</text>
      <path d={'M' + line + ' L' + pts[n - 1].x + ',' + base + ' L' + pts[0].x + ',' + base + ' Z'} fill="url(#revGrad)" />
      <polyline points={line} fill="none" stroke="#5FB2FF" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[peak].x} cy={pts[peak].y} r="3.5" fill="#5FB2FF" />
      <text x={pts[peak].x} y={pts[peak].y - 7} fontSize="9" fill="#5FB2FF" textAnchor="middle">{g.peakLabel}</text>
      {pts.map((p, i) => (
        <text key={i} x={p.x} y="126" fontSize="9.5" fill={i === peak ? '#5FB2FF' : '#565E72'} textAnchor="middle">{p.l}</text>
      ))}
    </svg>
  );
}

/* ---------- Revenue per TV / Room ---------- */
export function StatUnitRows({ f }) {
  return f.units.map((u, i) => {
    const pct = Math.round(u.amt / (f.unitMax || 1) * 100);
    return (
      <div key={u.name} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.5fr 0.75fr", gap: "8px", alignItems: "center", padding: "9px 12px", fontSize: "12px", borderBottom: i < f.units.length - 1 ? "1px solid var(--border)" : undefined }}>
        <span>{u.name}
          <span style={{ display: "block", fontSize: "9.5px", color: "var(--text-faint)", marginTop: "2px", whiteSpace: "nowrap" }}>{u.occ}% occ · {statShort(u.rate).replace('Rp ', '')}/jam</span></span>
        <span><span style={{ display: "block", height: "7px", borderRadius: "4px", background: "var(--surface-2)", overflow: "hidden" }}>
          <span style={{ display: "block", width: pct + "%", height: "100%", background: i === 0 ? "var(--cyan)" : "var(--blue)" }} /></span></span>
        <span style={{ textAlign: "right", fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "13.5px" }}>{statShort(u.amt)}</span>
      </div>
    );
  });
}

/* Text bits the statistics card shows (statRender) */
export function statTexts(S, f) {
  return {
    monthLabel: (S.statMonthIdx === 0 ? 'This Month · ' : '') + f.monthLabel,
    total: statShort(f.total),
    rentals: statShort(Math.round(f.total * 0.85)),
    snacks: statShort(Math.round(f.total * 0.15)),
    disc: '-' + rupiah(Math.abs(f.disc)),
    trendLabel: S.statRange.type === 'month' ? 'Revenue trend' : f.trendLabel,
    unitNote: f.units.length + ' units',
    cash: rupiah(Math.round(f.total * 0.46 / 1000) * 1000),
    qris: rupiah(Math.round(f.total * 0.54 / 1000) * 1000),
    refunds: '-' + rupiah(f.refunds),
    gross: statShort(f.gross),
    refundCount: f.refundCount ? '· ' + f.refundCount + ' refund' + (f.refundCount > 1 ? 's' : '') : '',
    deltaShown: f.deltaPct !== null,
    deltaClass: 'pill ' + (f.deltaPct >= 0 ? 'available' : 'inuse'),
    delta: f.deltaPct === null ? '' : (f.deltaPct >= 0 ? '▲ +' : '▼ ') + f.deltaPct + '%',
    topOp: f.topOperator ? f.topOperator.name + ' · ' + statShort(f.topOperator.amt) : 'Qori',
    topOpNote: f.topOperator ? 'Highest revenue this period · drawer ' + (f.topOperator.gap === 0 ? 'clean' : 'off by ' + rupiah(Math.abs(f.topOperator.gap))) : ''
  };
}

/* ---------- Reports: refunds waiting on the owner ---------- */
export function RefundWaitingList() {
  useStore();
  const pend = refundPending();
  if (!pend.length) return <div style={{ fontSize: "11.5px", color: "var(--text-faint)", padding: "6px 0" }}>No refund waiting on you.</div>;
  return pend.map((r) => (
    <div key={r.id} className="card" style={{ padding: "11px 12px", marginBottom: "6px", borderColor: "rgba(255,92,122,0.35)" }}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <span><span style={{ fontSize: "12.5px" }}>{r.room} · {r.cust}</span>
          <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-faint)", marginTop: "3px" }}>{r.at} · by {r.by} · {r.method}</span></span>
        <span style={{ textAlign: "right", whiteSpace: "nowrap" }}><span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "15px", color: "var(--red)" }}>-{rupiah(r.amount)}</span>
          {r.partial ? <span className="pill booked" style={{ display: "block", marginTop: "4px", fontSize: "9px" }}>Partial</span> : null}</span>
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-dim)", margin: "8px 0 10px", lineHeight: "1.5" }}>“{r.reason}”</div>
      <div className="btn sm primary" onClick={() => refundDecideOpen(r.id)}>Review &amp; decide</div>
    </div>
  ));
}

/* ---------- Reports: booking audit log for the picked date ---------- */
export function auditShown(S) {
  return S.auditLog.map((e, i) => ({ e, i })).filter((x) => (x.e.date || HIST_DATES[0]) === S.rptDate);
}

export function AuditLogRows() {
  const S = useStore();
  const shown = auditShown(S);
  if (!shown.length) return <div style={{ padding: "16px 0", fontSize: "11.5px", color: "var(--text-faint)", textAlign: "center" }}>No operator edits or overrides on this date.</div>;
  return shown.map(({ e, i }) => (
    <div key={e.id + '-' + i} style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 0.62fr 0.85fr 0.62fr", gap: "6px", alignItems: "center", fontSize: "12px" }}>
        <span>{e.room}</span>
        <span style={{ color: "var(--text-dim)" }}>{e.admin}</span>
        <span className={e.type === 'override' ? 'override' : 'edit'} style={{ color: e.type === 'override' ? "var(--red)" : "var(--amber)", fontSize: "11px" }}>{e.action}</span>
        <span className="btn sm ghost" style={{ fontSize: "10px", padding: "4px 0", textAlign: "center" }} onClick={() => ownerOpenAudit(i)}>Details</span>
      </div>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "4px" }}>{e.reason}</div>
    </div>
  ));
}

export function auditCountText(S) {
  return auditShown(S).length + (S.rptDate === HIST_DATES[0] ? ' today' : ' log');
}

/* ---------- Reports: feedback inbox ---------- */
function PinSvg({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#5FB2FF' : 'none'} stroke={filled ? '#5FB2FF' : '#8993A8'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" /><path d="M9 3h6l-1 6 3 3H7l3-3-1-6z" />
    </svg>
  );
}

export function FeedbackRows() {
  const S = useStore();
  const open = S.ownerFeedbacks.filter((f) => !f.pinned);
  if (!open.length) return <div style={{ padding: "16px 0", fontSize: "11.5px", color: "var(--text-faint)", textAlign: "center" }}>Inbox clear — pinned notes live on Statistics.</div>;
  return open.map((f) => (
    <div key={f.id} className="card" style={{ display: "flex", gap: "11px", alignItems: "flex-start", padding: "11px 12px", marginBottom: "6px" }}>
      <span style={{ flex: "0 0 42px", fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "12px", color: "var(--blue-bright)", paddingTop: "1px" }}>{f.date}</span>
      <span style={{ flex: "1", fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.5" }}>“{f.text}”</span>
      <span title="Pin to to-do list" style={{ flex: "0 0 26px", height: "26px", borderRadius: "7px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => ownerPinFeedback(f.id)}><PinSvg filled={false} /></span>
    </div>
  ));
}

export function feedbackCountText(S) {
  return S.ownerFeedbacks.filter((f) => !f.pinned).length + ' open';
}

/* ---------- People: operators, requests, members ---------- */
export function OperatorList() {
  const S = useStore();
  return S.ownerOperators.map((op, i) => (
    <div key={i} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", marginBottom: "6px" }}>
      <span style={{ fontSize: "13px" }}>{op.name}</span>
      <span style={{ fontSize: "11px", color: "var(--text-faint)", letterSpacing: "1px" }}>{op.pass}</span>
    </div>
  ));
}

export function RequestList() {
  const S = useStore();
  if (!S.memberRequests.length) return <div style={{ fontSize: "11.5px", color: "var(--text-faint)", padding: "6px 0" }}>No requests waiting.</div>;
  return S.memberRequests.map((r, i) => (
    <div key={i} className="card" style={{ padding: "11px 12px", marginBottom: "6px" }}>
      <div style={{ fontSize: "13px" }}>{r.name}</div>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", margin: "3px 0 9px" }}>{r.phone} · requested by {r.by} · {r.at}</div>
      <div style={{ display: "flex", gap: "6px" }}>
        <div className="btn sm primary" style={{ flex: "1" }} onClick={() => ownerApproveRequest(i)}>Approve</div>
        <div className="btn sm ghost" style={{ flex: "1", color: "var(--red)" }} onClick={() => ownerOpenReject(i)}>Reject</div>
      </div>
    </div>
  ));
}

export function MemberList() {
  useStore();
  const rows = membersFiltered();
  if (!rows.length) return <div style={{ fontSize: "11.5px", color: "var(--text-faint)", padding: "6px 0" }}>No member matches that search.</div>;
  return rows.map((m) => (
    <div key={m.phone} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", marginBottom: "6px" }}>
      <span><span style={{ fontSize: "13px" }}>{m.name}</span>
        <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-faint)", marginTop: "2px" }}>{m.phone} · joined {m.joined}</span></span>
      <span style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
        <span className={'pill ' + (memberHeadroom(m) === 0 ? 'booked' : 'owner')}>{m.points} / {MEMBER_POINT_CAP}</span>
        <span className="btn sm ghost" style={{ fontSize: "11px", padding: "4px 9px" }} onClick={() => ownerOpenMemberEditor(m.phone)}>Edit</span>
      </span>
    </div>
  ));
}

/* ---------- Stock & Rewards ---------- */
export function StockAlert() {
  useStore();
  const low = lowSnacks();
  if (!low.length) {
    return (
      <div className="card" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 12px", borderColor: "rgba(53,227,156,0.3)" }}>
        <span style={{ flex: "0 0 26px", height: "26px", borderRadius: "7px", background: "rgba(53,227,156,0.13)", border: "1px solid rgba(53,227,156,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg></span>
        <span style={{ fontSize: "12px" }}>Shelf is healthy
          <span style={{ display: "block", fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>Every item is above its reorder point.</span></span>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: "0", overflow: "hidden", borderColor: "rgba(255,92,122,0.4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 12px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ flex: "0 0 26px", height: "26px", borderRadius: "7px", background: "rgba(255,92,122,0.12)", border: "1px solid rgba(255,92,122,0.38)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7L12 12l8.7-5" /><path d="M12 22V12" /></svg></span>
        <span style={{ fontSize: "12.5px" }}>Restock {low.length} item{low.length > 1 ? 's' : ''}
          <span style={{ display: "block", fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>At or below the reorder point you set.</span></span>
        <span className="btn sm ghost" style={{ marginLeft: "auto", flexShrink: "0", fontSize: "10px", padding: "4px 10px" }} onClick={ownerOpenSnackEditor}>Update</span>
      </div>
      {low.map((it, i) => (
        <div key={i} className="row" style={{ padding: "9px 12px", fontSize: "12px", borderBottom: i < low.length - 1 ? "1px solid var(--border)" : undefined }}>
          <span style={{ color: "var(--text-dim)" }}>{it.name}</span>
          <span className={'pill ' + (it.qty <= 2 ? 'inuse' : 'booked')} style={{ fontSize: "10px" }}>{it.qty} left · reorder at {it.low}</span>
        </div>
      ))}
    </div>
  );
}

export function OwnerSnackRows() {
  const S = useStore();
  /* Bars are scaled against the fullest item so the shelf reads at a glance */
  const fullest = S.snackStock.reduce((m, s) => Math.max(m, s.qty), 1);
  return S.snackStock.map((it, i) => {
    const lowHit = it.qty <= it.low;
    const pct = Math.max(3, Math.round(it.qty / fullest * 100));
    return (
      <div key={i} style={{ display: "grid", gridTemplateColumns: "1.35fr 1.1fr 0.85fr", gap: "8px", padding: "10px 12px", fontSize: "12.5px", alignItems: "center", borderBottom: i < S.snackStock.length - 1 ? "1px solid var(--border)" : undefined }}>
        <span>{it.name}{lowHit ? <span style={{ display: "block", fontSize: "9px", color: "var(--red)", marginTop: "2px" }}>reorder at {it.low}</span> : null}</span>
        <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ flex: "1", height: "6px", borderRadius: "3px", background: "var(--surface-2)", overflow: "hidden" }}>
            <span style={{ display: "block", width: pct + "%", height: "100%", background: lowHit ? "var(--red)" : "var(--blue)" }} /></span>
          <span style={{ flex: "0 0 auto", fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "14px", color: lowHit ? "var(--red)" : "var(--text)" }}>{it.qty}</span>
        </span>
        <span style={{ textAlign: "right", color: "var(--text-dim)" }}>{rupiah(it.price)}</span>
      </div>
    );
  });
}

export function RateRows() {
  const S = useStore();
  return S.LIVE_ROOMS.map((r, i) => (
    <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr", gap: "6px", padding: "9px 12px", fontSize: "12.5px", alignItems: "center", borderBottom: i < S.LIVE_ROOMS.length - 1 ? "1px solid var(--border)" : undefined }}>
      <span>{r.name}</span>
      <span style={{ textAlign: "right", fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "14px" }}>{rupiah(r.rate)}</span>
      <span style={{ textAlign: "right", fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "14px", color: "var(--amber)" }}>{rupiah(r.weekend || r.rate)}</span>
    </div>
  ));
}

export function RewardRows() {
  const S = useStore();
  return S.rewardCatalog.map((rw, i) => (
    <div key={i} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", marginBottom: "6px" }}>
      <span style={{ fontSize: "12.5px" }}>{rw.name}</span>
      <span className="pill owner" style={{ whiteSpace: "nowrap" }}>{rw.cost} pts</span>
    </div>
  ));
}

export function addonFreePill(S) {
  const free = S.addOns.reduce((t, a) => t + Math.max(0, (a.units || 0) - (a.booked || 0)), 0);
  const owned = S.addOns.reduce((t, a) => t + (a.units || 0), 0);
  return { text: free + ' of ' + owned + ' free', className: 'pill ' + (free ? 'off' : 'inuse') };
}

/* ---------- Transaction history ---------- */
export function receiptsOn(S) {
  return (S.ownerReceipts || []).filter((r) => (r.date || HIST_DATES[0]) === S.histDate);
}

export function ReceiptList() {
  const S = useStore();
  const recs = receiptsOn(S);
  if (!recs.length) return <div style={{ fontSize: "11.5px", color: "var(--text-faint)", padding: "6px 0" }}>No payment closed on this date.</div>;
  return recs.map((r) => {
    const extra = r.charges.length ? r.charges.length + ' item on bill' : 'room only';
    const mid = r.kind === 'counter' ? (r.message ? 'custom order' : r.charges.length + ' item') : r.hours + ' jam · ' + extra;
    const ref = refundForReceipt(r.id);
    let flag = null;
    if (ref && ref.status === 'approved') flag = <span className="pill inuse" style={{ display: "block", marginTop: "4px", fontSize: "9px" }}>{ref.partial ? 'Partly refunded' : 'Refunded'}</span>;
    else if (ref && ref.status === 'pending') flag = <span className="pill booked" style={{ display: "block", marginTop: "4px", fontSize: "9px" }}>Refund pending</span>;
    const struck = ref && ref.status === 'approved' && !ref.partial;
    return (
      <div key={r.id} className="card" style={{ padding: "11px 12px", marginBottom: "6px", cursor: "pointer" }} onClick={() => docOpen('Receipt · ' + r.room, { kind:'receipt', rec:r }, 'Closed by ' + r.by)}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <span><span style={{ fontSize: "12.5px" }}>{r.room} · {r.cust}</span>
            <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-faint)", marginTop: "3px" }}>{r.at} · {mid} · {r.by}</span></span>
          <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "14px", textDecoration: struck ? "line-through" : undefined, color: struck ? "var(--text-faint)" : undefined }}>{rupiah(r.total)}</span>
            <span className={'pill ' + (r.method === 'Cash' ? 'booked' : 'available')} style={{ display: "block", marginTop: "4px", fontSize: "9.5px" }}>{r.method}</span>{flag}
          </span>
        </div>
      </div>
    );
  });
}

export function refundsSettledOn(S) {
  return S.refunds.filter((r) => r.status !== 'pending' && r.date === S.histDate);
}

export function RefundSettledList() {
  const S = useStore();
  const settled = refundsSettledOn(S);
  if (!settled.length) return <div style={{ fontSize: "11.5px", color: "var(--text-faint)", padding: "6px 0" }}>No refund settled on this date.</div>;
  return settled.map((r) => (
    <div key={r.id} className="card" style={{ padding: "11px 12px", marginBottom: "6px", cursor: "pointer" }}
      onClick={() => { const x = refundById(r.id); docOpen('Refund · ' + x.room, { kind:'refund', r:x }, x.status === 'approved' ? 'Approved by owner' : 'Rejected by owner'); }}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <span><span style={{ fontSize: "12.5px" }}>{r.room} · {r.cust}</span>
          <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-faint)", marginTop: "3px" }}>{r.at} · {r.by}</span></span>
        <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "14px", color: r.status === 'approved' ? "var(--red)" : "var(--text-faint)" }}>{r.status === 'approved' ? '-' + rupiah(r.amount) : rupiah(r.amount)}</span>
          <span className={'pill ' + (r.status === 'approved' ? 'inuse' : 'off')} style={{ display: "block", marginTop: "4px", fontSize: "9.5px" }}>{r.status === 'approved' ? 'Refunded' : 'Rejected'}</span>
        </span>
      </div>
    </div>
  ));
}

export function shiftsOn(S) {
  return (S.ownerShifts || []).filter((s) => (s.date || HIST_DATES[0]) === S.histDate);
}

export function ShiftList() {
  const S = useStore();
  const shifts = shiftsOn(S);
  if (!shifts.length) return <div style={{ fontSize: "11.5px", color: "var(--text-faint)", padding: "6px 0" }}>No shift closed on this date.</div>;
  return shifts.map((s) => {
    const clean = s.disc === 0 && !s.snackGaps.length;
    return (
      <div key={s.id} className="card" style={{ padding: "11px 12px", marginBottom: "6px", cursor: "pointer" }} onClick={() => docOpen('Shift summary · ' + s.by, { kind:'shift', s:s }, s.at)}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <span><span style={{ fontSize: "12.5px" }}>{s.by}’s shift</span>
            <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-faint)", marginTop: "3px" }}>{s.at} · {rupiah(s.total)} revenue</span></span>
          <span className={'pill ' + (clean ? 'available' : 'inuse')} style={{ fontSize: "9.5px" }}>{clean ? 'Clean' : 'Gap found'}</span>
        </div>
      </div>
    );
  });
}

/* History header counts */
export function historyCounts(S) {
  const today = S.histDate === HIST_DATES[0];
  return {
    receipts: receiptsOn(S).length + (today ? ' today' : ' receipts'),
    settled: refundsSettledOn(S).length + (today ? ' today' : ' settled'),
    shifts: shiftsOn(S).length + ' logged',
    dateLabel: (today ? 'Today · ' : '') + S.histDate
  };
}

export function rptDateLabel(S) {
  return (S.rptDate === HIST_DATES[0] ? 'Today · ' : '') + S.rptDate;
}
/* ---------- Performance detail — static demo charts (same in mobile + desktop) ---------- */
export function PerfDayCard() {
  return (
    <>
      <svg viewBox="0 0 340 142" style={{ width: "100%", height: "auto" }}>
        <line x1="24" y1="110" x2="336" y2="110" stroke="#232838" strokeWidth="1" />
        <line x1="24" y1="80" x2="336" y2="80" stroke="#232838" strokeWidth="0.7" strokeDasharray="3 4" />
        <line x1="24" y1="51" x2="336" y2="51" stroke="#232838" strokeWidth="0.7" strokeDasharray="3 4" />
        <line x1="24" y1="21" x2="336" y2="21" stroke="#232838" strokeWidth="0.7" strokeDasharray="3 4" />
        <text x="18" y="113" fontSize="9" fill="#565E72" textAnchor="end">0</text>
        <text x="18" y="83" fontSize="9" fill="#565E72" textAnchor="end">10</text>
        <text x="18" y="54" fontSize="9" fill="#565E72" textAnchor="end">20</text>
        <text x="18" y="24" fontSize="9" fill="#565E72" textAnchor="end">30</text>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5FB2FF" />
            <stop offset="100%" stopColor="#1E6FE0" />
          </linearGradient>
        </defs>
        <rect x="32" y="68" width="28" height="42" rx="4" fill="url(#barGrad)" />
        <rect x="76" y="77" width="28" height="33" rx="4" fill="url(#barGrad)" />
        <rect x="120" y="83" width="28" height="27" rx="4" fill="url(#barGrad)" />
        <rect x="164" y="71" width="28" height="39" rx="4" fill="url(#barGrad)" />
        <rect x="208" y="45" width="28" height="65" rx="4" fill="url(#barGrad)" />
        <rect x="252" y="18" width="28" height="92" rx="4" fill="#38E8FF" />
        <rect x="296" y="33" width="28" height="77" rx="4" fill="url(#barGrad)" />
        <text x="46" y="126" fontSize="9.5" fill="#565E72" textAnchor="middle">Sen</text>
        <text x="90" y="126" fontSize="9.5" fill="#565E72" textAnchor="middle">Sel</text>
        <text x="134" y="126" fontSize="9.5" fill="#565E72" textAnchor="middle">Rab</text>
        <text x="178" y="126" fontSize="9.5" fill="#565E72" textAnchor="middle">Kam</text>
        <text x="222" y="126" fontSize="9.5" fill="#565E72" textAnchor="middle">Jum</text>
        <text x="266" y="126" fontSize="9.5" fill="#38E8FF" textAnchor="middle">Sab</text>
        <text x="310" y="126" fontSize="9.5" fill="#565E72" textAnchor="middle">Min</text>
      </svg>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "4px" }}>Weekend carries the week — Sabtu peaked at 31 bookings</div>
    </>
  );
}

export function PerfHourCard() {
  return (
    <>
      <svg viewBox="0 0 340 130" style={{ width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38E8FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38E8FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="24" y1="105" x2="332" y2="105" stroke="#232838" strokeWidth="1" />
        <path d="M24,95.2 47.5,90.3 71,90.3 94.5,80.6 118,85.4 141.5,75.7 165,65.9 188.5,61 212,46.3 235.5,31.7 259,17 282.5,26.8 306,51.2 329.5,75.7 L329.5,105 L24,105 Z" fill="url(#areaGrad)" />
        <polyline points="24,95.2 47.5,90.3 71,90.3 94.5,80.6 118,85.4 141.5,75.7 165,65.9 188.5,61 212,46.3 235.5,31.7 259,17 282.5,26.8 306,51.2 329.5,75.7" fill="none" stroke="#38E8FF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="259" cy="17" r="3.5" fill="#38E8FF" />
        <text x="259" y="11" fontSize="9" fill="#38E8FF" textAnchor="middle">18</text>
        <text x="24" y="119" fontSize="9" fill="#565E72" textAnchor="middle">10.00</text>
        <text x="94.5" y="119" fontSize="9" fill="#565E72" textAnchor="middle">13.00</text>
        <text x="165" y="119" fontSize="9" fill="#565E72" textAnchor="middle">16.00</text>
        <text x="235.5" y="119" fontSize="9" fill="#565E72" textAnchor="middle">19.00</text>
        <text x="306" y="119" fontSize="9" fill="#565E72" textAnchor="middle">22.00</text>
      </svg>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "4px" }}>Traffic builds after 17.00 and peaks at 20.00</div>
    </>
  );
}

export function PerfOccCard() {
  return (
    <>
      <svg viewBox="0 0 340 196" style={{ width: "100%", height: "auto" }}>
        <text x="0" y="14" fontSize="10.5" fill="#8993A8">TV 1</text>
        <rect x="92" y="6" width="196" height="10" rx="5" fill="#171B26" />
        <rect x="92" y="6" width="122" height="10" rx="5" fill="#2F8FFF" />
        <text x="296" y="14" fontSize="10" fill="#8993A8">62%</text>
        <text x="0" y="38" fontSize="10.5" fill="#8993A8">TV 2</text>
        <rect x="92" y="30" width="196" height="10" rx="5" fill="#171B26" />
        <rect x="92" y="30" width="145" height="10" rx="5" fill="#2F8FFF" />
        <text x="296" y="38" fontSize="10" fill="#8993A8">74%</text>
        <text x="0" y="62" fontSize="10.5" fill="#8993A8">TV 3</text>
        <rect x="92" y="54" width="196" height="10" rx="5" fill="#171B26" />
        <rect x="92" y="54" width="108" height="10" rx="5" fill="#2F8FFF" />
        <text x="296" y="62" fontSize="10" fill="#8993A8">55%</text>
        <text x="0" y="86" fontSize="10.5" fill="#8993A8">TV 4</text>
        <rect x="92" y="78" width="196" height="10" rx="5" fill="#171B26" />
        <rect x="92" y="78" width="94" height="10" rx="5" fill="#2F8FFF" />
        <text x="296" y="86" fontSize="10" fill="#8993A8">48%</text>
        <text x="0" y="110" fontSize="10.5" fill="#8993A8">TV 5</text>
        <rect x="92" y="102" width="196" height="10" rx="5" fill="#171B26" />
        <rect x="92" y="102" width="76" height="10" rx="5" fill="#2F8FFF" />
        <text x="296" y="110" fontSize="10" fill="#8993A8">39%</text>
        <text x="0" y="134" fontSize="10.5" fill="#8993A8">Private Room</text>
        <rect x="92" y="126" width="196" height="10" rx="5" fill="#171B26" />
        <rect x="92" y="126" width="159" height="10" rx="5" fill="#38E8FF" />
        <text x="296" y="134" fontSize="10" fill="#8993A8">81%</text>
        <text x="0" y="158" fontSize="10.5" fill="#8993A8">VIP Room</text>
        <rect x="92" y="150" width="196" height="10" rx="5" fill="#171B26" />
        <rect x="92" y="150" width="172" height="10" rx="5" fill="#38E8FF" />
        <text x="296" y="158" fontSize="10" fill="#8993A8">88%</text>
        <text x="0" y="182" fontSize="10.5" fill="#8993A8">Lounge Room</text>
        <rect x="92" y="174" width="196" height="10" rx="5" fill="#171B26" />
        <rect x="92" y="174" width="131" height="10" rx="5" fill="#2F8FFF" />
        <text x="296" y="182" fontSize="10" fill="#8993A8">67%</text>
      </svg>
    </>
  );
}


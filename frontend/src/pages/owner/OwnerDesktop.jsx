import { useState, useEffect, useRef } from 'react';
import {
  useStore, showPage, statSetGrain, ownerFeedbackMarkRead, ownerOpenAddonEditor, ownerOpenOperatorEditor,
  ownerOpenRateEditor, ownerOpenRewardEditor, ownerOpenSnackEditor, ownerDeskSection, setOwnerOnDesktop, setMemberSearch,
  OWNER_SECTION_HEAD, HIST_DATES, STAT_MONTHS, rupiah, statShort, closeFigures, statFigures, statMonthFigures,
  statAttentionRows, refundPending, lowSnacks
} from '../../store';
import { Page, TodoTrigger } from '../../components/Phone';
import {
  liveFloor, liveClock, LiveRoomCards, TxnFeed, StatAttention, StatChart, StatUnitRows, statTexts,
  MonthMenuOptions, RangeMenuOptions, ExportMenuOptions, RptMenuOptions, HistMenuOptions,
  RefundWaitingList, AuditLogRows, auditCountText, rptDateLabel, FeedbackRows, feedbackCountText,
  ReceiptList, RefundSettledList, ShiftList, historyCounts, OperatorList, RequestList, MemberList,
  StockAlert, OwnerSnackRows, RateRows, RewardRows, addonFreePill, PerfDayCard, PerfHourCard, PerfOccCard
} from '../../components/OwnerParts';
import { AddonRows } from '../../components/AdminParts';

/* "Today's money" card on the overview */
function TodayMoney({ t }) {
  const lines = [
    ['Cash in drawer', rupiah(t.cash), 'var(--text)'],
    ['QRIS on GoPay', rupiah(t.qris), 'var(--text)']
  ];
  if (t.refunds) lines.push(['Refunds paid out', '-' + rupiah(t.refunds), 'var(--red)']);
  const maxLine = Math.max(t.cash, t.qris) || 1;
  return (
    <>
      {lines.map((l, i) => {
        const isRefund = i === 2;
        const w = isRefund ? Math.round(t.refunds / maxLine * 100) : Math.round((i === 0 ? t.cash : t.qris) / maxLine * 100);
        return (
          <div key={i} style={{ marginBottom: i < lines.length - 1 ? '13px' : '0' }}>
            <div className="row" style={{ fontSize: "12px", marginBottom: "6px" }}><span style={{ color: "var(--text-dim)" }}>{l[0]}</span>
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "15px", color: l[2] }}>{l[1]}</span></div>
            <div style={{ height: "7px", borderRadius: "4px", background: "var(--surface-2)", overflow: "hidden" }}>
              <div style={{ width: Math.max(3, w) + "%", height: "100%", background: isRefund ? "var(--red)" : (i === 0 ? "#2F8FFF" : "#38E8FF") }} /></div>
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: "13px", marginTop: "13px", borderTop: "1px solid var(--border)" }}>
        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Expected at closing</span>
        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "19px" }}>{rupiah(t.total)}</span>
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "6px" }}>The operator counts the drawer against this figure. Any gap lands on their shift summary.</div>
    </>
  );
}

export default function OwnerDesktop() {
  const S = useStore();
  const section = S.ownerDeskCurrent;
  const mainRef = useRef(null);
  const [menu, setMenu] = useState(null);
  const toggle = (m) => setMenu(menu === m ? null : m);
  const close = () => setMenu(null);
  const menuStyle = (m, st) => (menu === m ? { ...st, display: "block" } : st);

  /* ownerOnDesktop(): lets "Review" / "Stock" buttons stay inside the console */
  useEffect(() => {
    setOwnerOnDesktop(true);
    return () => setOwnerOnDesktop(false);
  }, []);
  /* Switching section closes any open menu and scrolls back to the top */
  useEffect(() => {
    setMenu(null);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [section]);

  const go = (name) => ownerDeskSection(name);
  const navClass = (name) => 'od-nav-item' + (name === section ? ' active' : '');
  const panel = (name) => (name === section ? 'block' : 'none');
  const head = OWNER_SECTION_HEAD[section] || OWNER_SECTION_HEAD.stats;

  /* ---------- Overview: today's picture, built from live state ---------- */
  const hr = new Date().getHours();
  const greeting = (hr < 11 ? 'Good morning' : (hr < 15 ? 'Good afternoon' : 'Good evening')) + ', Owner';
  const t = closeFigures();
  const lf = liveFloor(S);
  const running = S.LIVE_ROOMS.filter((r) => S.billingState[r.id] && S.billingState[r.id].running);
  const floorPct = Math.round(running.length / S.LIVE_ROOMS.length * 100);
  const maintCount = Object.keys(S.roomMaintenance).filter((k) => S.roomMaintenance[k]).length;
  const mf = statMonthFigures();
  const prev = STAT_MONTHS[1];

  /* Statistics for the selected range, plus the attention strip */
  const f = statFigures();
  const tx = statTexts(S, f);
  const attnRows = statAttentionRows(f);
  const attnClear = !attnRows.length;
  const attnCount = attnClear ? 0 : attnRows.length;

  /* Rail counters for the things that actually need the owner */
  const pendingRefunds = refundPending().length;
  const lowCount = lowSnacks().length;
  const hc = historyCounts(S);
  const fp = addonFreePill(S);
  return (
    <Page id="owner-desktop">
      <div className="od-shell">
        {/* Rail */}
        <div className="od-rail">
          <div className="od-brand">
            <span className="dot" />
            {" "}
            <span>
              <b>RAD</b>
              <span style={{ display: "block", marginTop: "1px" }}>OWNER CONSOLE</span>
            </span>
          </div>
          <button className={navClass('overview')} data-section="overview" onClick={() => go('overview')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            {"Overview "}
            <span className="tag" id="od-tag-attention" data-zero={attnCount ? "0" : "1"}>{attnCount}</span>
          </button>
          <div className="od-group">Records</div>
          <button className={navClass('stats')} data-section="stats" onClick={() => go('stats')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l5.5-5.5 3.5 3.5L21 6" />
              <path d="M15 6h6v6" />
            </svg>
            Statistics
          </button>
          {" "}
          <button className={navClass('reports')} data-section="reports" onClick={() => go('reports')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            {"Reports "}
            <span className="tag" id="od-tag-refunds" data-zero={pendingRefunds ? "0" : "1"}>{pendingRefunds}</span>
          </button>
          {" "}
          <button className={navClass('history')} data-section="history" onClick={() => go('history')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
              <path d="M12 8v4l3 2" />
            </svg>
            Transactions
          </button>
          <div className="od-group">Manage</div>
          <button className={navClass('people')} data-section="people" onClick={() => go('people')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 00-3-3.9" />
            </svg>
            Operators & Members
          </button>
          {" "}
          <button className={navClass('stock')} data-section="stock" onClick={() => go('stock')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              <path d="M3.3 7L12 12l8.7-5" />
              <path d="M12 22V12" />
            </svg>
            {"Stock & Rewards "}
            <span className="tag" id="od-tag-stock" data-zero={lowCount ? "0" : "1"}>{lowCount}</span>
          </button>
          <div style={{ marginTop: "auto", padding: "12px 6px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-dim)", padding: "4px 4px 10px" }}>
              <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "12px", color: "var(--blue-bright)" }}>R</span>
              {" "}
              <span>
                Owner
                <span style={{ display: "block", fontSize: "9.5px", color: "var(--text-faint)" }}>RAD Playstation</span>
              </span>
            </div>
            <div className="btn sm ghost" style={{ width: "100%", fontSize: "11px" }} onClick={() => showPage('owner-live')}>Switch to mobile</div>
          </div>
        </div>
        {/* Main */}
        <div className="od-main" ref={mainRef}>
          <div className="od-top">
            <div>
              <div className="od-title" id="od-heading">{head[0]}</div>
              <div className="od-sub" id="od-subheading">{head[1]}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: "0" }}>
              <span style={{ textAlign: "right" }}>
                <span style={{ display: "block", fontSize: "12px", color: "var(--text-dim)" }} id="od-greeting">{greeting}</span>
                {" "}
                <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", fontSize: "10.5px", color: "var(--text-faint)", marginTop: "2px" }}>
                  <span id="od-date">{HIST_DATES[0]}</span>
                  {" "}
                  <span style={{ opacity: "0.4" }}>·</span>
                  {" "}
                  <span className="avatar-dot" />
                  <span style={{ color: "var(--green)" }}>LIVE</span>
                  {" "}
                  <span data-mtext="owner-live-clock">{liveClock()}</span>
                </span>
              </span>
              {" "}
              <TodoTrigger />
            </div>
          </div>
          <div className="od-body">
            {/* ========== OVERVIEW — the landing: today first ========== */}
            <div className="od-panel" data-section="overview" style={{ display: panel('overview') }}>
              <div className="od-hero-band">
                <div className="od-tile accent">
                  <div className="k">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 1v22" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                    In the drawer today
                  </div>
                  <div className="v glow" id="od-today-total">{rupiah(t.total)}</div>
                  <div className="n" id="od-today-split">
                    <span style={{ color: "var(--text-dim)" }}>Cash {rupiah(t.cash)}</span>
                    <span style={{ opacity: "0.4" }}>&middot;</span><span style={{ color: "var(--text-dim)" }}>QRIS {rupiah(t.qris)}</span>
                    {t.refunds ? <span className="pill inuse" style={{ fontSize: "9px" }}>-{rupiah(t.refunds)} refunded</span> : null}
                  </div>
                </div>
                <div className="od-tile calm">
                  <div className="k">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--blue-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    Still on the clock
                  </div>
                  <div className="v" data-mtext="live-billing-total">{rupiah(lf.runningTotal)}</div>
                  <div className="n" id="od-running-note">{running.length ? <>Not paid yet &middot; {running.map((r) => r.name).join(', ')}</> : 'Nothing on the clock right now'}</div>
                </div>
                <div className="od-tile warm">
                  <div className="k">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="13" rx="2" />
                      <path d="M8 21h8" />
                      <path d="M12 17v4" />
                    </svg>
                    Floor
                  </div>
                  <div className="od-split">
                    <span>
                      <span className="sv" style={{ color: "var(--red)" }} data-mtext="live-count-inuse">{lf.inUse}</span>
                      <span className="sk">In use</span>
                    </span>
                    {" "}
                    <span>
                      <span className="sv" style={{ color: "var(--amber)" }} data-mtext="live-count-booked">{lf.booked}</span>
                      <span className="sk">Booked</span>
                    </span>
                    {" "}
                    <span>
                      <span className="sv" style={{ color: "var(--green)" }} data-mtext="live-count-avail">{lf.avail}</span>
                      <span className="sk">Free</span>
                    </span>
                  </div>
                  <div className="n" id="od-floor-note">{floorPct}% of {S.LIVE_ROOMS.length} units occupied{maintCount ? <> &middot; <span style={{ color: "var(--amber)" }}>{maintCount} in maintenance</span></> : null}</div>
                </div>
                <div className="od-tile cool od-card tap" onClick={() => go('stats')} style={{ borderRadius: "12px" }}>
                  <div className="k">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 17l5.5-5.5 3.5 3.5L21 6" />
                      <path d="M15 6h6v6" />
                    </svg>
                    This month
                  </div>
                  <div className="v" id="od-month-total">{statShort(mf.total)}</div>
                  <div className="od-pace">
                    <span id="od-pace-bar" style={{ width: prev ? Math.max(4, Math.min(100, Math.round(mf.total / prev.total * 100))) + "%" : "0%" }} />
                  </div>
                  <div className="n" id="od-month-note">{prev
                    ? <><span style={{ color: mf.total >= prev.total ? "var(--green)" : "var(--amber)" }}>{Math.round(mf.total / prev.total * 100)}% of {statShort(prev.total)}</span> last month</>
                    : mf.monthLabel}</div>
                </div>
              </div>
              <div className="od-grid od-main-side">
                <div>
                  <div className="od-card" style={{ marginBottom: "16px" }}>
                    <div className="od-cardhead">
                      <span className="h">Floor right now</span>
                      {" "}
                      <span className="m">Click a running slot for session details</span>
                    </div>
                    <div className="od-cardbody">
                      <div id="od-live-grid" data-mirror="live-room-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}><LiveRoomCards /></div>
                    </div>
                  </div>
                  <div className="od-card">
                    <div className="od-cardhead">
                      <span className="h">Today’s money</span>
                      {" "}
                      <span className="m">Counted against what operators close at the drawer</span>
                    </div>
                    <div className="od-cardbody" id="od-today-money"><TodayMoney t={t} /></div>
                  </div>
                </div>
                <div>
                  <div className="od-card" style={{ marginBottom: "16px" }}>
                    <div className="od-cardhead">
                      <span className="h">Needs your attention</span>
                      {" "}
                      <span className={'pill ' + (attnClear ? 'available' : 'inuse')} id="od-attention-pill" style={{ fontSize: "9.5px" }}>{attnClear ? 'All clear' : attnRows.length + ' to review'}</span>
                    </div>
                    <div data-mirror="stat-attention"><StatAttention f={f} /></div>
                  </div>
                  <div className="od-card">
                    <div className="od-cardhead">
                      <span className="h">Latest activity</span>
                      {" "}
                      <span className="m" id="live-txn-count">{S.liveTxns.length + ' today'}</span>
                    </div>
                    <div className="od-cardbody od-scroll" style={{ maxHeight: "430px" }}>
                      <div id="live-txn-feed"><TxnFeed /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* ========== STATISTICS ========== */}
            <div className="od-panel" data-section="stats" style={{ display: panel('stats') }}>
              <div style={{ display: "flex", gap: "9px", alignItems: "stretch", marginBottom: "18px" }}>
                <div style={{ position: "relative" }}>
                  <div className="btn sm" onClick={() => toggle('month')} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 13px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-bright)" strokeWidth="1.8">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18M8 3v4M16 3v4" />
                    </svg>
                    <span data-mtext="stat-month-label">{tx.monthLabel}</span>
                    {" "}
                    <span style={{ color: "var(--blue-bright)", fontSize: "11px" }}>▾</span>
                  </div>
                  <div className="od-menu" id="od-month-menu" style={menuStyle('month', { left: "0" })}>{menu === 'month' ? <MonthMenuOptions onDone={close} /> : null}</div>
                </div>
                <div style={{ position: "relative" }}>
                  <div className="btn sm ghost" onClick={() => toggle('range')} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 13px" }}>
                    <span data-mtext="stat-range-label">{f.rangeLabel}</span>
                    <span style={{ color: "var(--blue-bright)", fontSize: "11px" }}>▾</span>
                  </div>
                  <div className="od-menu" id="od-range-menu" style={menuStyle('range', { left: "0", minWidth: "170px" })}>{menu === 'range' ? <RangeMenuOptions onDone={close} /> : null}</div>
                </div>
                <div style={{ position: "relative", marginLeft: "auto" }}>
                  <div className="btn sm" onClick={() => toggle('export')} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 13px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-bright)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12" />
                      <path d="M7.5 10.5L12 15l4.5-4.5" />
                      <path d="M4 19h16" />
                    </svg>
                    Download report
                  </div>
                  <div className="od-menu" id="od-export-menu" style={menuStyle('export', { right: "0" })}>{menu === 'export' ? <ExportMenuOptions desktop onDone={close} /> : null}</div>
                </div>
              </div>
              <div className="od-grid od-main-side">
                <div>
                  <div className="card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
                      <div style={{ minWidth: "0" }}>
                        <div style={{ fontSize: "11.5px", color: "var(--text-faint)" }}>Net revenue</div>
                        <div className="od-hero" data-mtext="stat-total">{tx.total}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "7px" }}>
                          <span className={tx.deltaClass + ' '} data-mpill="stat-delta" style={{ fontSize: "10px" }}>{tx.delta}</span>
                          {" "}
                          <span style={{ fontSize: "10.5px", color: "var(--text-faint)" }} data-mtext="stat-delta-note">{f.deltaNote}</span>
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "6px" }} data-mtext="stat-sub">{f.sub}</div>
                      </div>
                      <div style={{ flexShrink: "0", textAlign: "right" }}>
                        <div style={{ fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Transactions</div>
                        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "24px", marginTop: "2px" }} data-mtext="stat-txcount">{f.tx}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "26px", paddingTop: "16px", marginTop: "16px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ flex: "1" }}>
                        <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Rentals</div>
                        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "18px", marginTop: "3px" }} data-mtext="stat-rentals">{tx.rentals}</div>
                      </div>
                      <div style={{ flex: "1" }}>
                        <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Snacks & add-ons</div>
                        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "18px", marginTop: "3px" }} data-mtext="stat-snacks">{tx.snacks}</div>
                      </div>
                      <div style={{ flex: "1", display: f.refunds ? "block" : "none" }} data-mshow="stat-refund-row">
                        <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Refunds paid out</div>
                        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "18px", marginTop: "3px", color: "var(--red)" }} data-mtext="stat-refunds">{tx.refunds}</div>
                      </div>
                    </div>
                    <div style={{ paddingTop: "16px", marginTop: "16px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", height: "10px", borderRadius: "5px", overflow: "hidden", background: "var(--surface-2)" }}>
                        <div data-mwidth="stat-cash-bar" style={{ width: "46%", background: "#2F8FFF" }} />
                        <div data-mwidth="stat-qris-bar" style={{ width: "54%", background: "#38E8FF" }} />
                      </div>
                      <div style={{ display: "flex", gap: "26px", marginTop: "10px" }}>
                        <span style={{ flex: "1", display: "flex", alignItems: "baseline", gap: "7px" }}>
                          <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: "#2F8FFF" }} />
                          {" "}
                          <span style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>Cash</span>
                          {" "}
                          <span style={{ fontSize: "13px", marginLeft: "auto" }} data-mtext="stat-cash">{tx.cash}</span>
                        </span>
                        {" "}
                        <span style={{ flex: "1", display: "flex", alignItems: "baseline", gap: "7px" }}>
                          <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: "#38E8FF" }} />
                          {" "}
                          <span style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>QRIS</span>
                          {" "}
                          <span style={{ fontSize: "13px", marginLeft: "auto" }} data-mtext="stat-qris">{tx.qris}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="od-card" style={{ marginBottom: "16px" }}>
                    <div className="od-cardhead">
                      <span className="h" data-mtext="stat-trend-label">{tx.trendLabel}</span>
                      {" "}
                      <span className="seg">
                        <span className={'stat-grain' + (S.statGrain === 'week' ? ' on' : '')} data-g="week" onClick={() => statSetGrain('week')}>Week</span>
                        {" "}
                        <span className={'stat-grain' + (S.statGrain === 'day' ? ' on' : '')} data-g="day" onClick={() => statSetGrain('day')}>Day</span>
                      </span>
                    </div>
                    <div className="od-cardbody" data-mirror="stat-chart"><StatChart f={f} /></div>
                  </div>
                  <div className="od-card">
                    <div className="od-cardhead">
                      <span className="h">Revenue per TV / Room</span>
                      {" "}
                      <span className="pill off" data-mtext="stat-unit-note" style={{ fontSize: "9.5px" }}>{tx.unitNote}</span>
                    </div>
                    <div className="od-cardbody flush">
                      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.5fr 0.75fr", gap: "8px", padding: "10px 15px", fontSize: "9.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        <span>Unit</span>
                        <span>Share</span>
                        <span style={{ textAlign: "right" }}>Revenue</span>
                      </div>
                      <div data-mirror="stat-unit-rows"><StatUnitRows f={f} /></div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="od-card">
                    <div className="od-cardhead">
                      <span className="h">Operators</span>
                      {" "}
                      <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "15px", color: "var(--red)" }} data-mtext="stat-disc">{tx.disc}</span>
                    </div>
                    <div className="od-cardbody flush">
                      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", padding: "11px 15px 0" }} data-mtext="stat-disc-label">{f.discLabel}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "11px", margin: "11px 15px 13px", padding: "11px 12px", border: "1px solid rgba(53,227,156,0.3)", borderRadius: "10px", background: "rgba(53,227,156,0.04)" }}>
                        <span style={{ flex: "0 0 30px", height: "30px", borderRadius: "50%", background: "rgba(53,227,156,0.13)", border: "1px solid rgba(53,227,156,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 21h8" />
                            <path d="M12 17v4" />
                            <path d="M6 4h12v5a6 6 0 01-12 0V4z" />
                            <path d="M6 6H3.5A2.5 2.5 0 006 9" />
                            <path d="M18 6h2.5A2.5 2.5 0 0118 9" />
                          </svg>
                        </span>
                        {" "}
                        <span style={{ flex: "1", minWidth: "0" }}>
                          <span style={{ display: "block", fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Shift leader</span>
                          {" "}
                          <span style={{ display: "block", fontSize: "13px", marginTop: "2px" }} data-mtext="stat-top-op">{tx.topOp}</span>
                          {" "}
                          <span style={{ display: "block", fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }} data-mtext="stat-top-op-note">{tx.topOpNote}</span>
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "10px 15px", fontSize: "9.5px", color: "var(--text-faint)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        <span>Day</span>
                        <span>Operator</span>
                        <span style={{ textAlign: "right" }}>Drawer gap</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "10px 15px", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                        <span>Sab</span>
                        <span style={{ color: "var(--text-dim)" }}>Zeke</span>
                        <span style={{ textAlign: "right", color: "var(--red)" }}>-Rp 5.000</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "10px 15px", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                        <span>Jum</span>
                        <span style={{ color: "var(--text-dim)" }}>Qori</span>
                        <span style={{ textAlign: "right", color: "var(--green)" }}>Rp 0</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "10px 15px", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                        <span>Kam</span>
                        <span style={{ color: "var(--text-dim)" }}>Mutya</span>
                        <span style={{ textAlign: "right", color: "var(--red)" }}>-Rp 3.000</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "10px 15px", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                        <span>Rab</span>
                        <span style={{ color: "var(--text-dim)" }}>Zeke</span>
                        <span style={{ textAlign: "right", color: "var(--red)" }}>-Rp 12.000</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "10px 15px", fontSize: "12.5px" }}>
                        <span>Sel</span>
                        <span style={{ color: "var(--text-dim)" }}>Qori</span>
                        <span style={{ textAlign: "right", color: "var(--green)" }}>Rp 0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "22px" }}>
                <div className="od-grid od-3" style={{ marginBottom: "16px" }}>
                  <div className="od-tile">
                    <div className="k">Bookings this month</div>
                    <div className="v">126</div>
                    <div className="n">Peak hour 20.00 · busiest on Sabtu</div>
                  </div>
                  <div className="od-tile">
                    <div className="k">Average occupancy</div>
                    <div className="v">64%</div>
                    <div className="n">Across all 8 units</div>
                  </div>
                  <div className="od-tile">
                    <div className="k">Busiest unit</div>
                    <div className="v" style={{ fontSize: "24px" }}>VIP Room</div>
                    <div className="n">88% occupied</div>
                  </div>
                </div>
                <div className="od-grid od-3">
                  <div className="od-card">
                    <div className="od-cardhead">
                      <span className="h">Bookings per day</span>
                    </div>
                    <div className="od-cardbody" id="od-perf-a" data-mirror="perf-day-card"><PerfDayCard /></div>
                  </div>
                  <div className="od-card">
                    <div className="od-cardhead">
                      <span className="h">Bookings by hour</span>
                    </div>
                    <div className="od-cardbody" id="od-perf-b" data-mirror="perf-hour-card"><PerfHourCard /></div>
                  </div>
                  <div className="od-card">
                    <div className="od-cardhead">
                      <span className="h">Occupancy by unit</span>
                    </div>
                    <div className="od-cardbody" id="od-perf-c" data-mirror="perf-occ-card"><PerfOccCard /></div>
                  </div>
                </div>
              </div>
            </div>
            {/* ========== REPORTS ========== */}
            <div className="od-panel" data-section="reports" style={{ display: panel('reports') }}>
              <div className="od-grid od-main-side">
                <div>
                  <div className="od-card" style={{ marginBottom: "16px" }}>
                    <div className="od-cardhead">
                      <span className="h">Refund requests</span>
                      {" "}
                      <span className="pill inuse" data-mtext="owner-refund-count" style={{ fontSize: "9.5px" }}>{pendingRefunds + ' waiting'}</span>
                    </div>
                    <div className="od-cardbody">
                      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>Started by an operator, settled by you. Approving takes the money off revenue and the cash drawer.</div>
                      <div data-mirror="owner-refund-list"><RefundWaitingList /></div>
                    </div>
                  </div>
                  <div className="od-card">
                    <div className="od-cardhead">
                      <span className="h">Booking audit log</span>
                      {" "}
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="pill off" data-mtext="owner-audit-count" style={{ fontSize: "9.5px" }}>{auditCountText(S)}</span>
                        {" "}
                        <span style={{ position: "relative" }}>
                          <span className="btn sm ghost" onClick={() => toggle('rpt')} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "5px 10px", fontSize: "10.5px" }}>
                            <span data-mtext="rpt-date-label">{rptDateLabel(S)}</span>
                            <span style={{ color: "var(--blue-bright)" }}>▾</span>
                          </span>
                          {" "}
                          <span className="od-menu od-scroll" id="od-rpt-menu" style={menuStyle('rpt', { right: "0", top: "34px" })}>{menu === 'rpt' ? <RptMenuOptions onDone={close} /> : null}</span>
                        </span>
                      </span>
                    </div>
                    <div className="od-cardbody flush">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 0.62fr 0.85fr 0.62fr", gap: "8px", padding: "10px 15px", borderBottom: "1px solid var(--border)", fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        <span>TV / Room</span>
                        <span>Admin</span>
                        <span>Action</span>
                        <span style={{ textAlign: "right" }}>Details</span>
                      </div>
                      <div data-mirror="owner-audit-log" style={{ padding: "0 15px" }}><AuditLogRows /></div>
                    </div>
                  </div>
                </div>
                <div className="od-card">
                  <div className="od-cardhead">
                    <span className="h">Feedbacks</span>
                    {" "}
                    <span style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: "0" }}>
                      <span className="pill off" data-mtext="owner-feedback-count" style={{ fontSize: "9.5px" }}>{feedbackCountText(S)}</span>
                      {" "}
                      <span className="btn sm ghost" style={{ fontSize: "10px", padding: "4px 9px" }} onClick={ownerFeedbackMarkRead}>Mark read</span>
                    </span>
                  </div>
                  <div className="od-cardbody od-scroll">
                    <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>Pin one and it lands on your to-do list</div>
                    <div data-mirror="owner-feedback-list"><FeedbackRows /></div>
                  </div>
                </div>
              </div>
            </div>
            {/* ========== TRANSACTION HISTORY ========== */}
            <div className="od-panel" data-section="history" style={{ display: panel('history') }}>
              <div style={{ position: "relative", display: "inline-block", marginBottom: "18px" }}>
                <div className="btn sm" onClick={() => toggle('hist')} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 13px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-bright)" strokeWidth="1.8">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </svg>
                  <span data-mtext="hist-date-label">{hc.dateLabel}</span>
                  <span style={{ color: "var(--blue-bright)", fontSize: "11px" }}>▾</span>
                </div>
                <div className="od-menu od-scroll" id="od-hist-menu" style={menuStyle('hist', { left: "0" })}>{menu === 'hist' ? <HistMenuOptions onDone={close} /> : null}</div>
              </div>
              <div className="od-grid od-3">
                <div className="od-card">
                  <div className="od-cardhead">
                    <span className="h">Payment receipts</span>
                    {" "}
                    <span className="pill off" data-mtext="owner-receipt-count" style={{ fontSize: "9.5px" }}>{hc.receipts}</span>
                  </div>
                  <div className="od-cardbody od-scroll">
                    <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>Every receipt operators close at the counter</div>
                    <div data-mirror="owner-receipt-list"><ReceiptList /></div>
                  </div>
                </div>
                <div className="od-card">
                  <div className="od-cardhead">
                    <span className="h">Refunds settled</span>
                    {" "}
                    <span className="pill off" data-mtext="owner-refund-settled-count" style={{ fontSize: "9.5px" }}>{hc.settled}</span>
                  </div>
                  <div className="od-cardbody od-scroll">
                    <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>Approved and rejected, with your note</div>
                    <div data-mirror="owner-refund-history"><RefundSettledList /></div>
                  </div>
                </div>
                <div className="od-card">
                  <div className="od-cardhead">
                    <span className="h">Shift summary</span>
                    {" "}
                    <span className="pill booked" data-mtext="owner-shift-count" style={{ fontSize: "9.5px" }}>{hc.shifts}</span>
                  </div>
                  <div className="od-cardbody od-scroll">
                    <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>Cash, QRIS and snack gaps per operator</div>
                    <div data-mirror="owner-shift-list"><ShiftList /></div>
                  </div>
                </div>
              </div>
            </div>
            {/* ========== OPERATORS & MEMBERS ========== */}
            <div className="od-panel" data-section="people" style={{ display: panel('people') }}>
              <div className="od-grid od-main-side">
                <div className="od-card">
                  <div className="od-cardhead">
                    <span className="h">Members</span>
                    {" "}
                    <span className="pill owner" style={{ fontSize: "9.5px" }}>
                      <span data-mtext="owner-member-count">{S.ownerMembers.length}</span>
                      {" total"}
                    </span>
                  </div>
                  <div className="od-cardbody">
                    <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>Points program · 300 pts cap · only you can delete a member</div>
                    <input type="text" placeholder="Search name or number" value={S.memberSearch} onChange={(e) => setMemberSearch(e.target.value)} style={{ marginBottom: "14px", maxWidth: "340px" }} />
                    <div data-mirror="owner-member-list"><MemberList /></div>
                  </div>
                </div>
                <div>
                  <div className="od-card" style={{ marginBottom: "16px" }}>
                    <div className="od-cardhead">
                      <span className="h">Membership requests</span>
                      {" "}
                      <span className="pill booked" data-mtext="owner-request-count" style={{ fontSize: "9.5px" }}>{S.memberRequests.length + ' waiting'}</span>
                    </div>
                    <div className="od-cardbody">
                      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>Raised by operators — nothing becomes a membership until you approve</div>
                      <div data-mirror="owner-request-list"><RequestList /></div>
                    </div>
                  </div>
                  <div className="od-card">
                    <div className="od-cardhead">
                      <span className="h">Operators</span>
                      {" "}
                      <span style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: "0" }}>
                        <span className="pill off" data-mtext="owner-operator-count" style={{ fontSize: "9.5px" }}>{S.ownerOperators.length}</span>
                        {" "}
                        <span className="btn sm ghost" style={{ fontSize: "10px", padding: "4px 9px" }} onClick={ownerOpenOperatorEditor}>Edit</span>
                      </span>
                    </div>
                    <div className="od-cardbody">
                      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>Staff accounts that can open a shift on the admin console</div>
                      <div data-mirror="owner-operator-list"><OperatorList /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* ========== STOCK & REWARDS ========== */}
            <div className="od-panel" data-section="stock" style={{ display: panel('stock') }}>
              <div data-mirror="stock-alert" style={{ marginBottom: "20px", maxWidth: "620px" }}><StockAlert /></div>
              <div className="od-grid od-2">
                <div className="od-card">
                  <div className="od-cardhead">
                    <span className="h">Snacks</span>
                    {" "}
                    <span style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: "0" }}>
                      <span className="pill off" data-mtext="snack-count-pill" style={{ fontSize: "9.5px" }}>{S.snackStock.length + ' items'}</span>
                      {" "}
                      <span className="btn sm ghost" style={{ fontSize: "10px", padding: "4px 10px" }} onClick={ownerOpenSnackEditor}>Edit</span>
                    </span>
                  </div>
                  <div className="od-cardbody flush">
                    <div style={{ fontSize: "10.5px", color: "var(--text-faint)", padding: "11px 15px 0" }}>Counted at every shift closing — red means at or below your reorder point</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1.1fr 0.85fr", gap: "8px", padding: "11px 15px 9px", fontSize: "9.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <span>Item</span>
                      <span>Stock</span>
                      <span style={{ textAlign: "right" }}>Price</span>
                    </div>
                    <div data-mirror="owner-snack-rows"><OwnerSnackRows /></div>
                  </div>
                </div>
                <div className="od-card">
                  <div className="od-cardhead">
                    <span className="h">TV & Room rates</span>
                    {" "}
                    <span style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: "0" }}>
                      <span className="pill off" style={{ fontSize: "9.5px" }}>per jam</span>
                      {" "}
                      <span className="btn sm ghost" style={{ fontSize: "10px", padding: "4px 10px" }} onClick={ownerOpenRateEditor}>Edit</span>
                    </span>
                  </div>
                  <div className="od-cardbody flush">
                    <div style={{ fontSize: "10.5px", color: "var(--text-faint)", padding: "11px 15px 0" }}>What the booking page quotes and the billing screen charges</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr", gap: "8px", padding: "11px 15px 9px", fontSize: "9.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <span>TV / Room</span>
                      <span style={{ textAlign: "right" }}>Weekday</span>
                      <span style={{ textAlign: "right" }}>Weekend</span>
                    </div>
                    <div data-mirror="owner-rate-rows"><RateRows /></div>
                  </div>
                </div>
                <div className="od-card">
                  <div className="od-cardhead">
                    <span className="h">Add-ons</span>
                    {" "}
                    <span style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: "0" }}>
                      <span className={fp.className + ' '} data-mpill="addon-free-pill" data-keep="" style={{ fontSize: "9.5px" }}>{fp.text}</span>
                      {" "}
                      <span className="btn sm ghost" style={{ fontSize: "10px", padding: "4px 10px" }} onClick={ownerOpenAddonEditor}>Edit</span>
                    </span>
                  </div>
                  <div className="od-cardbody flush">
                    <div style={{ fontSize: "10.5px", color: "var(--text-faint)", padding: "11px 15px 0" }}>Gear the customer can add at booking, up to the number you own</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.7fr 0.62fr 0.5fr 0.92fr", gap: "8px", padding: "11px 15px 9px", fontSize: "9.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <span>Add-on</span>
                      <span>Fits</span>
                      <span style={{ textAlign: "center" }}>Free</span>
                      <span style={{ textAlign: "right" }}>Price</span>
                    </div>
                    <div data-mirror="owner-addon-rows"><AddonRows /></div>
                  </div>
                </div>
                <div className="od-card">
                  <div className="od-cardhead">
                    <span className="h">Redeem catalog</span>
                    {" "}
                    <span style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: "0" }}>
                      <span className="pill owner" style={{ fontSize: "9.5px" }}>Max 300 pts</span>
                      {" "}
                      <span className="btn sm ghost" style={{ fontSize: "10px", padding: "4px 10px" }} onClick={ownerOpenRewardEditor}>Edit</span>
                    </span>
                  </div>
                  <div className="od-cardbody">
                    <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>What members exchange points for</div>
                    <div data-mirror="owner-reward-rows"><RewardRows /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

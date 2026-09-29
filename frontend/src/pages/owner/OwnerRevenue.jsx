import { useState } from 'react';
import { useStore, statSetGrain, statTogglePerf, statFigures } from '../../store';
import { Page, Phone, OwnerTabs, TodoTrigger } from '../../components/Phone';
import {
  MonthMenuOptions, RangeMenuOptions, ExportMenuOptions, StatAttention, StatChart, StatUnitRows, statTexts,
  PerfDayCard, PerfHourCard, PerfOccCard
} from '../../components/OwnerParts';

export default function OwnerRevenue() {
  const S = useStore();
  const f = statFigures();
  const t = statTexts(S, f);
  /* The three dropdowns close each other, as they did in the prototype */
  const [menu, setMenu] = useState(null);
  const toggle = (m) => setMenu(menu === m ? null : m);
  const close = () => setMenu(null);
  return (
    <Page id="owner-revenue">
      <Phone>
        <div className="phone-content">
          <div className="row" style={{ margin: "6px 0 12px" }}>
            <div className="h-title">Statistics</div>
            <TodoTrigger />
          </div>
          <div className="stat-sticky" style={{ position: "sticky", top: "0", zIndex: "30", background: "var(--bg)", margin: "0 -18px 16px", padding: "2px 18px 10px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: "7px", alignItems: "stretch" }}>
              <div style={{ position: "relative", flex: "1" }}>
                <div className="btn sm" onClick={() => toggle('month')} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "7px", overflow: "hidden" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-bright)" strokeWidth="1.8" style={{ flexShrink: "0" }}>
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18M8 3v4M16 3v4" />
                    </svg>
                    <span id="stat-month-label" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.monthLabel}</span>
                  </span>
                  {" "}
                  <span style={{ color: "var(--blue-bright)", fontSize: "11px" }}>▾</span>
                </div>
                <div id="stat-month-menu" style={{ display: menu === 'month' ? "block" : "none", position: "absolute", top: "44px", left: "0", right: "0", zIndex: "20", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "9px", overflow: "hidden", boxShadow: "0 14px 34px rgba(0,0,0,0.5)" }}>{menu === 'month' ? <MonthMenuOptions onDone={close} /> : null}</div>
              </div>
              <div style={{ position: "relative", flexShrink: "0" }}>
                <div className="btn sm" onClick={() => toggle('export')} title="Download report" style={{ padding: "9px 11px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-bright)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12" />
                    <path d="M7.5 10.5L12 15l4.5-4.5" />
                    <path d="M4 19h16" />
                  </svg>
                  <span style={{ fontSize: "11px" }}>Report</span>
                </div>
                <div id="stat-export-menu" style={{ display: menu === 'export' ? "block" : "none", position: "absolute", top: "44px", right: "0", zIndex: "22", width: "210px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "9px", overflow: "hidden", boxShadow: "0 14px 34px rgba(0,0,0,0.5)" }}>{menu === 'export' ? <ExportMenuOptions onDone={close} /> : null}</div>
              </div>
            </div>
          </div>
          {/* 1 ▸ MONEY — the number the owner opens this page for */}
          <div className="card" style={{ marginBottom: "14px", padding: "16px" }}>
            <div className="row" style={{ alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "11.5px", color: "var(--text-faint)" }}>Net revenue</div>
                <div id="stat-total" className="value glow" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "40px", lineHeight: "1.05", color: "var(--cyan)", textShadow: "0 0 18px rgba(56,232,255,0.45)" }}>{t.total}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "5px", flexWrap: "wrap" }}>
                  <span id="stat-delta" className={t.deltaClass} style={{ fontSize: "10px", display: t.deltaShown ? "inline-block" : "none" }}>{t.delta}</span>
                  {" "}
                  <span id="stat-delta-note" style={{ fontSize: "10px", color: "var(--text-faint)" }}>{f.deltaNote}</span>
                </div>
                <div id="stat-sub" style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "5px" }}>{f.sub}</div>
              </div>
              <div style={{ position: "relative" }}>
                <div className="btn sm ghost" onClick={() => toggle('range')} style={{ fontSize: "10.5px", padding: "5px 9px", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                  <span id="stat-range-label">{f.rangeLabel}</span>
                  <span style={{ color: "var(--blue-bright)" }}>▾</span>
                </div>
                <div id="stat-range-menu" style={{ display: menu === 'range' ? "block" : "none", position: "absolute", top: "32px", right: "0", zIndex: "20", width: "150px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "9px", overflow: "hidden", boxShadow: "0 14px 34px rgba(0,0,0,0.5)" }}>{menu === 'range' ? <RangeMenuOptions compact onDone={close} /> : null}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "14px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <div style={{ flex: "1" }}>
                <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Rentals</div>
                <div id="stat-rentals" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "15px", marginTop: "2px" }}>{t.rentals}</div>
              </div>
              <div style={{ flex: "1" }}>
                <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Snacks</div>
                <div id="stat-snacks" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "15px", marginTop: "2px" }}>{t.snacks}</div>
              </div>
              <div style={{ flex: "1" }}>
                <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Transactions</div>
                <div id="stat-txcount" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "15px", marginTop: "2px" }}>{f.tx}</div>
              </div>
            </div>
            <div id="stat-refund-row" style={{ display: f.refunds ? "block" : "none", paddingTop: "11px", marginTop: "11px", borderTop: "1px solid var(--border)" }}>
              <div className="row" style={{ fontSize: "12px" }}>
                <span style={{ color: "var(--text-dim)" }}>
                  {"Refunds paid out "}
                  <span id="stat-refund-count" style={{ color: "var(--text-faint)", fontSize: "10.5px" }}>{t.refundCount}</span>
                </span>
                {" "}
                <span id="stat-refunds" style={{ color: "var(--red)", fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "15px" }}>{t.refunds}</span>
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "4px" }}>
                {"Gross before refunds was "}
                <span id="stat-gross">{t.gross}</span>
                .
              </div>
            </div>
            {/* Cash vs QRIS lives inside the money card — same glance, no extra scroll */}
            <div style={{ paddingTop: "12px", marginTop: "12px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", height: "9px", borderRadius: "5px", overflow: "hidden", background: "var(--surface-2)" }}>
                <div id="stat-cash-bar" style={{ width: "46%", height: "100%", background: "#2F8FFF" }} />
                <div id="stat-qris-bar" style={{ width: "54%", height: "100%", background: "#38E8FF" }} />
              </div>
              <div style={{ display: "flex", gap: "14px", marginTop: "9px" }}>
                <div style={{ flex: "1", display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: "#2F8FFF", flexShrink: "0" }} />
                  {" "}
                  <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>Cash</span>
                  {" "}
                  <span id="stat-cash" style={{ fontSize: "12px", marginLeft: "auto" }}>{t.cash}</span>
                </div>
                <div style={{ flex: "1", display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: "#38E8FF", flexShrink: "0" }} />
                  {" "}
                  <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>QRIS</span>
                  {" "}
                  <span id="stat-qris" style={{ fontSize: "12px", marginLeft: "auto" }}>{t.qris}</span>
                </div>
              </div>
            </div>
          </div>
          {/* 2 ▸ NEEDS ATTENTION — the scan for anything wrong */}
          <div className="osec hot">
            <div className="t">Needs attention</div>
          </div>
          <div className="card" id="stat-attention" style={{ padding: "0", overflow: "hidden", marginBottom: "6px" }}><StatAttention f={f} /></div>
          {/* 3 ▸ TREND */}
          <div className="osec">
            <div className="t" id="stat-trend-label">{t.trendLabel}</div>
            <span className="seg" id="stat-grain-toggle" style={{ display: S.statRange.type === 'month' ? "flex" : "none" }}>
              <span className={'stat-grain' + (S.statGrain === 'week' ? ' on' : '')} data-g="week" onClick={() => statSetGrain('week')}>Week</span>
              {" "}
              <span className={'stat-grain' + (S.statGrain === 'day' ? ' on' : '')} data-g="day" onClick={() => statSetGrain('day')}>Day</span>
            </span>
          </div>
          <div className="card" id="stat-chart" style={{ marginBottom: "4px" }}><StatChart f={f} /></div>
          {/* 4 ▸ WHAT EARNS */}
          <div className="osec">
            <div className="t">Revenue per TV / Room</div>
            <span className="pill off" id="stat-unit-note" style={{ fontSize: "9.5px" }}>{t.unitNote}</span>
          </div>
          <div className="card" style={{ padding: "0", overflow: "hidden", marginBottom: "4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.5fr 0.75fr", gap: "8px", padding: "9px 12px", fontSize: "9.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>Unit</span>
              <span>Share</span>
              <span style={{ textAlign: "right" }}>Revenue</span>
            </div>
            <div id="stat-unit-rows"><StatUnitRows f={f} /></div>
          </div>
          {/* 5 ▸ WHO IS ON THE FLOOR */}
          <div className="osec warm">
            <div className="t">Operators</div>
            <span className="value danger" id="stat-disc" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "15px" }}>{t.disc}</span>
          </div>
          <div className="osub" id="stat-disc-label">{f.discLabel}</div>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "11px", padding: "11px 12px", marginBottom: "8px", borderColor: "rgba(53,227,156,0.3)" }}>
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
            <span style={{ flex: "1" }}>
              <span style={{ display: "block", fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Shift leader</span>
              {" "}
              <span id="stat-top-op" style={{ display: "block", fontSize: "13px", marginTop: "2px" }}>{t.topOp}</span>
              {" "}
              <span id="stat-top-op-note" style={{ display: "block", fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>{t.topOpNote}</span>
            </span>
          </div>
          <div className="card" style={{ padding: "0", overflow: "hidden", marginBottom: "4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "9px 12px", fontSize: "9.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>Day</span>
              <span>Operator</span>
              <span style={{ textAlign: "right" }}>Drawer gap</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
              <span>Sab</span>
              <span style={{ color: "var(--text-dim)" }}>Zeke</span>
              <span style={{ textAlign: "right", color: "var(--red)" }}>-Rp 5.000</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
              <span>Jum</span>
              <span style={{ color: "var(--text-dim)" }}>Qori</span>
              <span style={{ textAlign: "right", color: "var(--green)" }}>Rp 0</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
              <span>Kam</span>
              <span style={{ color: "var(--text-dim)" }}>Mutya</span>
              <span style={{ textAlign: "right", color: "var(--red)" }}>-Rp 3.000</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
              <span>Rab</span>
              <span style={{ color: "var(--text-dim)" }}>Zeke</span>
              <span style={{ textAlign: "right", color: "var(--red)" }}>-Rp 12.000</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "9px 12px", fontSize: "12.5px" }}>
              <span>Sel</span>
              <span style={{ color: "var(--text-dim)" }}>Qori</span>
              <span style={{ textAlign: "right", color: "var(--green)" }}>Rp 0</span>
            </div>
          </div>
          {/* 6 ▸ PERFORMANCE — rarely read, folded away by default */}
          <div className="osec cool" style={{ cursor: "pointer" }} onClick={statTogglePerf}>
            <div className="t">Performance detail</div>
            <span className="btn sm ghost" id="stat-perf-toggle" style={{ fontSize: "10px", padding: "4px 10px" }}>{S.statPerfOpen ? 'Hide' : 'Show'}</span>
          </div>
          <div className="osub">Bookings, peak hours and occupancy — the slow-moving numbers</div>
          <div id="stat-perf-body" style={{ display: S.statPerfOpen ? "block" : "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", marginBottom: "16px" }}>
              <div className="metric">
                <div className="label">Bookings</div>
                <div className="value glow">126</div>
              </div>
              <div className="metric">
                <div className="label">Avg occupancy</div>
                <div className="value">64%</div>
              </div>
              <div className="metric">
                <div className="label">Busiest room</div>
                <div className="value" style={{ fontSize: "16px" }}>VIP Room</div>
              </div>
              <div className="metric">
                <div className="label">Peak hour</div>
                <div className="value" style={{ fontSize: "16px" }}>20.00</div>
              </div>
            </div>
            <div className="section-label">Bookings per day</div>
            <div className="card" id="perf-day-card" style={{ marginBottom: "18px" }}><PerfDayCard /></div>
            <div className="section-label">Bookings by hour</div>
            <div className="card" id="perf-hour-card" style={{ marginBottom: "18px" }}><PerfHourCard /></div>
            <div className="section-label">Occupancy by TV / Room</div>
            <div className="card" id="perf-occ-card" style={{ marginBottom: "18px" }}><PerfOccCard /></div>
          </div>
        </div>
        <OwnerTabs active="revenue" />
      </Phone>
    </Page>
  );
}

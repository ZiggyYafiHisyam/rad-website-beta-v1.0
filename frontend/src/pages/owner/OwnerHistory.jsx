import { useState } from 'react';
import { useStore } from '../../store';
import { Page, Phone, OwnerTabs, TodoTrigger } from '../../components/Phone';
import { HistMenuOptions, ReceiptList, RefundSettledList, ShiftList, historyCounts } from '../../components/OwnerParts';

export default function OwnerHistory() {
  const S = useStore();
  const hc = historyCounts(S);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Page id="owner-history">
      <Phone>
        <div className="phone-content">
          <div className="row" style={{ margin: "6px 0 4px" }}>
            <div className="h-title">Transaction history</div>
            <TodoTrigger />
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>Every receipt the operators close at the counter lands here automatically.</div>
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <div className="btn sm" onClick={() => setMenuOpen(!menuOpen)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-bright)" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                <span id="hist-date-label">{hc.dateLabel}</span>
              </span>
              {" "}
              <span style={{ color: "var(--blue-bright)", fontSize: "11px" }}>▾</span>
            </div>
            <div id="hist-date-menu" style={{ display: menuOpen ? "block" : "none", position: "absolute", top: "44px", left: "0", right: "0", zIndex: "20", maxHeight: "240px", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "9px", overflowX: "hidden", boxShadow: "0 14px 34px rgba(0,0,0,0.5)" }}>{menuOpen ? <HistMenuOptions onDone={() => setMenuOpen(false)} /> : null}</div>
          </div>
          <div className="row" style={{ marginBottom: "9px" }}>
            <div className="section-label" style={{ margin: "0" }}>Payment receipts</div>
            <span className="pill off" id="owner-receipt-count">{hc.receipts}</span>
          </div>
          <div id="owner-receipt-list" style={{ marginBottom: "24px" }}><ReceiptList /></div>
          <div className="row" style={{ marginBottom: "9px" }}>
            <div className="section-label" style={{ margin: "0" }}>Refunds settled</div>
            <span className="pill off" id="owner-refund-settled-count">{hc.settled}</span>
          </div>
          <div id="owner-refund-history" style={{ marginBottom: "24px" }}><RefundSettledList /></div>
          <div style={{ borderTop: "2px solid var(--amber)", paddingTop: "12px", marginBottom: "6px" }}>
            <div className="row">
              <div className="h-title" style={{ fontSize: "15px" }}>Shift summary</div>
              <span className="pill booked" id="owner-shift-count">{hc.shifts}</span>
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "2px" }}>Closed by the operator on duty — cash, QRIS and snack gaps, so you know whose shift a discrepancy came from.</div>
          </div>
          <div id="owner-shift-list" style={{ margin: "12px 0 8px" }}><ShiftList /></div>
        </div>
        <OwnerTabs active="history" />
      </Phone>
    </Page>
  );
}

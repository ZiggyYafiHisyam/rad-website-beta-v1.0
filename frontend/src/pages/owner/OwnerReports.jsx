import { useState } from 'react';
import { useStore, ownerFeedbackMarkRead, refundPending } from '../../store';
import { Page, Phone, OwnerTabs, TodoTrigger } from '../../components/Phone';
import { RefundWaitingList, AuditLogRows, auditCountText, RptMenuOptions, rptDateLabel, FeedbackRows, feedbackCountText } from '../../components/OwnerParts';

/* Floating button: scroll the phone screen down to the feedback inbox */
function rptJumpFeedback() {
  const anchor = document.getElementById('owner-feedback-anchor');
  if (!anchor) return;
  const scroller = anchor.closest('.phone-content');
  if (scroller) scroller.scrollTop = anchor.offsetTop - 10;
}

export default function OwnerReports() {
  const S = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Page id="owner-reports">
      <Phone>
        <div className="phone-content">
          <div className="row" style={{ margin: "6px 0 18px" }}>
            <div className="h-title">Reports</div>
            <TodoTrigger />
          </div>
          <div style={{ borderTop: "2px solid var(--red)", paddingTop: "12px", marginBottom: "6px" }}>
            <div className="row">
              <div className="h-title" style={{ fontSize: "15px" }}>Refund requests</div>
              <span className="pill inuse" id="owner-refund-count">{refundPending().length + ' waiting'}</span>
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "2px" }}>Started by an operator, settled by you. Approving it takes the money off today's revenue and the cash drawer.</div>
          </div>
          <div id="owner-refund-list" style={{ margin: "12px 0 26px" }}><RefundWaitingList /></div>
          <div className="row" style={{ marginBottom: "9px" }}>
            <div className="section-label" style={{ margin: "0" }}>Booking audit log</div>
            <span className="pill off" id="owner-audit-count">{auditCountText(S)}</span>
          </div>
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <div className="btn sm" onClick={() => setMenuOpen(!menuOpen)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-bright)" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                <span id="rpt-date-label">{rptDateLabel(S)}</span>
              </span>
              {" "}
              <span style={{ color: "var(--blue-bright)", fontSize: "11px" }}>▾</span>
            </div>
            <div id="rpt-date-menu" style={{ display: menuOpen ? "block" : "none", position: "absolute", top: "44px", left: "0", right: "0", zIndex: "20", maxHeight: "240px", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "9px", overflowX: "hidden", boxShadow: "0 14px 34px rgba(0,0,0,0.5)" }}>{menuOpen ? <RptMenuOptions onDone={() => setMenuOpen(false)} /> : null}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.62fr 0.85fr 0.62fr", gap: "6px", padding: "0 0 7px", borderBottom: "1px solid var(--blue)", fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <span>TV / Room</span>
            <span>Admin</span>
            <span>Action</span>
            <span style={{ textAlign: "right" }}>Details</span>
          </div>
          <div id="owner-audit-log" style={{ marginBottom: "26px" }}><AuditLogRows /></div>
          <div id="owner-feedback-anchor" className="row" style={{ marginBottom: "9px", alignItems: "center" }}>
            <div className="h-title" style={{ fontSize: "15px" }}>Feedbacks</div>
            <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span className="pill off" id="owner-feedback-count">{feedbackCountText(S)}</span>
              {" "}
              <span className="btn sm ghost" style={{ fontSize: "10px", padding: "4px 9px" }} onClick={ownerFeedbackMarkRead}>Mark as read</span>
            </span>
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "9px" }}>Pin a feedback to send it to the to-do list on Statistics.</div>
          <div id="owner-feedback-list" style={{ marginBottom: "8px" }}><FeedbackRows /></div>
        </div>
        <div onClick={rptJumpFeedback} title="Jump to feedbacks" style={{ position: "absolute", left: "14px", bottom: "74px", zIndex: "30", width: "44px", height: "44px", borderRadius: "50%", background: "#5FB2FF", boxShadow: "0 0 0 4px rgba(95,178,255,0.18), 0 0 18px rgba(95,178,255,0.75), 0 6px 16px rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#06070B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 01-8.4 8.4 8.6 8.6 0 01-3.8-.9L3 20l1.1-5.6a8.4 8.4 0 1116.9-2.9z" />
            <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
          </svg>
        </div>
        <OwnerTabs active="reports" />
      </Phone>
    </Page>
  );
}

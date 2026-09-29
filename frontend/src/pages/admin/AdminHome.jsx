import { useState } from 'react';
import {
  useStore, operatorRequestMember, orderOpen, showPage, rupiah, signedRupiah, closeFigures, closeDiscrepancy,
  refundPending, todaysReceipts, BILLING_BOXES
} from '../../store';
import { Page } from '../../components/Phone';
import { IMG } from '../../assets/images';
import { BillingBox, NoticeList, LowStockList, PendingRequests, BookingRows, RefundableRows } from '../../components/AdminParts';

export default function AdminHome() {
  const S = useStore();
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  /* DASHBOARD METRICS — the same figures the operator reconciles at closing */
  const f = closeFigures();
  let active = 0;
  Object.keys(S.billingState).forEach((k) => { if (S.billingState[k].running) active++; });
  const full = active >= S.LIVE_ROOMS.length;
  const disc = closeDiscrepancy();
  const pendingRefunds = refundPending().length;
  function submitRequest() {
    if (operatorRequestMember(reqName, reqPhone)) { setReqName(''); setReqPhone(''); }
  }
  return (
    <Page id="admin-home">
      <div className="desktop-page">
        <div className="topbar">
          <div className="h-title">
            {"RAD PLAYSTATION "}
            <span style={{ color: "var(--text-faint)", fontWeight: "500", fontSize: "12px" }}>/ admin</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-dim)" }}>
            <img src={IMG["operator.jpg"]} style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
            {" "}
            <span className="admin-operator-name">{S.activeOperator}</span>
            {"\u00a0on duty "}
            <span className="btn sm ghost" style={{ marginLeft: "10px" }} onClick={() => showPage('admin-login')}>End shift</span>
          </div>
        </div>
        <div className="desktop-body">
          <div className="h-title" style={{ marginBottom: "16px" }}>Today's overview</div>
          <div className="adm-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "14px", marginBottom: "26px" }}>
            <div className="metric">
              <div className="label">Total Pemasukan</div>
              <div className="value glow" id="dash-revenue">{rupiah(f.total)}</div>
            </div>
            <div className="metric">
              <div className="label">Cash / QRIS</div>
              <div className="value" style={{ fontSize: "16px" }} id="dash-cashqris">{Math.round(f.cash / 1000) + 'K / ' + Math.round(f.qris / 1000) + 'K'}</div>
            </div>
            <div className="metric">
              <div className="label">Active rentals</div>
              <div className="value" id="dash-active" style={{ color: full ? "var(--red)" : undefined }}>{full ? 'FULL' : active}</div>
            </div>
            <div className="metric">
              <div className="label">Bookingan</div>
              <div className="value" id="dash-upcoming-count">{S.todayBookings.length}</div>
            </div>
            <div className="metric">
              <div className="label">Selisih</div>
              <div className="value" id="dash-disc" style={{ fontSize: "16px", color: disc === 0 ? "var(--green)" : "var(--red)" }}>{signedRupiah(disc)}</div>
            </div>
          </div>
          <div className="adm-stack" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "20px", marginBottom: "26px" }}>
            <div>
              <div className="row" style={{ alignItems: "center", marginBottom: "1px" }}>
                <div className="section-label" style={{ margin: "0" }}>Daftar TV / Room</div>
                <div className="btn sm ghost" onClick={orderOpen}>+ Order</div>
              </div>
              <div className="adm-stack" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px" }}>
                {BILLING_BOXES.map((bx) => <BillingBox key={bx.id} id={bx.id} name={bx.name} />)}
              </div>
            </div>
            <div>
              <div className="row" style={{ marginBottom: "8px" }}>
                <div className="section-label" style={{ margin: "0" }}>Info from owner</div>
                <span className="pill owner" id="op-notice-count">{S.ownerNotices.filter((n) => n.unread).length + ' new'}</span>
              </div>
              <div className="card" id="op-notice-list" style={{ padding: "0", overflow: "hidden" }}><NoticeList /></div>
              <div className="section-label" style={{ marginTop: "18px" }}>Low stock</div>
              <div className="card" id="dash-low-stock" style={{ padding: "0", overflow: "hidden", marginBottom: "6px" }}><LowStockList /></div>
              <div style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>Full stock list and prices live on the Inventory page — owner-controlled.</div>
              <div className="row" style={{ margin: "18px 0 8px" }}>
                <div className="section-label" style={{ margin: "0" }}>Membership request</div>
                <span className="pill owner">Needs owner approval</span>
              </div>
              <div className="card">
                <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "10px" }}>Customers cannot register themselves — this lands in the owner's queue.</div>
                <div className="adm-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label>Customer name</label>
                    <input type="text" id="op-req-name" placeholder="Full name" value={reqName} onChange={(e) => setReqName(e.target.value)} />
                  </div>
                  <div>
                    <label>Phone</label>
                    <input type="text" id="op-req-phone" placeholder="08xx-xxxx-xxxx" value={reqPhone} onChange={(e) => setReqPhone(e.target.value)} />
                  </div>
                </div>
                <div className="btn sm primary" style={{ width: "100%", marginTop: "10px" }} onClick={submitRequest}>Submit request</div>
                <div id="op-req-status" style={{ fontSize: "11px", color: "var(--green)", marginTop: "10px", display: S.opReqStatus ? "block" : "none" }}>{S.opReqStatus}</div>
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>Pending with owner</div>
                  <div id="op-req-list" style={{ fontSize: "12.5px" }}><PendingRequests /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="row" style={{ marginBottom: "2px" }}>
            <div className="section-label" style={{ margin: "0" }}>Bookings Today</div>
            <span style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>Starting a session clears the booking from this list</span>
          </div>
          <div className="adm-table card" style={{ padding: "0", overflow: "hidden", marginTop: "8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 0.6fr 0.6fr 1.15fr", gap: "8px", padding: "9px 14px", fontSize: "10.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>TV / Room</span>
              <span>Customer</span>
              <span>Time</span>
              <span>Method</span>
              <span style={{ textAlign: "right" }}>Action</span>
            </div>
            <div id="booking-rows"><BookingRows /></div>
          </div>
          <div className="row" style={{ margin: "26px 0 2px" }}>
            <div className="section-label" style={{ margin: "0" }}>Paid this shift — refunds</div>
            <span className={'pill ' + (pendingRefunds ? 'booked' : 'off')} id="admin-refund-count">{pendingRefunds ? pendingRefunds + ' waiting for owner' : todaysReceipts().length + ' refundable'}</span>
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "8px" }}>You can start a refund here, but you cannot complete it. Every refund goes to the owner and only leaves the drawer once they approve.</div>
          <div className="adm-table card" style={{ padding: "0", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 0.7fr 0.7fr 1.15fr", gap: "8px", padding: "9px 14px", fontSize: "10.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>TV / Room</span>
              <span>Customer</span>
              <span>Paid</span>
              <span>Method</span>
              <span style={{ textAlign: "right" }}>Refund</span>
            </div>
            <div id="admin-refund-rows"><RefundableRows /></div>
          </div>
        </div>
      </div>
    </Page>
  );
}

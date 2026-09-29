import {
  useStore, rupiah, billingFormatClock, billingFormatDuration, personalAmount, personalHours, chargeTotal,
  chargeOpen, billingTogglePause, billingFinish, billingOpenStop, billingOpenStart, bookingStart, adminOpenEditModal,
  refundForReceipt, refundOpen, todaysReceipts, bookingForRoom, invSetState, addonScopeLabel,
  ROOM_META
} from '../store';

/* ---------- one TV / room box on the operator dashboard (billingRenderBox) ---------- */
export function BillingBox({ id, name }) {
  const S = useStore();
  const st = S.billingState[id];
  let pill, pillClass, body, actions;
  if (st && st.running && st.mode === 'personal') {
    const pExtras = chargeTotal(id);
    pill = st.paused ? 'Paused · Personal' : 'Running · Personal';
    pillClass = st.paused ? 'booked' : 'available';
    body = (
      <>
        <div style={{ color: "var(--text-dim)" }}>{st.customer}</div>
        <div className="billing-remaining" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "18px", margin: "4px 0", color: st.paused ? "var(--amber)" : undefined }}>{billingFormatDuration(st.elapsedSec)}</div>
        <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Started {billingFormatClock(st.startedAt)} · <span className="billing-personal-amt">{rupiah(personalAmount(st))}</span> so far · {personalHours(st.elapsedSec)} jam</div>
        {pExtras ? <div style={{ fontSize: "10px", color: "var(--green)", marginTop: "3px" }}>+ {rupiah(pExtras)} on bill</div> : null}
      </>
    );
    actions = (
      <div style={{ display: "flex", gap: "6px" }}>
        <div className="btn sm ghost" style={{ flex: "0 0 30px", padding: "6px 0", fontSize: "15px", lineHeight: "1" }} title="Add snacks / add-ons" onClick={() => chargeOpen(id)}>+</div>
        <div className="btn sm ghost" style={{ flex: "1" }} onClick={() => billingTogglePause(id)}>{st.paused ? 'Resume' : 'Pause'}</div>
        <div className="btn sm primary" style={{ flex: "1.2" }} onClick={() => billingFinish(id)}>Finish</div>
      </div>
    );
  } else if (st && st.running) {
    const extras = chargeTotal(id);
    const done = st.remainingSec <= 0;
    pill = done ? 'Time up' : 'Running';
    pillClass = done ? 'booked' : 'available';
    body = (
      <>
        <div style={{ color: "var(--text-dim)" }}>{st.customer}</div>
        <div className="billing-remaining" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "18px", margin: "4px 0", color: done ? "var(--amber)" : undefined }}>{billingFormatDuration(st.remainingSec)}</div>
        <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>Started {billingFormatClock(st.startedAt)}</div>
        {extras ? <div style={{ fontSize: "10px", color: "var(--green)", marginTop: "3px" }}>+ {rupiah(extras)} on bill</div> : null}
      </>
    );
    actions = (
      <div style={{ display: "flex", gap: "6px" }}>
        <div className="btn sm ghost" style={{ flex: "0 0 32px", padding: "6px 0", fontSize: "15px", lineHeight: "1" }} title="Add snacks / add-ons" onClick={() => chargeOpen(id)}>+</div>
        {done
          ? <div className="btn sm primary" style={{ flex: "1" }} onClick={() => billingFinish(id)}>Finish &amp; pay</div>
          : <div className="btn sm" style={{ flex: "1", background: "var(--red)", color: "#fff", border: "none" }} onClick={() => billingOpenStop(id)}>Stop</div>}
      </div>
    );
  } else {
    pill = 'Idle';
    pillClass = 'off';
    body = 'No active session';
    actions = <div className="btn sm primary" onClick={() => billingOpenStart(id, name)}>Start Billing</div>;
  }
  return (
    <div className="card billing-box" id={id} data-name={name} style={{ padding: "12px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "120px" }}>
      <div>
        <div className="row" style={{ marginBottom: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600" }}>{name}</span>
          {" "}
          <span className={'pill ' + pillClass + ' billing-status-pill'}>{pill}</span>
        </div>
        <div className="billing-body" style={{ fontSize: "11px", color: "var(--text-faint)" }}>{body}</div>
      </div>
      <div className="billing-action-wrap" style={{ marginTop: "10px" }}>{actions}</div>
    </div>
  );
}

/* ---------- Info from owner (opRenderNotices) ---------- */
export function NoticeList() {
  const S = useStore();
  if (!S.ownerNotices.length) {
    return <div style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-faint)" }}>Nothing from the owner right now.</div>;
  }
  return S.ownerNotices.map((n, i) => (
    <div key={i} style={{ padding: "11px 14px", borderBottom: i < S.ownerNotices.length - 1 ? "1px solid var(--border)" : undefined }}>
      <div className="row" style={{ alignItems: "flex-start", gap: "10px" }}>
        <span>
          <span style={{ fontSize: "13px", color: n.unread ? "var(--purple)" : undefined }}>{n.title}</span>
          <span style={{ display: "block", fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>{n.body}</span>
          <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-faint)", marginTop: "5px" }}>{n.at} · to {n.to}</span>
        </span>
        {n.unread ? <span className="pill owner" style={{ fontSize: "9.5px" }}>New</span> : null}
      </div>
    </div>
  ));
}

/* ---------- Low stock on the dashboard ---------- */
export function LowStockList() {
  const S = useStore();
  const low = S.snackStock.filter((it) => it.qty <= it.low);
  if (!low.length) return <div style={{ padding: "11px 14px", fontSize: "12px", color: "var(--text-faint)" }}>All items stocked</div>;
  return low.map((it, i) => (
    <div key={i} className="row" style={{ padding: "11px 14px", fontSize: "13px", borderBottom: i < low.length - 1 ? "1px solid var(--border)" : undefined }}>
      <span>{it.name}</span><span className={'pill ' + (it.qty <= 2 ? 'booked' : 'inuse')}>{it.qty} left</span>
    </div>
  ));
}

/* ---------- Membership requests still with the owner ---------- */
export function PendingRequests() {
  const S = useStore();
  if (!S.memberRequests.length) return <div style={{ fontSize: "11.5px", color: "var(--text-faint)" }}>Nothing pending.</div>;
  return S.memberRequests.map((r, i) => (
    <div key={i} className="row" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <span>{r.name} <span style={{ color: "var(--text-faint)", fontSize: "11px" }}>{r.phone}</span></span>
      <span className="pill booked" style={{ fontSize: "10px" }}>Waiting for owner</span>
    </div>
  ));
}

/* ---------- Bookings Today (bookingRender) ---------- */
export function BookingRows() {
  const S = useStore();
  const list = S.todayBookings;
  if (!list.length) {
    return <div style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-faint)" }}>No bookings waiting — everything today is either running or already paid.</div>;
  }
  return list.map((b, i) => (
    <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 0.6fr 0.6fr 1.15fr", gap: "8px", padding: "10px 14px", fontSize: "12.5px", alignItems: "center", borderBottom: i < list.length - 1 ? "1px solid var(--border)" : undefined }}>
      <span>{b.room}</span>
      <span style={{ color: "var(--text-dim)" }}>{b.cust}{b.memberPhone ? <>{' '}<span className="pill owner" style={{ fontSize: "9px", padding: "2px 6px", verticalAlign: "middle" }}>★</span></> : null}</span>
      <span style={{ color: "var(--text-dim)" }}>{b.time} · {b.hours}j</span>
      <span className={'pill ' + (b.method === 'Cash' ? 'booked' : 'available')} style={{ fontSize: "10px" }}>{b.method}</span>
      <span style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
        <span className="btn sm primary" style={{ fontSize: "10.5px", padding: "5px 10px" }} onClick={() => bookingStart(b.id)}>Start session</span>
        <span className="btn sm ghost" style={{ fontSize: "10.5px", padding: "5px 10px" }} onClick={() => adminOpenEditModal(b.id)}>Edit</span>
      </span>
    </div>
  ));
}

/* ---------- Paid this shift — refunds (adminRenderRefundables) ---------- */
export function RefundableRows() {
  useStore();
  const recs = todaysReceipts();
  if (!recs.length) return <div style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-faint)" }}>No payment closed yet on this shift.</div>;
  return recs.map((r, i) => {
    const ref = refundForReceipt(r.id);
    let action;
    if (!ref) {
      action = <span className="btn sm ghost" style={{ fontSize: "10.5px", padding: "5px 10px", color: "var(--red)" }} onClick={() => refundOpen(r.id)}>Request refund</span>;
    } else if (ref.status === 'pending') {
      action = <span className="pill booked" style={{ fontSize: "10px" }}>Waiting for owner</span>;
    } else {
      action = <span className="pill inuse" style={{ fontSize: "10px" }}>Refunded {rupiah(ref.amount)}</span>;
    }
    return (
      <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 0.7fr 0.7fr 1.15fr", gap: "8px", padding: "10px 14px", fontSize: "12.5px", alignItems: "center", borderBottom: i < recs.length - 1 ? "1px solid var(--border)" : undefined }}>
        <span>{r.room}</span>
        <span style={{ color: "var(--text-dim)" }}>{r.cust}</span>
        <span style={{ color: "var(--text-dim)" }}>{rupiah(r.total)}</span>
        <span className={'pill ' + (r.method === 'Cash' ? 'booked' : 'available')} style={{ fontSize: "10px" }}>{r.method}</span>
        <span style={{ display: "flex", justifyContent: "flex-end" }}>{action}</span>
      </div>
    );
  });
}

/* ---------- Inventory: snacks, read only (snackRenderAll → #snack-rows) ---------- */
export function SnackRows() {
  const S = useStore();
  return S.snackStock.map((it, i) => (
    <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.9fr", gap: "8px", padding: "9px 14px", borderBottom: "1px solid var(--border)", fontSize: "12.5px", alignItems: "center" }}>
      <span>{it.name}</span>
      <span style={{ textAlign: "center", color: it.qty <= it.low ? "var(--red)" : "var(--text)" }}>{it.qty}</span>
      <span style={{ textAlign: "right", color: "var(--text-dim)" }}>{rupiah(it.price)}</span>
    </div>
  ));
}

/* ---------- Add-ons table, shared by the operator and owner views (addonDetailRow) ---------- */
export function AddonRows() {
  const S = useStore();
  return S.addOns.map((a, i) => {
    const last = i === S.addOns.length - 1;
    const left = Math.max(0, (a.units || 0) - (a.booked || 0));
    return (
      <div key={i} style={{ display: "grid", gridTemplateColumns: "1.7fr 0.62fr 0.5fr 0.92fr", gap: "6px", padding: "11px 13px", fontSize: "12.5px", alignItems: "center", borderBottom: last ? undefined : "1px solid var(--border)" }}>
        <span style={{ lineHeight: "1.3" }}>{a.name}</span>
        <span style={{ fontSize: "10.5px", color: "var(--text-faint)", whiteSpace: "nowrap" }}>{addonScopeLabel(a.scope)}</span>
        <span style={{ textAlign: "center", fontSize: "11px", whiteSpace: "nowrap", color: left ? "var(--text-dim)" : "var(--red)" }}>{left}/{a.units || 0}</span>
        <span style={{ textAlign: "right", whiteSpace: "nowrap", fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "14px" }}>{rupiah(a.price)}</span>
      </div>
    );
  });
}

/* ---------- Inventory: TVs & rooms with system state (invRender) ---------- */
export function RoomRows() {
  const S = useStore();
  return S.LIVE_ROOMS.map((room, i) => {
    const st = S.billingState[room.id];
    let sys, cls;
    if (S.roomMaintenance[room.id]) { sys = 'Maintenance'; cls = 'off'; }
    else if (st && st.running) { sys = 'In use'; cls = 'inuse'; }
    else if (bookingForRoom(room.id)) { sys = 'Booked'; cls = 'booked'; }
    else { sys = 'Available'; cls = 'available'; }
    return (
      <div key={room.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr 0.85fr 1fr", gap: "8px", padding: "10px 14px", fontSize: "12.5px", alignItems: "center", borderBottom: i < S.LIVE_ROOMS.length - 1 ? "1px solid var(--border)" : undefined }}>
        <span>{room.name}<span style={{ display: "block", fontSize: "10px", color: "var(--cyan)", marginTop: "2px" }}>{rupiah(room.rate)}/jam</span></span>
        <span style={{ color: "var(--text-dim)" }}>{ROOM_META[room.id].amen}</span>
        <span className={'pill ' + cls} style={{ justifySelf: "start" }}>{sys}</span>
        <select value={S.roomMaintenance[room.id] ? 'maintenance' : 'available'} onChange={(e) => invSetState(room.id, e.target.value)}>
          <option value="available">Available</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>
    );
  });
}


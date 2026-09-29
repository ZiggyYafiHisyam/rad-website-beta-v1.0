/* Every popup from the prototype. They lived at the end of <body> and were
   toggled with display:none / flex; here each renders while its entry in
   S.ui is set, so any page (and any store action) can open it. */
import {
  useStore, notify, rupiah, STAT_MONTHS, ADDON_SCOPES, MEMBER_POINT_CAP,
  orderClose, coStep, orderToPayment, ownerTodoClose, ownerTodoDone, pinnedFeedbacks,
  cpayCancel, cpaySelect, cpayConfirm,
  billingCloseModal, billingSetMode, billingStep, billingConfirmStart, billingConfirmStop,
  adminCloseEditModal, adminShowDeleteReason, adminConfirmDelete, adminSaveEdit,
  ownerCloseAudit, auditRows, statCloseDatePicker, statPickDate,
  ownerCloseOperatorEditor, ownerEditorAddOperator, ownerEditorRemoveOperator, ownerSaveOperators,
  ownerCloseMemberEditor, ownerSaveMember, ownerDeleteMemberFromModal, ownerMemberIndex, memberLedger,
  ownerCloseReject, ownerConfirmReject,
  ownerCloseRateEditor, ownerSaveRates,
  refundClose, refundSubmit, refundById, refundDecideClose, refundApprove, refundRejectStep,
  ownerCloseAddonEditor, ownerEditorAddAddon, ownerEditorRemoveAddon, ownerSaveAddons,
  ownerCloseSnackEditor, ownerEditorAddSnack, ownerEditorRemoveSnack, ownerSaveSnacks,
  ownerCloseRewardEditor, ownerEditorAddReward, ownerEditorRemoveReward, ownerSaveRewards,
  chargeClose, chargeStep, chargeConfirm, chargeFits, addonFree,
  payCancel, paySelect, payConfirm, payTotal, payMemberSearchSet, payMemberHits, payMemberAttach, payMemberClear,
  memberByPhone, memberHeadroom, pointsFor, pointRateLabel, docClose
} from '../store';
import DocBody, { RefundDoc } from './DocBody';

const closeX = { cursor: "pointer", color: "var(--text-faint)", fontSize: "20px", lineHeight: "1" };
const removeX = { cursor: "pointer", color: "var(--red)", textAlign: "center", fontSize: "16px" };
const faintHead = { fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" };

function overlay(bg, z, padding) {
  const st = { display: "flex", position: "fixed", inset: "0", background: "rgba(0,0,0," + bg + ")", zIndex: z, alignItems: "center", justifyContent: "center" };
  if (padding) st.padding = padding;
  return st;
}

/* − qty + stepper used by the order and add-to-session popups */
function Stepper({ qty, max, onStep }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "8px", justifySelf: "end" }}>
      <span className="btn sm ghost" style={{ padding: "2px 9px", fontSize: "14px", lineHeight: "1.2", opacity: qty ? undefined : "0.4" }} onClick={() => onStep(-1)}>−</span>
      <span style={{ width: "16px", textAlign: "center", fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "14px" }}>{qty}</span>
      <span className="btn sm ghost" style={{ padding: "2px 9px", fontSize: "14px", lineHeight: "1.2", opacity: qty < max ? undefined : "0.4" }} onClick={() => onStep(1)}>+</span>
    </span>
  );
}

/* QRIS panel shown next to a payment popup */
function QrisPanel({ total, reference }) {
  return (
    <>
      <div className="section-label" style={{ margin: "0 0 4px" }}>QRIS · GoPay Merchant</div>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>Show this screen to the customer.</div>
      <div className="qr-box" style={{ width: "170px", height: "170px", margin: "0 auto 14px" }}>
        <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="#5FB2FF" strokeWidth="1.4">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM19 14h2M14 19h3M19 18v3h2" />
        </svg>
      </div>
      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "24px", lineHeight: "1" }}>{rupiah(total)}</div>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", margin: "6px 0 14px" }}>RAD PLAYSTATION · {reference}</div>
      <span className="pill booked" style={{ fontSize: "9.5px" }}>Waiting for payment</span>
      <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "14px", lineHeight: "1.5" }}>Only press “Mark as paid” after the amount shows up on the GoPay merchant app.</div>
    </>
  );
}

/* ============ ORDER (snacks, no room) ============ */
function OrderModal() {
  const S = useStore();
  const o = S.ui.order;
  if (!o) return null;
  let total = 0;
  S.snackStock.forEach((s, i) => { total += (o.draft.snack[i] || 0) * s.price; });
  return (
    <div id="order-modal" style={overlay('0.6', "60")}>
      <div style={{ width: "420px", maxHeight: "88vh", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="row" style={{ marginBottom: "4px", flexShrink: "0" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Order — snacks</div>
          <span style={closeX} onClick={orderClose}>×</span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px", flexShrink: "0" }}>Snack sale on its own — not tied to any TV or room bill. Stock is taken once the payment is confirmed.</div>
        <label style={{ fontSize: "11px", color: "var(--text-faint)", display: "block", marginBottom: "4px", flexShrink: "0" }}>Customer name (optional)</label>
        <input type="text" id="co-customer-name" placeholder="Walk-in" style={{ marginBottom: "14px", flexShrink: "0" }} value={o.customer} onChange={(e) => { o.customer = e.target.value; notify(); }} />
        <div className="section-label" style={{ margin: "0 0 4px", flexShrink: "0" }}>Snacks</div>
        <div id="co-snack-rows" style={{ overflowY: "auto", flex: "1", minHeight: "150px" }}>
          {S.snackStock.map((s, i) => {
            const qty = o.draft.snack[i] || 0;
            const out = s.qty <= 0;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 1fr", gap: "8px", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px", opacity: out ? "0.45" : undefined }}>
                <span>{s.name}</span>
                <span style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>{rupiah(s.price)} · sisa {s.qty}</span>
                {out
                  ? <span style={{ justifySelf: "end", fontSize: "10.5px", color: "var(--red)" }}>Habis</span>
                  : <Stepper qty={qty} max={s.qty} onStep={(d) => coStep('snack', i, d)} />}
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "12px", flexShrink: "0" }}>
          <div className="row" style={{ marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>Total</span>
            {" "}
            <span id="co-total" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "17px" }}>{rupiah(total)}</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div className="btn sm ghost" style={{ flex: "1" }} onClick={orderClose}>Cancel</div>
            <div className="btn sm primary" style={{ flex: "2" }} onClick={orderToPayment}>Continue to payment</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ OWNER: TO-DO LIST ============ */
function TodoModal() {
  const S = useStore();
  if (!S.ui.todo) return null;
  const pinned = pinnedFeedbacks();
  return (
    <div id="todo-modal" style={overlay('0.7', "90", "24px")}>
      <div style={{ width: "380px", maxHeight: "80vh", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column" }}>
        <div className="row" style={{ marginBottom: "3px", flexShrink: "0" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#5FB2FF" stroke="#5FB2FF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5" />
              <path d="M9 3h6l-1 6 3 3H7l3-3-1-6z" />
            </svg>
            <span className="h-title" style={{ fontSize: "16px" }}>To-do list</span>
          </span>
          {" "}
          <span style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <span className="pill owner" id="owner-todo-count">{pinned.length} pinned</span>
            {" "}
            <span style={closeX} onClick={ownerTodoClose}>×</span>
          </span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px", flexShrink: "0" }}>Feedback you pinned on Reports. Check it off when it’s handled.</div>
        <div id="owner-todo-list" style={{ overflowY: "auto", flex: "1" }}>
          {!pinned.length
            ? <div style={{ padding: "16px 0", fontSize: "11.5px", color: "var(--text-faint)", textAlign: "center" }}>Nothing pinned. Pin a feedback on Reports and it lands here.</div>
            : pinned.map((f) => (
              <div key={f.id} className="card" style={{ display: "flex", gap: "11px", alignItems: "flex-start", padding: "11px 12px", marginBottom: "6px" }}>
                <span style={{ flex: "0 0 42px", fontFamily: "'Rajdhani',sans-serif", fontWeight: "600", fontSize: "12px", color: "var(--blue-bright)", paddingTop: "1px" }}>{f.date}</span>
                <span style={{ flex: "1", fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.5" }}>“{f.text}”</span>
                <span title="Mark as done" style={{ flex: "0 0 26px", height: "26px", borderRadius: "7px", border: "1px solid rgba(58,214,133,0.45)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => ownerTodoDone(f.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ============ COUNTER PAYMENT ============ */
function CpayModal() {
  const S = useStore();
  const c = S.ui.cpay;
  if (!c) return null;
  const sn = c.items.filter((i) => i.kind === 'snack');
  const ad = c.items.filter((i) => i.kind === 'addon');
  return (
    <div id="cpay-modal" style={overlay('0.7', "82", "20px")}>
      <div style={{ display: "flex", gap: "14px", alignItems: "stretch", maxHeight: "88vh" }}>
        <div style={{ width: "400px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px", overflowY: "auto" }}>
          <div className="row" style={{ marginBottom: "2px" }}>
            <div className="h-title" style={{ fontSize: "16px" }} id="cpay-title">Counter order payment</div>
            <span style={closeX} onClick={cpayCancel}>×</span>
          </div>
          <div id="cpay-sub" style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "14px" }}>Counter · {c.cust} · {c.opened} · {S.activeOperator}</div>
          <div className="card" style={{ padding: "12px 14px" }}>
            <div id="cpay-lines">
              {sn.length ? (
                <>
                  <div style={faintHead}>Snacks</div>
                  {sn.map((i, n) => <div key={n} className="doc-line"><span style={{ color: "var(--text-dim)" }}>{i.name} ×{i.qty}</span><span>{rupiah(i.qty * i.price)}</span></div>)}
                </>
              ) : null}
              {ad.length ? (
                <>
                  <div style={{ ...faintHead, marginTop: "8px" }}>Add-ons</div>
                  {ad.map((i, n) => <div key={n} className="doc-line"><span style={{ color: "var(--text-dim)" }}>{i.name} ×{i.qty}</span><span>{rupiah(i.qty * i.price)}</span></div>)}
                </>
              ) : null}
              <div className="doc-line total"><span>Total payment</span><span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "17px" }}>{rupiah(c.total)}</span></div>
            </div>
          </div>
          <div className="section-label" style={{ margin: "16px 0 8px" }}>How is the customer paying?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className={'btn ghost payment-method-btn' + (c.method === 'Cash' ? ' selected' : '')} id="cpay-btn-cash" onClick={() => cpaySelect('Cash')}>Cash</div>
            <div className={'btn ghost payment-method-btn' + (c.method === 'QRIS' ? ' selected' : '')} id="cpay-btn-qris" onClick={() => cpaySelect('QRIS')}>QRIS</div>
          </div>
          <div className="btn primary" style={{ marginTop: "14px" }} onClick={cpayConfirm}>Mark as paid & send receipt</div>
        </div>
        {c.method === 'QRIS' ? (
          <div id="cpay-qris-panel" style={{ display: "block", width: "280px", background: "var(--bg-panel)", border: "1px solid var(--blue)", borderRadius: "14px", padding: "20px", textAlign: "center", overflowY: "auto" }}>
            <QrisPanel total={c.total} reference={c.ref} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ============ MODAL: BILLING TIMER ============ */
function BillingModal() {
  const S = useStore();
  const m = S.ui.billing;
  if (!m) return null;
  const start = m.stage === 'start';
  return (
    <div id="billing-modal" style={overlay('0.6', "60")}>
      <div style={{ width: "360px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px" }}>
        <div className="row" style={{ marginBottom: "16px" }}>
          <div className="h-title" id="billing-modal-title" style={{ fontSize: "15px" }}>{m.title}</div>
          <span style={closeX} onClick={billingCloseModal}>×</span>
        </div>
        <div id="billing-modal-start-fields" style={{ display: start ? "block" : "none" }}>
          {start ? (
            <>
              <label>Customer name</label>
              <input type="text" id="billing-customer-name" placeholder="Customer name" style={{ marginBottom: "14px" }} value={m.customer} onChange={(e) => { m.customer = e.target.value; notify(); }} />
              <label>How is this session billed?</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "6px" }}>
                <div className={'btn ghost payment-method-btn' + (m.mode === 'fixed' ? ' selected' : '')} id="billing-mode-fixed" onClick={() => billingSetMode('fixed')}>Fixed timer</div>
                <div className={'btn ghost payment-method-btn' + (m.mode === 'personal' ? ' selected' : '')} id="billing-mode-personal" onClick={() => billingSetMode('personal')}>Personal</div>
              </div>
              <div id="billing-mode-hint" style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px", lineHeight: "1.5" }}>
                {m.mode === 'personal'
                  ? 'Open-ended stopwatch — the bill grows with the time played, paid when the customer finishes.'
                  : 'Countdown from a set duration — paid up front or at the end.'}
              </div>
              <div id="billing-fixed-fields" style={{ display: m.mode === 'fixed' ? "block" : "none" }}>
                <label>Duration (jam)</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span className="btn sm ghost" style={{ padding: "4px 12px", fontSize: "15px" }} onClick={() => billingStep(-1)}>−</span>
                  {" "}
                  <span id="billing-duration-hours" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "18px", width: "30px", textAlign: "center", display: "inline-block" }}>{m.hours}</span>
                  {" "}
                  <span className="btn sm ghost" style={{ padding: "4px 12px", fontSize: "15px" }} onClick={() => billingStep(1)}>+</span>
                  {" "}
                  <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>jam</span>
                </div>
              </div>
              <div id="billing-personal-fields" style={{ display: m.mode === 'personal' ? "block" : "none", marginBottom: "16px" }}>
                <div className="card" style={{ padding: "11px 13px", fontSize: "11.5px", color: "var(--text-dim)", lineHeight: "1.6" }}>
                  {"Stopwatch counts up. Billed per half hour, minimum 1 jam, at "}
                  <span id="billing-personal-rate">{rupiah(m.personalRate)}</span>
                  {" / jam. You can pause it anytime and still add snacks while it runs."}
                </div>
              </div>
              <div className="btn primary" onClick={billingConfirmStart}>Confirm start billing</div>
            </>
          ) : null}
        </div>
        <div id="billing-modal-stop-fields" style={{ display: start ? "none" : "block" }}>
          {!start ? (
            <>
              <div id="billing-stop-summary" style={{ fontSize: "12.5px", color: "var(--text-dim)", marginBottom: "12px" }}>{m.summary}</div>
              <label>Reason for stopping</label>
              <input type="text" id="billing-stop-reason" placeholder="e.g. customer finished early" style={{ marginBottom: "12px" }} value={m.reason} onChange={(e) => { m.reason = e.target.value; notify(); }} />
              <div className="btn" style={{ background: "var(--red)", color: "#fff", border: "none" }} onClick={billingConfirmStop}>Confirm stop</div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ============ MODAL: EDIT BOOKING (admin) ============ */
function AdminEditModal() {
  const S = useStore();
  const ed = S.ui.adminEdit;
  if (!ed) return null;
  const set = (k) => (e) => { ed[k] = e.target.value; notify(); };
  return (
    <div id="admin-edit-modal" style={overlay('0.6', "50")}>
      <div style={{ width: "380px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px" }}>
        <div className="row" style={{ marginBottom: "16px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Edit booking</div>
          <span style={closeX} onClick={adminCloseEditModal}>×</span>
        </div>
        <label>TV / Room</label>
        <div id="admin-edit-tv" style={{ padding: "9px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", color: "var(--text-dim)", marginBottom: "10px" }}>{ed.booking.room}</div>
        <label>Customer name</label>
        <input type="text" id="admin-edit-name" style={{ marginBottom: "10px" }} value={ed.name} onChange={set('name')} />
        <label>Time</label>
        <input type="text" id="admin-edit-time" style={{ marginBottom: "10px" }} value={ed.time} onChange={set('time')} />
        <label>Method</label>
        <select id="admin-edit-method" value={ed.method} onChange={set('method')}>
          <option value="Cash">Cash di Lokasi</option>
          <option value="QRIS">QRIS</option>
        </select>
        <div id="admin-edit-method-note-wrap" style={{ display: ed.method !== ed.originalMethod ? "block" : "none", marginTop: "8px" }}>
          <label>Note (why the method changed)</label>
          <input type="text" id="admin-edit-method-note" placeholder="e.g. customer switched to QRIS on arrival" value={ed.methodNote} onChange={set('methodNote')} />
        </div>
        <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0 12px" }} />
        <div id="admin-delete-trigger" className="row" style={{ cursor: "pointer" }} onClick={adminShowDeleteReason}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--red)", fontSize: "13px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" />
            </svg>
            Delete booking
          </span>
        </div>
        <div id="admin-delete-reason-wrap" style={{ display: ed.showDelete ? "block" : "none", marginTop: "10px" }}>
          <label>Reason for deletion</label>
          <input type="text" id="admin-delete-reason" placeholder="e.g. customer no-show, requested refund" value={ed.deleteReason} onChange={set('deleteReason')} />
          <div className="btn" style={{ marginTop: "8px", background: "var(--red)", color: "#fff", border: "none" }} onClick={adminConfirmDelete}>Confirm delete</div>
        </div>
        <div className="btn primary" style={{ marginTop: "18px" }} onClick={adminSaveEdit}>Save changes</div>
      </div>
    </div>
  );
}

/* ============ MODAL: AUDIT LOG DETAILS ============ */
function AuditModal() {
  const S = useStore();
  if (S.ui.audit === null) return null;
  const e = S.auditLog.find((x) => x.id === S.ui.audit);
  if (!e) return null;
  return (
    <div id="audit-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "400px", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "6px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Log details</div>
          <span style={closeX} onClick={ownerCloseAudit}>×</span>
        </div>
        <div id="audit-modal-body">
          <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "12px" }}>{e.room} · {e.action}</div>
          {auditRows(e).map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <span style={{ flex: "0 0 132px", fontSize: "11px", color: "var(--text-faint)" }}>{r[0]}</span>
              <span style={{ flex: "1", fontSize: "12.5px", textAlign: "right" }}>{r[1]}</span>
            </div>
          ))}
        </div>
        <div className="btn ghost" style={{ marginTop: "16px" }} onClick={ownerCloseAudit}>Close</div>
      </div>
    </div>
  );
}

/* ============ MODAL: SELECT DATE ============ */
function StatDateModal() {
  const S = useStore();
  if (!S.ui.statDate) return null;
  const m = STAT_MONTHS[S.statMonthIdx];
  const days = [];
  for (let d = 1; d <= m.days; d++) days.push(d);
  return (
    <div id="stat-date-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "360px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "14px" }}>
          <div className="h-title" id="stat-date-title" style={{ fontSize: "15px" }}>Select date · {m.label}</div>
          <span style={closeX} onClick={statCloseDatePicker}>×</span>
        </div>
        <div id="stat-date-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "6px" }}>
          {days.map((day) => {
            const sel = S.statRange.type === 'date' && S.statRange.d === day;
            return (
              <div key={day} style={{ textAlign: "center", padding: "9px 0", fontSize: "12.5px", borderRadius: "7px", cursor: "pointer", background: sel ? "var(--blue-bright)" : "var(--surface)", color: sel ? "#04101f" : "var(--text)", border: "1px solid var(--border)" }}
                onClick={() => statPickDate(day)}>{day}</div>
            );
          })}
        </div>
        <div className="btn ghost" style={{ marginTop: "14px" }} onClick={statCloseDatePicker}>Cancel</div>
      </div>
    </div>
  );
}

/* ============ MODAL: EDIT OPERATORS ============ */
function OperatorModal() {
  const S = useStore();
  const draft = S.ui.operatorEditor;
  if (!draft) return null;
  return (
    <div id="operator-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "400px", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Edit operators</div>
          <span style={closeX} onClick={ownerCloseOperatorEditor}>×</span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>Change any operator's account name or password, or remove the account.</div>
        <div id="operator-editor-rows">
          {!draft.length
            ? <div style={{ fontSize: "11.5px", color: "var(--text-faint)" }}>No operator accounts.</div>
            : draft.map((op, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 26px", gap: "6px", alignItems: "center", marginBottom: "7px" }}>
                <input type="text" value={op.name} placeholder="Name" onChange={(e) => { op.name = e.target.value; notify(); }} />
                <input type="text" value={op.pass} placeholder="Password" onChange={(e) => { op.pass = e.target.value; notify(); }} />
                <span style={removeX} onClick={() => ownerEditorRemoveOperator(i)}>×</span>
              </div>
            ))}
        </div>
        <div className="btn ghost" style={{ marginTop: "10px", fontSize: "12px" }} onClick={ownerEditorAddOperator}>+ Add operator</div>
        <div className="btn primary" style={{ marginTop: "10px" }} onClick={ownerSaveOperators}>Save operators</div>
      </div>
    </div>
  );
}

/* ============ MODAL: EDIT MEMBER ============ */
function MemberModal() {
  const S = useStore();
  const ed = S.ui.memberEditor;
  if (!ed) return null;
  const i = ownerMemberIndex(ed.phone);
  const m = i < 0 ? null : S.ownerMembers[i];
  const log = m ? memberLedger(m) : [];
  const set = (k) => (e) => { ed[k] = e.target.value; notify(); };
  return (
    <div id="member-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "380px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Edit member</div>
          <span style={closeX} onClick={ownerCloseMemberEditor}>×</span>
        </div>
        <div id="member-modal-joined" style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>{m ? 'Joined ' + m.joined + ' · joined date cannot be changed' : ''}</div>
        <label>Name</label>
        <input type="text" id="member-edit-name" value={ed.name} onChange={set('name')} />
        <label>Phone number</label>
        <input type="text" id="member-edit-phone" value={ed.phoneInput} onChange={set('phoneInput')} />
        <label>Total points (max 300)</label>
        <input type="text" id="member-edit-points" value={ed.points} onChange={set('points')} />
        <div className="btn primary" style={{ marginTop: "16px" }} onClick={ownerSaveMember}>Save changes</div>
        <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0 10px" }} />
        <div className="section-label" style={{ margin: "0 0 7px" }}>Point history</div>
        <div id="member-ledger-rows" style={{ maxHeight: "160px", overflowY: "auto" }}>
          {!log.length
            ? <div style={{ fontSize: "11.5px", color: "var(--text-faint)" }}>No points earned yet.</div>
            : log.map((l, n) => (
              <div key={n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>{l.source}
                  <span style={{ display: "block", fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>{l.at}{l.dropped ? ' · ' + l.dropped + ' dropped at cap' : ''}</span></span>
                <span className={'pill ' + (l.pts > 0 ? 'available' : (l.pts < 0 ? 'inuse' : 'off'))} style={{ fontSize: "10px", whiteSpace: "nowrap" }}>{(l.pts > 0 ? '+' : '') + l.pts}</span>
              </div>
            ))}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0 12px" }} />
        <div className="btn" style={{ background: "transparent", color: "var(--red)", borderColor: "rgba(255,92,122,0.35)" }} onClick={ownerDeleteMemberFromModal}>Delete member</div>
      </div>
    </div>
  );
}

/* ============ MODAL: REJECT REASON ============ */
function RejectModal() {
  const S = useStore();
  const rj = S.ui.reject;
  if (!rj) return null;
  const r = S.memberRequests.find((x) => x.id === rj.id);
  return (
    <div id="reject-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "380px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Reject request</div>
          <span style={closeX} onClick={ownerCloseReject}>×</span>
        </div>
        <div id="reject-modal-who" style={{ fontSize: "11.5px", color: "var(--text-dim)", marginBottom: "14px" }}>{r ? r.name + ' · ' + r.phone + ' · requested by ' + r.by : ''}</div>
        <label>Reason for rejection</label>
        <textarea id="reject-reason" rows="3" placeholder="e.g. phone number already registered under another member" value={rj.reason} onChange={(e) => { rj.reason = e.target.value; notify(); }} />
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "8px" }}>This reason is sent to the operator's dashboard under “Info from owner”.</div>
        <div className="btn" style={{ marginTop: "14px", background: "var(--red)", color: "#fff", border: "none" }} onClick={ownerConfirmReject}>Reject & notify operator</div>
      </div>
    </div>
  );
}

/* ============ MODAL: EDIT TV / ROOM RATES ============ */
function RateModal() {
  const S = useStore();
  const ed = S.ui.rateEditor;
  if (!ed) return null;
  return (
    <div id="rate-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "430px", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Edit TV & Room rates</div>
          <span style={closeX} onClick={ownerCloseRateEditor}>×</span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>Rates are per hour. A running session keeps the rate it started on — the new rate applies to the next booking.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "8px", paddingBottom: "7px", borderBottom: "1px solid var(--border)", fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          <span>TV / Room</span>
          <span>Weekday</span>
          <span>Weekend</span>
        </div>
        <div id="rate-editor-rows">
          {ed.rows.map((r, i) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "8px", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "12.5px" }}>{r.name}</span>
              <input type="text" value={r.rate} onChange={(e) => { r.rate = e.target.value; notify(); }} />
              <input type="text" value={r.weekend} onChange={(e) => { r.weekend = e.target.value; notify(); }} />
            </div>
          ))}
        </div>
        <div id="rate-editor-warn" style={{ display: ed.warn ? "block" : "none", fontSize: "10.5px", color: "var(--amber)", marginTop: "10px" }}>{ed.warn}</div>
        <div className="btn primary" style={{ marginTop: "12px" }} onClick={ownerSaveRates}>Save rates</div>
      </div>
    </div>
  );
}

/* ============ MODAL: REQUEST REFUND (admin) ============ */
function RefundModal() {
  const S = useStore();
  const ctx = S.ui.refund;
  if (!ctx) return null;
  const rec = ctx.rec;
  return (
    <div id="refund-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "400px", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Request refund</div>
          <span style={closeX} onClick={refundClose}>×</span>
        </div>
        <div id="refund-modal-who" style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>{rec.id + ' · ' + rec.room + ' · ' + rec.cust + ' · ' + rec.at}</div>
        <div id="refund-modal-lines" style={{ marginBottom: "14px" }}>
          <div className="doc-line"><span style={{ color: "var(--text-faint)" }}>Paid</span><span>{rupiah(rec.total) + ' · ' + rec.method}</span></div>
          {rec.roomAmt ? <div className="doc-line"><span style={{ color: "var(--text-dim)" }}>Main {rec.hours} jam</span><span>{rupiah(rec.roomAmt)}</span></div> : null}
          {(rec.charges || []).map((c, i) => (
            <div key={i} className="doc-line"><span style={{ color: "var(--text-dim)" }}>{c.name} ×{c.qty}</span><span>{rupiah(c.qty * c.price)}</span></div>
          ))}
          {rec.pts ? <div className="doc-line"><span style={{ color: "var(--amber)" }}>Member poin</span><span style={{ color: "var(--amber)" }}>{rec.pts} pts will be pulled back</span></div> : null}
        </div>
        <label>Refund amount</label>
        <input type="text" id="refund-amount" placeholder="Rp" value={ctx.amount} onChange={(e) => { ctx.amount = e.target.value; notify(); }} />
        <div id="refund-amount-hint" style={{ fontSize: "10px", color: "var(--text-faint)", margin: "5px 0 12px" }}>Full refund is {rupiah(rec.total)}. Type a smaller number for a partial refund.</div>
        <label>Reason</label>
        <input type="text" id="refund-reason" placeholder="e.g. PS mati 30 menit, customer minta refund" value={ctx.reason} onChange={(e) => { ctx.reason = e.target.value; notify(); }} />
        <div style={{ background: "rgba(139,107,255,0.1)", border: "1px solid rgba(139,107,255,0.3)", borderRadius: "8px", padding: "10px 12px", fontSize: "11px", color: "var(--text-dim)", marginTop: "14px", lineHeight: "1.5" }}>
          You cannot refund this yourself. Submitting sends it to the owner — the money only leaves the drawer after they approve.
        </div>
        <div className="btn primary" style={{ marginTop: "14px" }} onClick={refundSubmit}>Submit to owner</div>
        <div className="btn ghost" style={{ marginTop: "8px" }} onClick={refundClose}>Cancel</div>
      </div>
    </div>
  );
}

/* ============ MODAL: REFUND DECISION (owner) ============ */
function RefundDecideModal() {
  const S = useStore();
  const d = S.ui.refundDecide;
  if (!d) return null;
  const r = refundById(d.id);
  if (!r) return null;
  return (
    <div id="refund-decide-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "400px", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Refund request</div>
          <span style={closeX} onClick={refundDecideClose}>×</span>
        </div>
        <div id="refund-decide-body"><RefundDoc r={r} /></div>
        <div id="refund-reject-wrap" style={{ display: d.showReject ? "block" : "none", marginTop: "12px" }}>
          <label>Why are you rejecting this?</label>
          {d.showReject
            ? <input type="text" id="refund-reject-reason" placeholder="The operator will see this note" autoFocus value={d.note} onChange={(e) => { d.note = e.target.value; notify(); }} />
            : null}
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <div className="btn primary" style={{ flex: "1" }} onClick={refundApprove}>Approve refund</div>
          <div className="btn ghost" style={{ flex: "1", color: "var(--red)" }} onClick={refundRejectStep}>Reject</div>
        </div>
      </div>
    </div>
  );
}

/* ============ MODAL: EDIT ADD-ONS ============ */
function AddonEditorModal() {
  const S = useStore();
  const draft = S.ui.addonEditor;
  if (!draft) return null;
  return (
    <div id="addon-editor-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "420px", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Edit add-ons</div>
          <span style={closeX} onClick={ownerCloseAddonEditor}>×</span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>Fits decides which TV/Room sees the add-on. Units is how many you physically own — customers can't book past what's free.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1.05fr 0.85fr 0.6fr 24px", gap: "6px", fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
          <span>Add-on</span>
          <span>Fits</span>
          <span>Price</span>
          <span>Units</span>
          <span />
        </div>
        <div id="addon-editor-rows">
          {draft.map((a, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.35fr 1.05fr 0.85fr 0.6fr 24px", gap: "6px", alignItems: "center", marginBottom: "7px" }}>
              <input type="text" value={a.name} placeholder="Add-on" onChange={(e) => { a.name = e.target.value; notify(); }} />
              <select value={a.scope} onChange={(e) => { a.scope = e.target.value; notify(); }}>
                {ADDON_SCOPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <input type="text" value={a.price} onChange={(e) => { a.price = e.target.value; notify(); }} />
              <input type="text" value={a.units} onChange={(e) => { a.units = e.target.value; notify(); }} />
              <span style={removeX} onClick={() => ownerEditorRemoveAddon(i)}>×</span>
            </div>
          ))}
        </div>
        <div className="btn ghost" style={{ marginTop: "10px", fontSize: "12px" }} onClick={ownerEditorAddAddon}>+ Add add-on</div>
        <div className="btn primary" style={{ marginTop: "10px" }} onClick={ownerSaveAddons}>Save add-ons</div>
      </div>
    </div>
  );
}

/* ============ MODAL: EDIT SNACKS ============ */
function SnackEditorModal() {
  const S = useStore();
  const draft = S.ui.snackEditor;
  if (!draft) return null;
  return (
    <div id="snack-editor-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "420px", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Edit snacks</div>
          <span style={closeX} onClick={ownerCloseSnackEditor}>×</span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>Stock counts and prices here are what operators see — they cannot change them.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.5fr 0.8fr 0.8fr 26px", gap: "6px", fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
          <span>Item</span>
          <span>Qty</span>
          <span>Beli</span>
          <span>Jual</span>
          <span />
        </div>
        <div id="snack-editor-rows">
          {draft.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 0.5fr 0.8fr 0.8fr 26px", gap: "6px", alignItems: "center", marginBottom: "7px" }}>
              <input type="text" value={s.name} placeholder="Item" onChange={(e) => { s.name = e.target.value; notify(); }} />
              <input type="text" value={s.qty} onChange={(e) => { s.qty = e.target.value; notify(); }} />
              <input type="text" value={s.cost} onChange={(e) => { s.cost = e.target.value; notify(); }} />
              <input type="text" value={s.price} onChange={(e) => { s.price = e.target.value; notify(); }} />
              <span style={removeX} onClick={() => ownerEditorRemoveSnack(i)}>×</span>
            </div>
          ))}
        </div>
        <div className="btn ghost" style={{ marginTop: "10px", fontSize: "12px" }} onClick={ownerEditorAddSnack}>+ Add item</div>
        <div className="btn primary" style={{ marginTop: "10px" }} onClick={ownerSaveSnacks}>Save snacks</div>
      </div>
    </div>
  );
}

/* ============ MODAL: EDIT REWARDS ============ */
function RewardEditorModal() {
  const S = useStore();
  const ed = S.ui.rewardEditor;
  if (!ed) return null;
  return (
    <div id="reward-editor-modal" style={overlay('0.65', "70", "20px")}>
      <div style={{ width: "420px", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" style={{ fontSize: "15px" }}>Edit rewards</div>
          <span style={closeX} onClick={ownerCloseRewardEditor}>×</span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>Members cap at 300 points, so no reward can cost more than 300.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.5fr 26px", gap: "6px", fontSize: "9.5px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
          <span>Reward</span>
          <span>Pts</span>
          <span />
        </div>
        <div className="card" style={{ padding: "11px 13px", marginBottom: "14px" }}>
          <div className="section-label" style={{ margin: "0 0 8px" }}>Earn rate — TV / Room time only</div>
          <div style={{ display: "grid", gridTemplateColumns: "0.7fr auto 1fr", gap: "8px", alignItems: "center" }}>
            <input type="text" id="earn-rate-pts" style={{ marginBottom: "0" }} value={ed.pts} onChange={(e) => { ed.pts = e.target.value; notify(); }} />
            {" "}
            <span style={{ fontSize: "11px", color: "var(--text-faint)", whiteSpace: "nowrap" }}>poin per Rp</span>
            {" "}
            <input type="text" id="earn-rate-rp" style={{ marginBottom: "0" }} value={ed.rp} onChange={(e) => { ed.rp = e.target.value; notify(); }} />
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "7px" }}>Snacks, add-ons and counter orders never earn points.</div>
        </div>
        <div id="reward-editor-rows">
          {ed.rows.map((rw, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 0.5fr 26px", gap: "6px", alignItems: "center", marginBottom: "7px" }}>
              <input type="text" value={rw.name} placeholder="Reward" onChange={(e) => { rw.name = e.target.value; notify(); }} />
              <input type="text" value={rw.cost} placeholder="Pts" onChange={(e) => { rw.cost = e.target.value; notify(); }} />
              <span style={removeX} onClick={() => ownerEditorRemoveReward(i)}>×</span>
            </div>
          ))}
        </div>
        <div className="btn ghost" style={{ marginTop: "10px", fontSize: "12px" }} onClick={ownerEditorAddReward}>+ Add reward</div>
        <div className="btn primary" style={{ marginTop: "10px" }} onClick={ownerSaveRewards}>Save rewards</div>
      </div>
    </div>
  );
}

/* ============ MODAL: ADD TO SESSION (snacks / add-ons) ============ */
function ChargeModal() {
  const S = useStore();
  const ch = S.ui.charge;
  if (!ch) return null;
  const boxId = ch.boxId;
  let sum = 0;
  S.snackStock.forEach((s, i) => { sum += (ch.draft.snack[i] || 0) * s.price; });
  const addonRows = [];
  S.addOns.forEach((a, i) => {
    if (!chargeFits(a, boxId)) return;
    const free = addonFree(a);
    const qty = ch.draft.addon[i] || 0;
    sum += qty * a.price;
    addonRows.push(
      <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 1fr", gap: "8px", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px", opacity: free ? undefined : "0.45" }}>
        <span>{a.name}</span>
        <span style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>{rupiah(a.price)} · sisa {free}</span>
        {free
          ? <Stepper qty={qty} max={free} onStep={(d) => chargeStep('addon', i, d)} />
          : <span style={{ justifySelf: "end", fontSize: "10.5px", color: "var(--red)" }}>Terpakai semua</span>}
      </div>
    );
  });
  return (
    <div id="charge-modal" style={overlay('0.65', "75", "20px")}>
      <div style={{ width: "440px", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
        <div className="row" style={{ marginBottom: "4px" }}>
          <div className="h-title" id="charge-modal-title" style={{ fontSize: "15px" }}>{ch.title}</div>
          <span style={closeX} onClick={chargeClose}>×</span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>Charged onto the running bill — the customer pays it all at the counter when the session ends.</div>
        <div className="section-label" style={{ margin: "0 0 7px" }}>Snacks</div>
        <div id="charge-snack-rows">
          {S.snackStock.map((s, i) => {
            const qty = ch.draft.snack[i] || 0;
            const out = s.qty <= 0;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 1fr", gap: "8px", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px", opacity: out ? "0.45" : undefined }}>
                <span>{s.name}</span>
                <span style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>{rupiah(s.price)} · sisa {s.qty}</span>
                {out
                  ? <span style={{ justifySelf: "end", fontSize: "10.5px", color: "var(--red)" }}>Habis</span>
                  : <Stepper qty={qty} max={s.qty} onStep={(d) => chargeStep('snack', i, d)} />}
              </div>
            );
          })}
        </div>
        <div className="section-label" style={{ margin: "16px 0 7px" }}>Add-ons</div>
        <div id="charge-addon-rows">
          {addonRows.length ? addonRows : <div style={{ fontSize: "11.5px", color: "var(--text-faint)", padding: "6px 0" }}>No add-on fits this TV / Room.</div>}
        </div>
        <div className="row" style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Adding now</span>
          {" "}
          <span id="charge-sum" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "17px" }}>{rupiah(sum)}</span>
        </div>
        <div className="btn primary" style={{ marginTop: "12px" }} onClick={chargeConfirm}>Charge to session</div>
      </div>
    </div>
  );
}

/* Member & points box inside the payment popup (payMemberRender) */
function PayMemberBox() {
  const S = useStore();
  const p = S.ui.pay;
  const m = p.memberPhone ? memberByPhone(p.memberPhone) : null;
  if (m) {
    const would = pointsFor(p.roomAmt);
    const earn = Math.min(would, memberHeadroom(m));
    return (
      <div className="card" style={{ padding: "11px 13px", borderColor: "rgba(167,125,255,0.45)" }}>
        <div className="row">
          <span>
            <span style={{ fontSize: "13px" }}>{m.name}</span>
            <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-faint)", marginTop: "2px" }}>{m.phone} · {m.points} / {MEMBER_POINT_CAP} pts</span>
          </span>
          <span className="btn sm ghost" style={{ fontSize: "10.5px", padding: "4px 9px" }} onClick={payMemberClear}>Remove</span>
        </div>
        <div style={{ marginTop: "9px", paddingTop: "9px", borderTop: "1px solid var(--border)", fontSize: "11.5px", color: earn ? "var(--green)" : "var(--amber)" }}>
          {earn
            ? (
              <>
                + {earn} pts on confirm · from room time {rupiah(p.roomAmt)} ({pointRateLabel()})
                {earn < would ? <span style={{ display: "block", color: "var(--amber)", marginTop: "3px" }}>Capped at {MEMBER_POINT_CAP} — {would - earn} pts dropped.</span> : null}
              </>
            )
            : 'Poin penuh (' + MEMBER_POINT_CAP + ') — nothing added. Ask them to redeem at the counter first.'}
        </div>
      </div>
    );
  }
  const hits = payMemberHits();
  return (
    <>
      <input type="text" id="pay-member-search" placeholder="Search member by name or phone" style={{ marginBottom: "0" }} value={p.memberSearch} onChange={(e) => payMemberSearchSet(e.target.value)} />
      <div id="pay-member-results" style={{ marginTop: "7px" }}>
        {hits === null ? null : (!hits.length
          ? <div style={{ fontSize: "11.5px", color: "var(--text-faint)", padding: "6px 0" }}>No member matches — they can register at the counter.</div>
          : hits.map((h) => (
            <div key={h.phone} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 11px", marginBottom: "5px", cursor: "pointer" }} onClick={() => payMemberAttach(h.phone)}>
              <span><span style={{ fontSize: "12.5px" }}>{h.name}</span><span style={{ display: "block", fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>{h.phone}</span></span>
              <span className="pill owner" style={{ fontSize: "10px" }}>{h.points} / {MEMBER_POINT_CAP}</span>
            </div>
          )))}
      </div>
      <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "7px" }}>Optional — leave empty for a guest. Points come from room time only ({pointRateLabel()}), never snacks or add-ons.</div>
    </>
  );
}

/* ============ MODAL: PAYMENT AT COUNTER ============ */
function PaymentModal() {
  const S = useStore();
  const p = S.ui.pay;
  if (!p) return null;
  const snacks = p.charges.filter((c) => c.kind === 'snack');
  const addons = p.charges.filter((c) => c.kind === 'addon');
  const total = payTotal();
  return (
    <div id="payment-modal" style={overlay('0.7', "80", "20px")}>
      <div style={{ display: "flex", gap: "14px", alignItems: "stretch", maxHeight: "88vh" }}>
        <div style={{ width: "420px", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px" }}>
          <div className="row" style={{ marginBottom: "2px" }}>
            <div className="h-title" style={{ fontSize: "16px" }}>Payment at cashier</div>
            <span style={closeX} onClick={payCancel}>×</span>
          </div>
          <div id="pay-sub" style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "14px" }}>{p.name + ' · ' + p.cust + ' · started ' + p.started + (p.reason ? ' · ' + p.reason : '')}</div>
          <div className="card" style={{ padding: "12px 14px" }}>
            <div id="pay-lines">
              <div className="doc-line"><span style={{ color: "var(--text-dim)" }}>Main {p.hours} jam · {p.note}</span><span>{rupiah(p.roomAmt)}</span></div>
              {snacks.length ? (
                <>
                  <div style={{ ...faintHead, marginTop: "8px" }}>Snacks</div>
                  {snacks.map((c, i) => <div key={i} className="doc-line"><span style={{ color: "var(--text-dim)" }}>{c.name} ×{c.qty}</span><span>{rupiah(c.qty * c.price)}</span></div>)}
                </>
              ) : null}
              {addons.length ? (
                <>
                  <div style={{ ...faintHead, marginTop: "8px" }}>Add-ons</div>
                  {addons.map((c, i) => <div key={i} className="doc-line"><span style={{ color: "var(--text-dim)" }}>{c.name} ×{c.qty}</span><span>{rupiah(c.qty * c.price)}</span></div>)}
                </>
              ) : null}
              <div className="doc-line total"><span>Total payment</span><span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "17px" }}>{rupiah(total)}</span></div>
            </div>
          </div>
          <div className="section-label" style={{ margin: "16px 0 8px" }}>Member & points</div>
          <div id="pay-member-box"><PayMemberBox /></div>
          <div className="section-label" style={{ margin: "16px 0 8px" }}>How is the customer paying?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className={'btn ghost payment-method-btn' + (p.method === 'Cash' ? ' selected' : '')} id="pay-btn-cash" onClick={() => paySelect('Cash')}>Cash</div>
            <div className={'btn ghost payment-method-btn' + (p.method === 'QRIS' ? ' selected' : '')} id="pay-btn-qris" onClick={() => paySelect('QRIS')}>QRIS</div>
          </div>
          <div className="btn primary" style={{ marginTop: "14px" }} onClick={payConfirm}>Mark as paid & send receipt</div>
        </div>
        {p.method === 'QRIS' ? (
          <div id="pay-qris-panel" style={{ display: "block", width: "280px", background: "var(--bg-panel)", border: "1px solid var(--blue)", borderRadius: "14px", padding: "20px", textAlign: "center", overflowY: "auto" }}>
            <QrisPanel total={total} reference={p.qrisRef} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ============ MODAL: RECEIPT / SUMMARY DOCUMENT ============ */
function DocModal() {
  const S = useStore();
  const d = S.ui.doc;
  if (!d) return null;
  return (
    <div id="doc-modal" style={overlay('0.75', "85", "20px")}>
      <div style={{ width: "400px", maxHeight: "90vh", overflowY: "auto", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px" }}>
        <div className="row" style={{ marginBottom: "2px" }}>
          <div className="h-title" id="doc-title" style={{ fontSize: "16px" }}>{d.title}</div>
          <span style={closeX} onClick={docClose}>×</span>
        </div>
        <div id="doc-note" style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>{d.note}</div>
        <div id="doc-body"><DocBody body={d.body} /></div>
        <div className="btn ghost" style={{ marginTop: "16px" }} onClick={docClose}>Done</div>
      </div>
    </div>
  );
}

export default function Modals() {
  return (
    <>
      <OrderModal />
      <TodoModal />
      <CpayModal />
      <BillingModal />
      <AdminEditModal />
      <AuditModal />
      <StatDateModal />
      <OperatorModal />
      <MemberModal />
      <RejectModal />
      <RateModal />
      <RefundModal />
      <RefundDecideModal />
      <AddonEditorModal />
      <SnackEditorModal />
      <RewardEditorModal />
      <ChargeModal />
      <PaymentModal />
      <DocModal />
    </>
  );
}


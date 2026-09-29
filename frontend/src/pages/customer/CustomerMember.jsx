import { useStore, custPointsCheck, memberHeadroom, custPointsBalance, pointRateLabel, MEMBER_POINT_CAP, notify } from '../../store';
import { Page, Phone, CustomerTabs } from '../../components/Phone';

export default function CustomerMember() {
  const S = useStore();
  const m = S.custPtsMember;
  const pts = m ? m.points : 0;
  const log = m ? m.ledger : [];
  const balance = custPointsBalance();
  return (
    <Page id="customer-member">
      <Phone>
        <div className="phone-content">
          <div className="h-title" style={{ margin: "6px 0 16px" }}>Membership</div>
          <div className="metric" style={{ marginBottom: "6px" }}>
            <div className="label">Points balance</div>
            <div className="value glow" id="cust-pts-value">{pts} <span style={{ fontSize: "13px", color: "var(--text-faint)", fontWeight: "600" }}>/ {MEMBER_POINT_CAP} pts</span></div>
          </div>
          <div style={{ height: "7px", borderRadius: "5px", background: "var(--surface-2)", overflow: "hidden", marginBottom: "7px" }}>
            <div id="cust-pts-bar" style={{ width: Math.round(pts / MEMBER_POINT_CAP * 100) + "%", height: "100%", background: "linear-gradient(90deg,#2F8FFF,#38E8FF)" }} />
          </div>
          <div id="cust-pts-who" style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "16px" }}>
            {m
              ? <>{m.name} · {m.phone}{memberHeadroom(m) === 0 ? <> · <span style={{ color: "var(--amber)" }}>poin penuh, tukar di counter</span></> : null}</>
              : 'Belum ada nomor dicek.'}
          </div>
          <label>Check by phone number</label>
          <div style={{ display: "flex", gap: "7px" }}>
            <input type="text" id="cust-pts-phone" placeholder="08xx-xxxx-xxxx" value={S.custPtsPhone} onChange={(e) => { S.custPtsPhone = e.target.value; notify(); }} style={{ marginBottom: "0" }} />
            {" "}
            <span className="btn ghost" style={{ width: "auto", padding: "11px 16px", whiteSpace: "nowrap" }} onClick={custPointsCheck}>Cek</span>
          </div>
          <div id="cust-pts-msg" style={{ fontSize: "10.5px", color: S.custPtsMsgError ? "var(--red)" : "var(--text-faint)", margin: "9px 0 16px" }}>
            {S.custPtsMsgError
              ? 'Nomor ini belum terdaftar sebagai member. Daftar dulu di counter ya.'
              : (S.custPtsMsgChecked
                ? 'Poin nambah tiap kamu bayar sewa TV / Room · ' + pointRateLabel() + '. Snack & add-on nggak dapat poin.'
                : 'Poin nambah tiap kamu bayar sewa TV / Room. Snack & add-on nggak dapat poin.')}
          </div>
          <div className="banner" style={{ color: "var(--text-dim)", borderColor: "var(--border)", background: "var(--surface)" }}>Membership is registered at the counter. Ask the operator on duty to submit your request — the owner approves it, then your card is active.</div>
          <div className="section-label">Riwayat poin</div>
          <div id="cust-pts-ledger" style={{ marginBottom: "18px" }}>
            {!log.length
              ? <div style={{ fontSize: "11.5px", color: "var(--text-faint)" }}>Belum ada poin masuk. Poin muncul di sini setelah pembayaran dikonfirmasi.</div>
              : log.slice(0, 6).map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "12px" }}>{l.source}<span style={{ display: "block", fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>{l.at}{l.dropped ? ' · ' + l.dropped + ' poin hangus (penuh)' : ''}</span></span>
                  <span className={'pill ' + (l.pts > 0 ? 'available' : (l.pts < 0 ? 'inuse' : 'off'))} style={{ fontSize: "10px", whiteSpace: "nowrap" }}>{l.pts > 0 ? '+' + l.pts : l.pts} pts</span>
                </div>
              ))}
          </div>
          <div className="section-label">Redeem with your points</div>
          <div id="customer-reward-rows" style={{ marginBottom: "8px" }}>
            {S.rewardCatalog.map((rw, i) => {
              const affordable = rw.cost <= balance;
              return (
                <div key={i} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12.5px", color: affordable ? "var(--text)" : "var(--text-faint)" }}>{rw.name}</span>
                  <span className={'pill ' + (affordable ? 'available' : 'off')} style={{ whiteSpace: "nowrap" }}>{rw.cost} pts</span>
                </div>
              );
            })}
          </div>
        </div>
        <CustomerTabs active="customer-member" />
      </Phone>
    </Page>
  );
}

import { useStore, closeShift, closeFigures, closeSnackFigures, closeParse, closeDiscrepancy, closeSetCash, closeSetQris, closeSnackSet, rupiah, signedRupiah } from '../../store';
import { Page } from '../../components/Phone';
import { IMG } from '../../assets/images';

export default function AdminClosing() {
  const S = useStore();
  const f = closeFigures();
  const disc = closeDiscrepancy();
  const sf = closeSnackFigures();
  return (
    <Page id="admin-closing">
      <div className="desktop-page">
        <div className="topbar">
          <div className="h-title">
            {"RAD PLAYSTATION "}
            <span style={{ color: "var(--text-faint)", fontWeight: "500", fontSize: "12px" }}>/ admin / closing</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-dim)" }}>
            <img src={IMG["operator.jpg"]} style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
            {" "}
            <span className="admin-operator-name">{S.activeOperator}</span>
            {"\u00a0on duty"}
          </div>
        </div>
        <div className="desktop-body" style={{ maxWidth: "640px" }}>
          <div className="h-title" style={{ marginBottom: "4px" }}>Shift closing — 16 Sep 2026</div>
          <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "18px" }}>You only fill in what you counted. Everything else is calculated by the system.</div>
          <div className="card" style={{ marginBottom: "18px" }}>
            <div className="row" style={{ marginBottom: "12px" }}>
              <div className="section-label" style={{ margin: "0" }}>Cash & QRIS</div>
              <span className="pill owner">2 operator inputs</span>
            </div>
            <div className="adm-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>
              <div>
                <label>Cash in cashier · you count</label>
                <input type="text" id="close-cash-actual" placeholder="Rp 0" value={S.closeCashActual} onChange={(e) => closeSetCash(e.target.value)} />
              </div>
              <div>
                <label>Cash expected · system</label>
                <div className="close-ro" id="close-cash-expected">{rupiah(f.cash)}</div>
              </div>
              <div>
                <label>QRIS on GoPay merchant · you read</label>
                <input type="text" id="close-qris-actual" placeholder="Rp 0" value={S.closeQrisActual} onChange={(e) => closeSetQris(e.target.value)} />
              </div>
              <div>
                <label>QRIS expected · system</label>
                <div className="close-ro" id="close-qris-expected">{rupiah(f.qris)}</div>
              </div>
            </div>
            <div id="close-refund-wrap" style={{ display: f.refunds ? "block" : "none", marginTop: "14px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <label>Refunds paid out today · owner-approved</label>
              <div className="close-ro" id="close-refunds" style={{ color: "var(--red)" }}>{'-' + rupiah(f.refunds)}</div>
              <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "6px" }}>Already taken out of the expected figures above, so what you count should still match.</div>
            </div>
            <div className="adm-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <div>
                <label>Discrepancy · system</label>
                <div className="close-ro" id="close-disc" style={{ color: disc === 0 ? "var(--green)" : "var(--red)" }}>{signedRupiah(disc)}</div>
              </div>
              <div>
                <label>Total revenue today · system</label>
                <div className="close-ro" id="close-total">{rupiah(f.total)}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ marginBottom: "18px" }}>
            <div className="row" style={{ marginBottom: "4px" }}>
              <div className="section-label" style={{ margin: "0" }}>Snacks left on location</div>
              <span className="pill owner">System cross-checks</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "12px" }}>Count what is physically on the shelf. Any gap goes on the shift receipt the owner receives.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr 0.8fr 1fr", gap: "8px", fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              <span>Item</span>
              <span style={{ textAlign: "center" }}>System</span>
              <span style={{ textAlign: "center" }}>Counted</span>
              <span style={{ textAlign: "right" }}>Gap</span>
            </div>
            <div id="close-snack-rows">
              {S.snackStock.map((st, i) => {
                const c = closeParse(S.closeSnackCount[i]);
                const gap = c === null ? null : c - st.qty;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr 0.8fr 1fr", gap: "8px", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                    <span>{st.name}</span>
                    <span style={{ textAlign: "center", color: "var(--text-dim)" }}>{st.qty}</span>
                    <span><input type="text" value={S.closeSnackCount[i] === undefined ? '' : S.closeSnackCount[i]} placeholder="—" style={{ textAlign: "center", padding: "5px 4px" }} onChange={(e) => closeSnackSet(i, e.target.value)} /></span>
                    <span style={{ textAlign: "right", color: gap === null ? "var(--text-faint)" : (gap === 0 ? "var(--green)" : "var(--red)") }}>{gap === null ? 'not counted' : (gap > 0 ? '+' + gap : gap) + ' pcs'}</span>
                  </div>
                );
              })}
            </div>
            <div className="row" style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "12px", fontSize: "12.5px" }}>
              <span style={{ color: "var(--text-dim)" }}>Snack value gap</span>
              <span id="close-snack-gap" style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: "700", fontSize: "15px", color: sf.value === 0 ? "var(--green)" : "var(--red)" }}>{signedRupiah(sf.value)}</span>
            </div>
          </div>
          <div className="btn primary" onClick={closeShift}>Close shift & generate receipt</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "10px", textAlign: "center" }}>A copy lands in the owner's transaction history under Shift summary.</div>
        </div>
      </div>
    </Page>
  );
}

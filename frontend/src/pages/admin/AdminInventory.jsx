import { useStore } from '../../store';
import { Page } from '../../components/Phone';
import { IMG } from '../../assets/images';
import { SnackRows, AddonRows, RoomRows } from '../../components/AdminParts';

export default function AdminInventory() {
  const S = useStore();
  return (
    <Page id="admin-inventory">
      <div className="desktop-page">
        <div className="topbar">
          <div className="h-title">
            {"RAD PLAYSTATION "}
            <span style={{ color: "var(--text-faint)", fontWeight: "500", fontSize: "12px" }}>/ admin / inventory</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-dim)" }}>
            <img src={IMG["operator.jpg"]} style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
            {" "}
            <span className="admin-operator-name">{S.activeOperator}</span>
            {"\u00a0on duty"}
          </div>
        </div>
        <div className="desktop-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start", marginBottom: "26px" }}>
            <div>
              <div className="row" style={{ marginBottom: "6px" }}>
                <div className="h-title" style={{ fontSize: "15px" }}>Snacks</div>
                <span className="pill owner">Read only</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "10px" }}>Stock counts and prices are set by the owner. Sell items from the session screen; ask the owner for any correction.</div>
              <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.9fr", gap: "8px", padding: "9px 14px", fontSize: "10px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <span>Item</span>
                  <span style={{ textAlign: "center" }}>Stock</span>
                  <span style={{ textAlign: "right" }}>Price</span>
                </div>
                <div id="snack-rows"><SnackRows /></div>
              </div>
            </div>
            <div>
              <div className="row" style={{ marginBottom: "6px" }}>
                <div className="h-title" style={{ fontSize: "15px" }}>Add-ons</div>
                <span className="pill owner">Read only</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "10px" }}>Charge these to a running session from the dashboard. Units come back to stock once the bill is paid — prices are set by the owner.</div>
              <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 0.6fr 0.8fr", gap: "6px", padding: "9px 13px", fontSize: "10px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <span>Add-on</span>
                  <span>Fits</span>
                  <span style={{ textAlign: "center" }}>Free</span>
                  <span style={{ textAlign: "right" }}>Price</span>
                </div>
                <div id="operator-addon-rows"><AddonRows /></div>
              </div>
            </div>
          </div>
          <div className="row" style={{ marginBottom: "10px" }}>
            <div className="h-title">TVs & Rooms</div>
            <div className="btn sm ghost">+ Add TV / Room</div>
          </div>
          <div className="card" style={{ padding: "0", overflow: "hidden", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr 0.85fr 1fr", gap: "8px", padding: "9px 14px", fontSize: "10.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>Name</span>
              <span>Amenities</span>
              <span>System status</span>
              <span>Set state</span>
            </div>
            <div id="inv-room-rows"><RoomRows /></div>
          </div>
        </div>
      </div>
    </Page>
  );
}

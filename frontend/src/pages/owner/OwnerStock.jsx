import { useStore, ownerOpenAddonEditor, ownerOpenRateEditor, ownerOpenRewardEditor, ownerOpenSnackEditor } from '../../store';
import { Page, Phone, OwnerTabs, TodoTrigger } from '../../components/Phone';
import { StockAlert, OwnerSnackRows, RateRows, RewardRows, addonFreePill } from '../../components/OwnerParts';
import { AddonRows } from '../../components/AdminParts';

export default function OwnerStock() {
  const S = useStore();
  const fp = addonFreePill(S);
  return (
    <Page id="owner-stock">
      <Phone>
        <div className="phone-content">
          <div className="row" style={{ margin: "6px 0 4px" }}>
            <div className="h-title">Stock & Rewards</div>
            <TodoTrigger />
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>Everything priced here is locked to you. Operators can sell, but never change a number.</div>
          {/* Restock banner — the one thing that can actually be urgent */}
          <div id="stock-alert" style={{ marginBottom: "16px" }}><StockAlert /></div>
          {/* 1 ▸ SNACKS — touched every day */}
          <div className="osec" style={{ marginTop: "0" }}>
            <div className="t">Snacks</div>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: "0" }}>
              <span className="pill off" id="snack-count-pill" style={{ fontSize: "9.5px" }}>{S.snackStock.length + ' items'}</span>
              {" "}
              <span className="btn sm ghost" style={{ fontSize: "11px", padding: "5px 11px" }} onClick={ownerOpenSnackEditor}>Edit</span>
            </span>
          </div>
          <div className="osub">Counted at every shift closing — red means at or below your reorder point</div>
          <div className="card" style={{ padding: "0", overflow: "hidden", marginBottom: "4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1.1fr 0.85fr", gap: "8px", padding: "9px 12px", fontSize: "9.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>Item</span>
              <span>Stock</span>
              <span style={{ textAlign: "right" }}>Price</span>
            </div>
            <div id="owner-snack-rows"><OwnerSnackRows /></div>
          </div>
          {/* 2 ▸ TV & ROOM RATES — changed now and then */}
          <div className="osec">
            <div className="t">TV & Room rates</div>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: "0" }}>
              <span className="pill off" style={{ fontSize: "9.5px" }}>per jam</span>
              {" "}
              <span className="btn sm ghost" style={{ fontSize: "11px", padding: "5px 11px" }} onClick={ownerOpenRateEditor}>Edit</span>
            </span>
          </div>
          <div className="osub">What the booking page quotes and the billing screen charges. Saving notifies every operator on duty.</div>
          <div className="card" style={{ padding: "0", overflow: "hidden", marginBottom: "4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr", gap: "6px", padding: "9px 12px", fontSize: "9.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>TV / Room</span>
              <span style={{ textAlign: "right" }}>Weekday</span>
              <span style={{ textAlign: "right" }}>Weekend</span>
            </div>
            <div id="owner-rate-rows"><RateRows /></div>
          </div>
          {/* 3 ▸ ADD-ONS — rental gear, rarely repriced */}
          <div className="osec warm">
            <div className="t">Add-ons</div>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: "0" }}>
              <span className={fp.className} id="addon-free-pill" style={{ fontSize: "9.5px" }}>{fp.text}</span>
              {" "}
              <span className="btn sm ghost" style={{ fontSize: "11px", padding: "5px 11px" }} onClick={ownerOpenAddonEditor}>Edit</span>
            </span>
          </div>
          <div className="osub">Gear the customer can add at booking — offered only on units that fit, up to the number you own</div>
          <div className="card" style={{ padding: "0", overflow: "hidden", marginBottom: "4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 0.6fr 0.8fr", gap: "6px", padding: "9px 13px", fontSize: "9.5px", color: "var(--text-faint)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <span>Add-on</span>
              <span>Fits</span>
              <span style={{ textAlign: "center" }}>Free</span>
              <span style={{ textAlign: "right" }}>Price</span>
            </div>
            <div id="owner-addon-rows"><AddonRows /></div>
          </div>
          {/* 4 ▸ REWARDS — set once, revisited least */}
          <div className="osec cool">
            <div className="t">Redeem catalog</div>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: "0" }}>
              <span className="pill owner" style={{ fontSize: "9.5px" }}>Max 300 pts</span>
              {" "}
              <span className="btn sm ghost" style={{ fontSize: "11px", padding: "5px 11px" }} onClick={ownerOpenRewardEditor}>Edit</span>
            </span>
          </div>
          <div className="osub">What members exchange points for. Members top out at 300 points, so nothing costs more than that.</div>
          <div id="owner-reward-rows" style={{ marginBottom: "8px" }}><RewardRows /></div>
        </div>
        <OwnerTabs active="stock" />
      </Phone>
    </Page>
  );
}

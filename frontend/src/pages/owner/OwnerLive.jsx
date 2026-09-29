import { useStore, rupiah } from '../../store';
import { Page, Phone, OwnerTabs, TodoTrigger } from '../../components/Phone';
import { liveFloor, liveClock, LiveRoomCards } from '../../components/OwnerParts';

export default function OwnerLive() {
  const S = useStore();
  const lf = liveFloor(S);
  return (
    <Page id="owner-live">
      <Phone>
        <div className="phone-content">
          <div className="row" style={{ margin: "6px 0 4px" }}>
            <div className="h-title">Live floor</div>
            <TodoTrigger />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "10.5px", color: "var(--text-faint)", marginBottom: "14px" }}>
            <span className="avatar-dot" />
            <span style={{ color: "var(--green)" }}>LIVE</span>
            {" · every transaction, as it happens · "}
            <span id="owner-live-clock">{liveClock()}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px", marginBottom: "10px" }}>
            <div className="metric">
              <div className="label">Billing running now</div>
              <div className="value glow" id="live-billing-total">{rupiah(lf.runningTotal)}</div>
            </div>
            <div className="metric">
              <div className="label">Collected today</div>
              <div className="value" id="live-revenue-today">{rupiah(S.liveCollectedToday + lf.runningTotal)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "7px", marginBottom: "18px" }}>
            <div className="metric" style={{ flex: "1", padding: "11px" }}>
              <div className="label">In use</div>
              <div className="value" id="live-count-inuse" style={{ fontSize: "19px", color: "var(--red)" }}>{lf.inUse}</div>
            </div>
            <div className="metric" style={{ flex: "1", padding: "11px" }}>
              <div className="label">Booked</div>
              <div className="value" id="live-count-booked" style={{ fontSize: "19px", color: "var(--amber)" }}>{lf.booked}</div>
            </div>
            <div className="metric" style={{ flex: "1", padding: "11px" }}>
              <div className="label">Available</div>
              <div className="value" id="live-count-avail" style={{ fontSize: "19px", color: "var(--green)" }}>{lf.avail}</div>
            </div>
          </div>
          <div className="row" style={{ marginBottom: "8px" }}>
            <div className="section-label" style={{ margin: "0" }}>Slots — real time</div>
            <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>Tap a running slot for session details</span>
          </div>
          <div id="live-room-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}><LiveRoomCards /></div>
        </div>
        <OwnerTabs active="live" />
      </Phone>
    </Page>
  );
}

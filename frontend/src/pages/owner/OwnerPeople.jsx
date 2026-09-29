import { useStore, ownerOpenOperatorEditor, setMemberSearch } from '../../store';
import { Page, Phone, OwnerTabs, TodoTrigger } from '../../components/Phone';
import { OperatorList, RequestList, MemberList } from '../../components/OwnerParts';

export default function OwnerPeople() {
  const S = useStore();
  return (
    <Page id="owner-people">
      <Phone>
        <div className="phone-content">
          <div className="row" style={{ margin: "6px 0 18px" }}>
            <div className="h-title">Operators & Members</div>
            <TodoTrigger />
          </div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            <div className="metric" style={{ flex: "1" }}>
              <div className="label">Operators</div>
              <div className="value" id="owner-operator-count">{S.ownerOperators.length}</div>
            </div>
            <div className="metric" style={{ flex: "1" }}>
              <div className="label">Members</div>
              <div className="value glow" id="owner-member-count">{S.ownerMembers.length}</div>
            </div>
          </div>
          <div style={{ borderTop: "2px solid var(--blue)", paddingTop: "12px", marginBottom: "6px" }}>
            <div className="row">
              <div className="h-title" style={{ fontSize: "15px" }}>Operators</div>
              <span className="btn sm ghost" style={{ fontSize: "11px", padding: "5px 11px" }} onClick={ownerOpenOperatorEditor}>Edit Operators</span>
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "2px" }}>Staff accounts that can open a shift on the admin console</div>
          </div>
          <div id="owner-operator-list" style={{ margin: "12px 0 26px" }}><OperatorList /></div>
          <div style={{ borderTop: "2px solid var(--amber)", paddingTop: "12px", marginBottom: "6px" }}>
            <div className="row">
              <div className="h-title" style={{ fontSize: "15px" }}>Membership requests</div>
              <span className="pill booked" id="owner-request-count">{S.memberRequests.length + ' waiting'}</span>
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "2px" }}>Raised by operators. Customers cannot sign themselves up — nothing becomes a membership until you approve it.</div>
          </div>
          <div id="owner-request-list" style={{ margin: "12px 0 26px" }}><RequestList /></div>
          <div style={{ borderTop: "2px solid var(--purple)", paddingTop: "12px", marginBottom: "6px" }}>
            <div className="h-title" style={{ fontSize: "15px" }}>Members</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "2px" }}>Points program · 300 pts cap · only the owner can delete a member</div>
          </div>
          <input id="owner-member-search" type="text" placeholder="Search name or number" value={S.memberSearch} onChange={(e) => setMemberSearch(e.target.value)} style={{ margin: "12px 0 10px" }} />
          <div id="owner-member-list" style={{ marginBottom: "8px" }}><MemberList /></div>
        </div>
        <OwnerTabs active="people" />
      </Phone>
    </Page>
  );
}

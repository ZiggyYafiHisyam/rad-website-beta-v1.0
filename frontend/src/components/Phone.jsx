import { useStore, showPage, ownerTodoOpen, pinnedFeedbacks } from '../store';

/* Page wrapper: every page keeps its old id so the stylesheet still targets it */
export function Page({ id, className, children }) {
  return <div className={'page active' + (className ? ' ' + className : '')} id={'page-' + id}>{children}</div>;
}

/* App screen used by the customer and owner pages: full screen on a phone,
   a centred phone-width column on a computer (see .phone-* in app.css) */
export function Phone({ children }) {
  return (
    <div className="phone-stage">
      <div className="phone-shell">
        <div className="phone-screen">
          {children}
        </div>
      </div>
    </div>
  );
}

const CUSTOMER_TABS = [
  { id:'customer-home', label:'Home', path:'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10' },
  { id:'customer-member', label:'Member', path:'M12 3l2.6 5.8L21 9.6l-4.7 4.2L17.6 21 12 17.6 6.4 21l1.3-7.2L3 9.6l6.4-.8z' },
  { id:'customer-feedback', label:'Feedback', path:'M21 11.5a8.4 8.4 0 01-8.4 8.4 8.6 8.6 0 01-3.8-.9L3 20l1.1-5.6a8.4 8.4 0 1116.9-2.9z' }
];

export function CustomerTabs({ active }) {
  return (
    <div className="tab-bar">
      {CUSTOMER_TABS.map((t) => (
        <div key={t.id} className={'tab-item' + (t.id === active ? ' active' : '')} onClick={() => showPage(t.id)} style={{ cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d={t.path} />
          </svg>
          {t.label}
        </div>
      ))}
    </div>
  );
}

/* ================= OWNER TABS ================= */
const OWNER_TABS = [
  { id:'owner-live', key:'live', label:'Live', icon:(<><circle cx="12" cy="12" r="2.6" /><path d="M6.4 6.4a8 8 0 000 11.2M17.6 6.4a8 8 0 010 11.2" /></>) },
  { id:'owner-revenue', key:'revenue', label:'Stats', icon:(<><path d="M3 17l5.5-5.5 3.5 3.5L21 6" /><path d="M15 6h6v6" /></>) },
  { id:'owner-reports', key:'reports', label:'Reports', icon:(<><path d="M6 2h8l5 5v15H6z" /><path d="M14 2v5h5M9 13h7M9 17h5" /></>) },
  { id:'owner-history', key:'history', label:'History', icon:(<><path d="M3.5 12a8.5 8.5 0 108.5-8.5A8.4 8.4 0 006 6" /><path d="M3.5 3.6v3.2h3.2M12 7.5V12l3.2 2" /></>) },
  { id:'owner-people', key:'people', label:'People', icon:(<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.2 2.5-5.2 5.5-5.2s5.5 2 5.5 5.2" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16 14.2c2.6 0 4.5 1.8 4.5 4.4" /></>) },
  { id:'owner-stock', key:'stock', label:'Stock', icon:(<><path d="M3 7.5l9-4.5 9 4.5v9L12 21 3 16.5z" /><path d="M3 7.5l9 4.5 9-4.5M12 12v9" /></>) }
];

export function OwnerTabs({ active }) {
  return (
    <div className="tab-bar owner-tabs" data-active={active}>
      {OWNER_TABS.map((t) => (
        <div key={t.key} className={'tab-item' + (t.key === active ? ' active' : '')} onClick={() => showPage(t.id)} style={{ cursor: "pointer", flex: 1 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
          <span style={{ fontSize: "9px" }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

/* The "To-do list" button in every owner header, with its red pinned count */
export function TodoTrigger() {
  useStore();
  const n = pinnedFeedbacks().length;
  return (
    <span className="todo-trigger" onClick={ownerTodoOpen} title="To-do list" style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", flexShrink: "0" }}>
      <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--text-dim)" }}>To-do list</span>
      {" "}
      <span className="todo-badge" style={{ position: "relative", width: "28px", height: "28px", borderRadius: "50%", background: "#5FB2FF", boxShadow: "0 0 0 3px rgba(95,178,255,0.16), 0 0 14px rgba(95,178,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#06070B" stroke="#06070B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 17v5" />
          <path d="M9 3h6l-1 6 3 3H7l3-3-1-6z" />
        </svg>
        <span className="todo-count" style={{ display: n ? "block" : "none", position: "absolute", top: "-3px", right: "-3px", minWidth: "15px", height: "15px", padding: "0 3px", borderRadius: "8px", background: "var(--red)", color: "#fff", fontSize: "9px", fontWeight: "700", lineHeight: "15px", textAlign: "center", boxShadow: "0 0 0 2px var(--bg)" }}>{n}</span>
      </span>
    </span>
  );
}

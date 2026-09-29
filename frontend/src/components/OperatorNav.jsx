import { showPage } from '../store';

/* The operator's navbar: the prototype's left sidebar, Admin group only */
const ITEMS = [
  { id: 'admin-login', label: 'Login', path: '/admin/login' },
  { id: 'admin-home', label: 'Dashboard', path: '/admin/home' },
  { id: 'admin-inventory', label: 'Inventory', path: '/admin/inventory' },
  { id: 'admin-closing', label: 'Closing', path: '/admin/closing' }
];

export default function OperatorLayout({ active, children }) {
  return (
    <div className="admin-shell">
      <nav className="sidebar">
        <div className="brand"><span className="dot" /><span>RAD PLAYSTATION</span></div>
        <div className="nav-group">
          <div className="group-label">Admin <span>desktop</span></div>
          {ITEMS.map((it) => (
            <button key={it.id} className={'nav-item' + (it.id === active ? ' active' : '')} id={'nav-' + it.id} onClick={() => showPage(it.id)}>
              {it.label} <span className="path">{it.path}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="admin-main">{children}</div>
    </div>
  );
}

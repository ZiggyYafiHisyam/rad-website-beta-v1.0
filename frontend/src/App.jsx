import { useEffect, useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { setNavigator, startClock, useStore, refresh, startPolling, accessFor, hasAccess, PAGE_URLS } from './store';
import Modals from './components/Modals';
import { resolveRedirect } from './routes';
import { applyViewport } from './viewport';

import CustomerHome from './pages/customer/CustomerHome';
import CustomerTable from './pages/customer/CustomerTable';
import PaymentCash from './pages/customer/PaymentCash';
import PaymentQris from './pages/customer/PaymentQris';
import CustomerMember from './pages/customer/CustomerMember';
import CustomerFeedback from './pages/customer/CustomerFeedback';
import AdminLogin from './pages/admin/AdminLogin';
import AdminHome from './pages/admin/AdminHome';
import AdminInventory from './pages/admin/AdminInventory';
import AdminClosing from './pages/admin/AdminClosing';
import OwnerLogin from './pages/owner/OwnerLogin';
import OwnerLive from './pages/owner/OwnerLive';
import OwnerRevenue from './pages/owner/OwnerRevenue';
import OwnerReports from './pages/owner/OwnerReports';
import OwnerHistory from './pages/owner/OwnerHistory';
import OwnerPeople from './pages/owner/OwnerPeople';
import OwnerStock from './pages/owner/OwnerStock';
import OwnerDesktop from './pages/owner/OwnerDesktop';

/* Any URL that is not a page (/admin, /owner, unknown or trailing-slash paths)
   is sent where src/routes.js says — the same map the server redirects with. */
function Fallback() {
  const { pathname, search } = useLocation();
  const target = resolveRedirect(pathname);
  return target ? <Navigate to={target + search} replace /> : <CustomerHome />;
}

export default function App() {
  const S = useStore();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const need = accessFor(pathname);
  const allowed = hasAccess(need);

  useEffect(() => { setNavigator(navigate); }, [navigate]);
  useEffect(() => { startClock(); }, []);
  /* Load the first snapshot, then keep every screen in step with the server */
  useEffect(() => { refresh(); startPolling(); }, []);
  /* Operator and owner pages need a signed-in session of the right role */
  useEffect(() => {
    if (S.ready && !allowed) navigate(PAGE_URLS[need === 'owner' ? 'owner-login' : 'admin-login'], { replace: true });
  }, [S.ready, allowed, need]);
  /* Phones: desktop layout for operator pages / owner console, app layout elsewhere */
  useLayoutEffect(() => { applyViewport(pathname); }, [pathname]);
  /* Every page opens scrolled to the top */
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);

  if (!S.ready) return <div className="stage"><div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-faint)", fontSize: "13px" }}>Loading…</div></div>;
  if (!allowed) return null;

  return (
    <div className="stage">
      {S.serverDown ? <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 999, background: "var(--red)", color: "#fff", textAlign: "center", fontSize: "12px", padding: "6px" }}>Can’t reach the server — retrying…</div> : null}
      <Routes>
        <Route path="/" element={<CustomerHome />} />
        <Route path="/tv" element={<CustomerTable />} />
        <Route path="/tv/:id" element={<CustomerTable />} />
        <Route path="/payment/cash" element={<PaymentCash />} />
        <Route path="/payment/cash/:id" element={<PaymentCash />} />
        <Route path="/payment/qris" element={<PaymentQris />} />
        <Route path="/payment/qris/:id" element={<PaymentQris />} />
        <Route path="/member" element={<CustomerMember />} />
        <Route path="/feedback" element={<CustomerFeedback />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/home" element={<AdminHome />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/closing" element={<AdminClosing />} />
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner/live" element={<OwnerLive />} />
        <Route path="/owner/stats" element={<OwnerRevenue />} />
        <Route path="/owner/reports" element={<OwnerReports />} />
        <Route path="/owner/history" element={<OwnerHistory />} />
        <Route path="/owner/people" element={<OwnerPeople />} />
        <Route path="/owner/stock" element={<OwnerStock />} />
        <Route path="/owner/desktop" element={<OwnerDesktop />} />
        <Route path="*" element={<Fallback />} />
      </Routes>
      <Modals />
    </div>
  );
}

import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { setNavigator, startClock } from './store';
import Modals from './components/Modals';

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

/* The same path table the prototype's router used */
const ROUTES = {
  '/':                  CustomerHome,
  '/tv':                CustomerTable,
  '/payment/cash':      PaymentCash,
  '/payment/qris':      PaymentQris,
  '/member':            CustomerMember,
  '/feedback':          CustomerFeedback,
  '/admin/login':       AdminLogin,
  '/admin/home':        AdminHome,
  '/admin/inventory':   AdminInventory,
  '/admin/closing':     AdminClosing,
  '/owner/login':       OwnerLogin,
  '/owner/live':        OwnerLive,
  '/owner/stats':       OwnerRevenue,
  '/owner/reports':     OwnerReports,
  '/owner/history':     OwnerHistory,
  '/owner/people':      OwnerPeople,
  '/owner/stock':       OwnerStock,
  '/owner/desktop':     OwnerDesktop
};

/* Anything else: strip a trailing slash, then try the parent path
   (/tv/123 → /tv, /payment/cash/5 → /payment/cash), else the customer home. */
function Fallback() {
  let path = useLocation().pathname;
  if (path.length > 1 && path.slice(-1) === '/') path = path.slice(0, -1);
  if (ROUTES[path]) { const Page = ROUTES[path]; return <Page />; }
  const parts = path.split('/');
  if (parts.length > 1) {
    const parent = parts.slice(0, -1).join('/') || '/';
    if (ROUTES[parent]) { const Page = ROUTES[parent]; return <Page />; }
  }
  return <CustomerHome />;
}

export default function App() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => { setNavigator(navigate); }, [navigate]);
  useEffect(() => { startClock(); }, []);
  /* Every page opens scrolled to the top */
  useEffect(() => { window.scrollTo(0, 0); }, [pathname, search]);

  return (
    <div className="stage">
      <Routes>
        <Route path="/" element={<CustomerHome />} />
        <Route path="/tv/:id" element={<CustomerTable />} />
        <Route path="/payment/cash/:id" element={<PaymentCash />} />
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

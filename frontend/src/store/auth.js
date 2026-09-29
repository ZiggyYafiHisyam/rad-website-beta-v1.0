import { S, goTo, PAGE_URLS } from './state';
import { login, logout, run, once } from './api';

/* ================= SIGN IN / OUT =================
   Operators pick their name and enter a password; the owner types a username
   and password. The server checks both and hands back a session token. */
export async function adminSignIn(password) {
  const name = S.adminLoginOperator || S.operatorNames[0];
  if (!name) { alert('No operator accounts yet.'); return; }
  await once('login', async () => {
    const user = await run(() => login('operator', name, password));
    if (user) goTo(PAGE_URLS['admin-home']);
  });
}

export async function ownerSignIn(username, password, page) {
  if (!username.trim()) { alert('Enter the owner username'); return; }
  await once('login', async () => {
    const user = await run(() => login('owner', username.trim(), password));
    if (user) goTo(PAGE_URLS[page] || PAGE_URLS['owner-revenue']);
  });
}

export function signOut(area) {
  logout();
  goTo(PAGE_URLS[area === 'owner' ? 'owner-login' : 'admin-login']);
}

/* Which URLs need which role (used by the route guard in App.jsx) */
export function accessFor(pathname) {
  if (pathname === '/admin/login' || pathname === '/owner/login') return 'open';
  if (pathname.indexOf('/admin') === 0) return 'operator';
  if (pathname.indexOf('/owner') === 0) return 'owner';
  return 'open';
}

export function hasAccess(need) {
  if (need === 'open') return true;
  if (need === 'owner') return S.role === 'owner';
  return S.role === 'operator' || S.role === 'owner';
}



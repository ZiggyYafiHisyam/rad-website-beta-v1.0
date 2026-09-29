/* ================= URL MAP =================
   One table for every place that decides where a URL goes: the React router
   (src/App.jsx), the Vercel function (api/router.mjs) and the local dev /
   preview server (vite.config.js). Plain JS, no React, so all three can import it.

   Three areas, each with an entry page:
     /        customer pages   → entry /
     /admin   operator pages   → entry /admin/login
     /owner   owner pages      → entry /owner/login */

export const PAGE_PATHS = [
  // customer
  '/', '/tv', '/payment/cash', '/payment/qris', '/member', '/feedback',
  // operator
  '/admin/login', '/admin/home', '/admin/inventory', '/admin/closing',
  // owner
  '/owner/login', '/owner/live', '/owner/stats', '/owner/reports', '/owner/history',
  '/owner/people', '/owner/stock', '/owner/desktop'
];

/* Customer pages that carry an id: /tv/7, /payment/cash/12, /payment/qris/12 */
const DYNAMIC = [/^\/tv\/[^/]+$/, /^\/payment\/cash\/[^/]+$/, /^\/payment\/qris\/[^/]+$/];

export const AREA_ENTRY = { customer: '/', admin: '/admin/login', owner: '/owner/login' };

export function areaOf(path) {
  if (path === '/admin' || path.indexOf('/admin/') === 0) return 'admin';
  if (path === '/owner' || path.indexOf('/owner/') === 0) return 'owner';
  return 'customer';
}

export function isPage(path) {
  return PAGE_PATHS.indexOf(path) !== -1 || DYNAMIC.some((re) => re.test(path));
}

/* Where a path should be sent, or null when it is already a real page.
     /admin, /admin/anything-unknown   → /admin/login
     /owner, /owner/anything-unknown   → /owner/login
     /admin/home/extra                 → /admin/home   (nearest real parent)
     /admin/home/                      → /admin/home   (trailing slash)
     /anything-else                    → /                                   */
export function resolveRedirect(pathname) {
  let path = pathname || '/';
  if (path.length > 1 && path.slice(-1) === '/') path = path.replace(/\/+$/, '') || '/';
  if (isPage(path)) return path === pathname ? null : path;
  const parent = path.split('/').slice(0, -1).join('/');
  if (parent && isPage(parent) && areaOf(parent) === areaOf(path)) return parent;
  return AREA_ENTRY[areaOf(path)];
}

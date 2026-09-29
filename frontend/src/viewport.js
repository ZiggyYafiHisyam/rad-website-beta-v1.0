/* ================= PHONE VIEWPORT =================
   Phones size the page from <meta name="viewport">; computers ignore it, so
   nothing here changes the desktop view.

   - Operator pages and the owner desktop console: render the desktop layout
     980px wide and let the phone shrink it to fit — what Chrome's
     "Desktop site" does, without the user having to switch it on.
   - Every other page (customer app, owner mobile pages): the phone's own
     width at 80% scale, so the app layout shows a bit more per screen. */
const DESKTOP_LAYOUT = 'width=980, viewport-fit=cover';
const APP_LAYOUT = 'width=device-width, initial-scale=0.8, viewport-fit=cover';

export function usesDesktopLayout(pathname) {
  return pathname === '/admin' || pathname.indexOf('/admin/') === 0 ||
    pathname === '/owner/desktop' || pathname.indexOf('/owner/desktop/') === 0;
}

export function applyViewport(pathname) {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    document.head.appendChild(meta);
  }
  const content = usesDesktopLayout(pathname) ? DESKTOP_LAYOUT : APP_LAYOUT;
  if (meta.getAttribute('content') !== content) meta.setAttribute('content', content);
}

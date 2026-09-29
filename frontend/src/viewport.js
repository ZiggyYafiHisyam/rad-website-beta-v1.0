/* ================= PHONE VIEWPORT (fit to page) =================
   Every page has a layout width, and on a phone the browser shrinks or grows
   that width to exactly fill the screen. A fixed-width viewport is the one
   scaling method every mobile browser supports the same way (Chrome old and
   new, Safari, Samsung Internet, Firefox), so a page looks identical on any
   phone, only bigger or smaller.

     customer + owner app pages   480px   (what an iPhone showed before)
     operator pages              1212px   (navbar 232 + desktop page 980)
     owner desktop console        980px   (what Chrome's "Desktop site" uses)

   Computers ignore <meta name="viewport">. Tablets (shorter side 768px or
   more) keep the device width, so they lay out like a computer.

   The same rule runs inline in index.html before the first paint. */
export const LAYOUT_WIDTH = { app: 480, operator: 1212, console: 980 };

export function layoutFor(pathname) {
  if (pathname === '/admin' || pathname.indexOf('/admin/') === 0) return 'operator';
  if (pathname === '/owner/desktop' || pathname.indexOf('/owner/desktop/') === 0) return 'console';
  return 'app';
}

function isPhone() {
  return Math.min(window.screen.width, window.screen.height) < 768;
}

export function viewportContent(pathname) {
  if (!isPhone()) return 'width=device-width, initial-scale=1, viewport-fit=cover';
  return 'width=' + LAYOUT_WIDTH[layoutFor(pathname)] + ', viewport-fit=cover';
}

export function applyViewport(pathname) {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    document.head.appendChild(meta);
  }
  const content = viewportContent(pathname);
  if (meta.getAttribute('content') !== content) {
    meta.setAttribute('content', content);
    /* the visible height (in page pixels) changes with the scale */
    setTimeout(syncAppHeight, 60);
  }
}

/* Height of the visible screen in page pixels, as --app-h. Older browsers do
   not know 100dvh, and there 100vh runs under the address bar. */
export function syncAppHeight() {
  document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px');
}

export function watchAppHeight() {
  syncAppHeight();
  window.addEventListener('resize', syncAppHeight);
  window.addEventListener('orientationchange', () => setTimeout(syncAppHeight, 150));
}

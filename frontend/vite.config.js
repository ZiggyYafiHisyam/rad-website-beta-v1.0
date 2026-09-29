import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveRedirect } from './src/routes.js';

/* Local twin of api/router.mjs: page loads for /admin, /owner, unknown
   sub-paths or trailing slashes get the same redirect the deployed site sends. */
function urlRouter() {
  function redirect(req, res, next) {
    const accept = req.headers.accept || '';
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    /* Only browser page loads — never modules, assets or Vite internals */
    if (req.method !== 'GET' || accept.indexOf('text/html') === -1 || /\.[a-z0-9]+$/i.test(path) || path.indexOf('/@') === 0) {
      return next();
    }
    const target = resolveRedirect(path);
    if (!target) return next();
    res.statusCode = 302;
    res.setHeader('Location', target + url.search);
    res.end();
  }
  return {
    name: 'rad-url-router',
    configureServer(server) { server.middlewares.use(redirect); },
    configurePreviewServer(server) { server.middlewares.use(redirect); }
  };
}

export default defineConfig({
  plugins: [react(), urlRouter()],
  /* Compile down so older phone browsers (e.g. an old Android Chrome) can run it */
  build: { target: ['es2018', 'chrome70', 'safari12', 'firefox68'] },
});

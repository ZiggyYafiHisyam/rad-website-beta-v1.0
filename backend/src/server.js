/* RAD PlayStation backend: REST API + (in production) the built React app.
     dev:   npm run dev here (port 3001) + npm run dev in /frontend (Vite proxies /api)
     prod:  npm run build in /frontend, then npm start here — one server does both */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDb } from './db.js';
import { attachUser } from './auth.js';
import api from './routes/api.js';
import { HttpError } from './util.js';
import { resolveRedirect } from '../../frontend/src/routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, '../../frontend/dist');

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', process.env.TRUST_PROXY ? 1 : false);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  app.use('/api', express.json({ limit: '100kb' }), attachUser, api(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route' }));

  /* ---- the built site, with the same URL map as api/router.mjs ---- */
  if (fs.existsSync(DIST)) {
    app.use('/assets', express.static(path.join(DIST, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(DIST, { index: false }));
    app.get(/.*/, (req, res) => {
      const target = resolveRedirect(req.path);
      if (target) {
        const q = req.url.indexOf('?');
        return res.redirect(302, target + (q === -1 ? '' : req.url.slice(q)));
      }
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile('index.html', { root: DIST });
    });
  }

  /* eslint-disable-next-line no-unused-vars */
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    if (err && err.code && String(err.code).startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'That conflicts with existing data' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = createDb();
  const port = +process.env.PORT || 3001;
  createApp(db).listen(port, () => {
    console.log('RAD backend listening on http://localhost:' + port);
    if (!fs.existsSync(DIST)) console.log('(frontend/dist not built — API only. Use the Vite dev server for the UI.)');
  });
}

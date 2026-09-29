/* URL router for the deployed site.

   vercel.json serves the app for every real page path and sends everything
   else here: bare area roots (/admin, /owner), unknown sub-paths and trailing
   slashes. This answers with a redirect to the page that URL means, using the
   same table the React app routes with (frontend/src/routes.js). */
import { resolveRedirect, AREA_ENTRY } from '../frontend/src/routes.js';

export default function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  /* The rewrite passes the visitor's original path as ?path=… */
  const raw = url.searchParams.get('path');
  const path = raw === null ? url.pathname : '/' + raw.replace(/^\/+/, '');

  /* Keep any other query string (e.g. ?paid=true) on the way through */
  url.searchParams.delete('path');
  const query = url.searchParams.toString();

  const target = resolveRedirect(path) || AREA_ENTRY.customer;
  res.statusCode = 302;
  res.setHeader('Location', target + (query ? '?' + query : ''));
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

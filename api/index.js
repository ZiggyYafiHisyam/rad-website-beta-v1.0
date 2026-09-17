const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const requestedPath = (req.url || '/').split('?')[0];
  const allowedBaseRoutes = ['/', '/owner', '/owner/', '/admin', '/admin/', '/owner/login', '/admin/login'];

  if (!allowedBaseRoutes.includes(requestedPath) && !requestedPath.startsWith('/owner/') && !requestedPath.startsWith('/admin/')) {
    // Let the app handle customer routes like /tv/7, /payment/qris/12, etc.
    // We still serve the same app shell for all front-end routes.
  }

  const filePath = path.join(__dirname, '..', 'index.html');

  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Failed to load app shell.');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(html);
  });
};

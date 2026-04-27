/**
 * Custom Next.js server for Plesk Node.js deployment.
 *
 * Plesk's Phusion Passenger looks for `server.js` (or the file you configured
 * as "Application Startup File") and expects it to start an HTTP server.
 *
 * Steps to deploy on Plesk:
 *   1. Upload the project (or git clone) to the domain's document root.
 *   2. In Plesk → Node.js:
 *        - Node.js version: 20.x or newer
 *        - Application Mode: production
 *        - Application Root: /httpdocs (or your folder)
 *        - Application Startup File: server.js
 *   3. Click "NPM install".
 *   4. Run "npm run build" via Plesk's "Run script" → build.
 *   5. Restart the application.
 *
 * Required environment variables (set in Plesk → Node.js → Custom env):
 *   NODE_ENV=production
 *   NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
 *
 * Optional:
 *   PORT=3000        (Plesk/Passenger sets this automatically)
 *   HOSTNAME=0.0.0.0
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', req.url, err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    })
      .once('error', (err) => {
        console.error('Server error:', err);
        process.exit(1);
      })
      .listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
      });
  })
  .catch((err) => {
    console.error('Failed to start Next.js:', err);
    process.exit(1);
  });

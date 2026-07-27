// Standalone runner for local/Termux testing - NOT what Vercel uses in production
// (Vercel calls index.js's exported handler directly per request). This just wraps
// that same handler in a plain node:http server so you can run:
//   node local-server.js
// on a machine (or phone, via Termux) that doesn't have the Vercel CLI, and hit
// http://localhost:3000 in a browser.
//
// Storage note: without KV_REST_API_URL/KV_REST_API_TOKEN set, index.js falls back to
// an in-memory Map - fine for testing, but the list resets every time you stop this
// process. Set those two env vars (from a Vercel KV store) before running if you want
// this local server to share persistent data with your real Vercel deployment.

const http = require('http');
const fs = require('fs');
const path = require('path');
const handler = require('./index.js');

const PORT = process.env.PORT || 3000;
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'));

http.createServer(async (req, res) => {
  if (req.method === 'GET' && !req.url.startsWith('/api')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(indexHtml);
    return;
  }
  await handler(req, res);
}).listen(PORT, () => {
  console.log(`KHPets license server running at http://localhost:${PORT}`);
  console.log('(Local only - this is not reachable from the internet unless you tunnel it, e.g. with ngrok/cloudflared.)');
});

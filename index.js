// KHPets license / kill-switch server
// ------------------------------------
// One serverless function handling every /api/* route (see vercel.json for the
// routing). The KHPets plugin calls POST /api/ping on startup and every
// `license.check-interval-minutes`. The dashboard (index.html) calls GET /api/servers
// to list everything that has ever checked in, and POST /api/block to block/unblock
// a server by IP.
//
// Storage: uses Vercel KV (Upstash Redis) when KV_REST_API_URL / KV_REST_API_TOKEN
// are present (add a KV store to this project in the Vercel dashboard - the env vars
// are injected automatically once it's linked). Without a KV store this falls back to
// an in-memory Map, which is fine for local `vercel dev` testing but is NOT persistent
// in production (each cold start / region gets its own empty memory) - for a real
// kill-switch you want KV connected.
//
// Auth: every admin route (list/block) requires header `x-admin-key` to match the
// ADMIN_KEY environment variable you set on the Vercel project. /api/ping is public
// on purpose - it's how servers check in - and only ever reveals that one caller's own
// blocked/message status, never the whole list.

let kv = null;
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kv = require('@vercel/kv').kv;
  }
} catch (err) {
  console.warn('[license-server] @vercel/kv not available, falling back to in-memory store:', err.message);
}

const memoryStore = new Map();

async function getAll() {
  if (kv) {
    const keys = await kv.keys('server:*');
    if (!keys.length) return [];
    const values = await Promise.all(keys.map((k) => kv.get(k)));
    return values.filter(Boolean);
  }
  return Array.from(memoryStore.values());
}

async function getOne(ip) {
  if (kv) return (await kv.get('server:' + ip)) || null;
  return memoryStore.get(ip) || null;
}

async function saveOne(ip, record) {
  if (kv) {
    await kv.set('server:' + ip, record);
    return;
  }
  memoryStore.set(ip, record);
}

async function deleteOne(ip) {
  if (kv) {
    await kv.del('server:' + ip);
    return;
  }
  memoryStore.delete(ip);
}

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isAdmin(req) {
  const key = req.headers['x-admin-key'];
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        resolve({});
      }
    });
  });
}

async function handlePing(req, res) {
  const body = await readBody(req);
  const ip = getIp(req);
  const now = Date.now();

  let record = await getOne(ip);
  if (!record) {
    record = { ip, blocked: false, message: '', firstSeen: now };
  }
  record.plugin = body.plugin || record.plugin || 'unknown';
  record.version = body.version || record.version || '';
  record.server = body.server || record.server || '';
  record.players = typeof body.players === 'number' ? body.players : record.players || 0;
  record.lastSeen = now;

  await saveOne(ip, record);

  // Only ever tell the caller about ITS OWN status - never leak the full list here.
  res.status(200).json({ blocked: !!record.blocked, message: record.message || '' });
}

async function handleServers(req, res) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const all = await getAll();
  all.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  res.status(200).json({ servers: all, persistent: !!kv });
}

async function handleBlock(req, res) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const body = await readBody(req);
  const ip = body.ip;
  if (!ip) {
    res.status(400).json({ error: 'ip is required' });
    return;
  }
  let record = await getOne(ip);
  if (!record) {
    record = {
      ip,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      plugin: '',
      version: '',
      server: '',
      players: 0,
    };
  }
  record.blocked = !!body.blocked;
  record.message = body.message || '';
  await saveOne(ip, record);
  res.status(200).json({ ok: true, server: record });
}

async function handleRemove(req, res) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const body = await readBody(req);
  if (!body.ip) {
    res.status(400).json({ error: 'ip is required' });
    return;
  }
  await deleteOne(body.ip);
  res.status(200).json({ ok: true });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (path === '/api/ping' && req.method === 'POST') return await handlePing(req, res);
    if (path === '/api/servers' && req.method === 'GET') return await handleServers(req, res);
    if (path === '/api/block' && req.method === 'POST') return await handleBlock(req, res);
    if (path === '/api/remove' && req.method === 'POST') return await handleRemove(req, res);

    res.status(404).json({ error: 'not found' });
  } catch (err) {
    console.error('[license-server] error:', err);
    res.status(500).json({ error: 'internal error' });
  }
};

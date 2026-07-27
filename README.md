# KHPets License / IP-Block Dashboard

Small Node.js + Vercel app that:
- receives a check-in ping from every server running the KHPets plugin (`POST /api/ping`)
- lets you see all of them in a dashboard (`index.html`)
- lets you block/unblock any server **by IP** — a blocked server has its pets disabled
  immediately, and stays blocked even if the plugin is deleted and reinstalled, because
  the block is stored here (keyed by IP), not on the Minecraft server.

## Files
- `index.js` — one serverless function handling `/api/ping`, `/api/servers`, `/api/block`, `/api/remove`
- `index.html` — the dashboard UI (static page)
- `vercel.json` — routes `/api/*` to `index.js`, everything else to `index.html`
- `package.json` — dependency on `@vercel/kv` for persistent storage

## Deploy (GitHub + Vercel)
1. Push this `license-server/` folder to a GitHub repo (can be the same repo as the
   plugin, or its own — either works, since it's a standalone Vercel project).
2. On [vercel.com](https://vercel.com), **Add New Project** → import that GitHub repo.
   If it's a monorepo with the plugin source too, set the Vercel project's **Root
   Directory** to `license-server`.
3. In the Vercel project → **Storage** tab → **Create Database** → **KV**, and connect
   it to this project. This injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`
   automatically so the server list survives cold starts and redeploys.
   (Skip this and it still works, but the list resets whenever a serverless instance
   cold-starts — fine for testing, not for production.)
4. In the project's **Environment Variables**, add:
   - `ADMIN_KEY` — any long random string. This is what you type into the dashboard's
     "Admin key" box to view/block servers. Keep it secret — anyone with it can block
     any server.
5. Deploy. Every push to the connected GitHub branch auto-deploys.

## Point the plugin at it
In `config.yml` on each Minecraft server:
```yaml
license:
  enabled: true
  api-url: "https://your-project.vercel.app"
  plugin-id: "khpets"
  check-interval-minutes: 10
```
`/pet reload` re-checks immediately instead of waiting for the timer.

## Using the dashboard
Open your deployed URL (e.g. `https://your-project.vercel.app`), enter the `ADMIN_KEY`
you set above, and click **Load servers**. Each row is one IP that has pinged in, with
**Block**/**Unblock** buttons. A blocked server's console will show a clear red warning
and every active pet is deactivated within one check interval (or instantly on `/pet
reload`).

## Notes
- `/api/ping` is intentionally public (no admin key) — that's how servers check in —
  but it only ever returns that *one caller's own* status, never the full list.
- `/api/servers`, `/api/block`, and `/api/remove` all require the `x-admin-key` header
  to match `ADMIN_KEY`.
- The plugin fails **open**: if it can't reach `api-url` at all (DNS issue, server down,
  `api-url` left blank), it keeps the last known state instead of locking out an admin
  over a transient network blip.

# Axie Classic Draft (v2)

Tournament drafting tool for Axie Classic — rebuilt with:

- **Players authenticate with Discord** (OAuth → JWT session)
- **Admin authenticates with Ronin Wallet** (SIWE, unchanged)
- **Single-use join codes** per slot (admin DMs them to players)
- **Timer rewritten** — `endsAt`-based, never drifts, never stalls
- **Disconnect-tolerant** — timer keeps running; admin sees who's connected
- **Multi-room safe** — multiple parallel drafts supported
- **Spectator view** — read-only, no auth, no Discord identity leakage
- **Sky Mavis API key moved server-side** (was in the client bundle)

---

## Stack

- Monorepo: Bun workspaces + Turborepo
- Server: Colyseus 0.16 + Express
- Web: Next.js 15 (App Router) + Tailwind v4 + zustand + wagmi
- Auth: Discord OAuth (jose JWT) for players, SIWE (viem) for admin
- Hosting target: Railway (Dockerfiles included for both services)

---

## Quick Start (Local Dev)

```bash
# 1. Install deps
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env — fill in:
#   - JWT_SECRET (openssl rand -hex 32)
#   - DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET (from Discord dev portal)
#   - SKY_MAVIS_API_KEY (your existing key)
#   - ADMIN_WALLET_ADDRESS (your Ronin address, lowercase)

# 3. Run both apps
bun run dev
```

- Web: http://localhost:3000
- Game server: http://localhost:2567
- Colyseus monitor (dev only): http://localhost:2567/monitor

---

## Discord App Setup

1. Go to https://discord.com/developers/applications → New Application
2. OAuth2 → Add redirect URI: `https://your-web-domain/api/auth/discord/callback`
   For local dev also add: `http://localhost:3000/api/auth/discord/callback`
3. Copy Client ID + Client Secret into `.env`
4. Scopes used: `identify` (just username + avatar; no email, no Discord guild data)

---

## Files to copy from v1 repo

A few UI components and assets were left as placeholders here so the zip stays focused on
the logic changes. To restore the full visual experience, copy these from your existing
`classic-tournament-hud-main` repo:

**Components (drop in `apps/web/components/`):**
- `axies.tsx`
- `banning-pool.tsx`
- `banning-slot.tsx`
- `banning-indicator.tsx`
- `scoreboard.tsx`
- `scoreboard-logo.tsx`
- `ready-button.tsx`
- `player-indicator.tsx`
- `ui/` (entire shadcn dir)

**Two small edits to those components:**
- In `axies.tsx`: replace `warrior.address === address?.toLowerCase()` with
  `warrior.discordId === currentPlayerDiscordId`. The current player's discord ID comes
  from `useAuthStore().discordId`.
- In `scoreboard.tsx`: replace `warrior.name` with `warrior.displayName` (the schema field
  was renamed).

**Assets (drop in `apps/web/assets/` and `apps/web/public/`):**
- `assets/backgrounds/*.png`
- `assets/damage.png`, `assets/defense.png`
- `public/card-small/*`
- `public/data-compressed/*`
- `public/icons/*`
- `public/slots/*`
- `fonts/*`

**Styles (replace `apps/web/app/globals.css`):**
- Copy contents of v1's `apps/web/styles/globals.css` and `shadcn.css`.

**Spine/PIXI bits:**
- `centers/_game.ts`, `centers/axie-center.ts`
- `libs/event-emitter.ts`
- `hooks/use-inspector.ts`, `hooks/use-mobile.ts`, `hooks/use-toast.tsx`
- `configs/slot.ts`
- `packages/axie-mixer/*` — copy the whole package, add it to root `workspaces` if
  needed (already is).

**Battle and spectator pages:**
- The placeholder UIs in `app/battle/[id]/page.tsx` and `app/spectator/[id]/page.tsx` are
  intentionally minimal. Replace their bodies with v1's `app/battle/[id]/page.tsx` and
  `app/inspect/[id]/page.tsx` markup respectively, applying the two component edits above.

---

## Deploying to Railway

1. **Create a Railway project** with two services from this single GitHub repo.
2. **Server service:**
   - Root directory: `/`
   - Build: Dockerfile at `apps/server/Dockerfile`
   - Env vars: all `SERVER` ones from `.env.example`
   - Expose port `2567`
3. **Web service:**
   - Root directory: `/`
   - Build: Dockerfile at `apps/web/Dockerfile`
   - Build-time args (Railway → Variables → Build):
     - `NEXT_PUBLIC_COLYSEUS_WS_URL=wss://<your-server-domain>`
     - `NEXT_PUBLIC_COLYSEUS_HTTP_URL=https://<your-server-domain>`
   - Runtime env vars: all `WEB` ones from `.env.example`
   - Expose port `3000`
4. **CORS:** Set the server's `CORS_ORIGIN` to the web service's public URL.
5. **Discord:** Update the redirect URI in the Discord dev portal to point at the
   deployed web service.

---

## How a draft works (player UX)

1. Admin opens `/admin`, signs in with Ronin Wallet
2. Admin clicks **Create Room** → gets a room ID + two join codes (left/right)
3. Admin DMs each player their code on Discord
4. Player opens the share link `https://<web>/warrior?room=<id>&code=<code>`
5. Player clicks **Continue with Discord** → OAuth → returns to warrior page
6. Player clicks **Join Room**
7. Admin verifies the right Discord user joined the right slot (admin panel shows green
   dot + Discord username)
8. Both players hit **Ready** → draft starts
9. Spectator view at `/spectator/<room-id>` for OBS streaming

---

## Display names on stream

- The HUD on the spectator (streaming) view shows **`warrior.displayName`**, which is
  set by the **admin** in the admin panel.
- Discord usernames are **never** shown on the spectator view — only in the admin panel
  for identity verification.
- This is how pro esports broadcasts work: stage name vs real handle.

---

## What was fixed vs v1

### Timer bugs (sudden stoppage)

v1 decremented `state.countdown -= 1000` every second AND scheduled a separate timeout
for total duration. Under load, those two could drift apart → countdown freezes at a
non-zero value until the timeout finally fired.

v2 stores `endsAt` (absolute server clock time). The 1s tick just **broadcasts**
`remaining = endsAt - now`. The timeout fires once. Both are derived from the same
source of truth, so drift is impossible.

### Disconnect/draft-not-ending

v1's `onLeave` allowed 20s reconnection, and if it failed silently nothing advanced. If
the active banner dropped, the draft could hang indefinitely.

v2:
- 180-second reconnection window (configurable in `constants.ts`)
- Timer NEVER pauses for disconnects — it always runs
- If a turn timer expires with pending bans, they're forfeited and the draft advances
- Admin has a **Force-skip turn** button as an escape hatch
- Admin sees green/red connection indicators per slot
- Player reconnect rebinds by `discordId`, not session id, so a new Colyseus session
  picks up the same slot state

### Other fixes

- Sky Mavis API key moved server-side (was in the client bundle)
- Server URL moved to env vars (was hardcoded in `packages/shared/constants.ts`)
- Multi-room reconnection state is keyed by room ID (was a single token, so reconnecting
  to room B with a stale token from room A would fail)
- Spectator view will never leak Discord usernames to the broadcast
- Admin panel shows real-time per-player connection status

---

## Roadmap (not in this build, recommended next)

- Persist completed drafts to Postgres (Railway add-on) → past drafts view, stats
- Discord webhook on draft completion (post result to a channel)
- `@colyseus/testing` test suite for the state machine (room is in the dep list,
  no tests written yet)
- Admin "undo last turn" button

---

## License

MIT (or whatever you prefer — add a LICENSE file)

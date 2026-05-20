import { verifyPlayerToken } from '@/auth/jwt'
import { verifyAdminSiwe } from '@/auth/siwe'
import { env } from '@/configs/env'
import { requireAdmin } from '@/middlewares/auth'
import { BanningRoom } from '@/rooms/banning'
import { generateJoinCode, normalizeJoinCode } from '@/utils/codes'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import config from '@colyseus/tools'
import { Role } from '@repo/shared/constants'
import { Side } from '@repo/shared/types'
import { matchMaker } from 'colyseus'
import cors from 'cors'
import { Encoder } from '@colyseus/schema'

// Allow large state syncs for ~10-axie pools.
Encoder.BUFFER_SIZE = 32 * 1024

// Expose matchmaker controller methods needed for direct joining.
matchMaker.controller.exposedMethods = ['reconnect', 'joinById']

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define('banning', BanningRoom)
  },

  initializeExpress: (app) => {
    app.use(
      cors({
        origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
        credentials: true,
      })
    )

    if (env.NODE_ENV !== 'production') {
      app.use('/playground', playground())
    }

    // ----------------------------------------------------------------
    // Health
    // ----------------------------------------------------------------
    app.get('/health', (_req, res) => {
      res.json({
        ok: true,
        rooms: matchMaker.stats.local.roomCount,
        ts: Date.now(),
      })
    })

    app.get('/rooms', async (_req, res) => {
      res.json({ count: matchMaker.stats.local.roomCount })
    })

    // ----------------------------------------------------------------
    // ADMIN: create a room
    // Returns { roomId, joinCodes: [{side, code}, {side, code}] }
    // ----------------------------------------------------------------
    app.post('/create-room', requireAdmin, async (_req, res) => {
      try {
        const leftCode = generateJoinCode()
        const rightCode = generateJoinCode()

        // Pass join codes as room creation options. BanningRoom.onCreate reads these and
        // pre-creates the warrior slots so admins can immediately share the codes.
        const room = await matchMaker.createRoom('banning', {
          joinCodes: [
            { side: 'left' as Side, code: leftCode },
            { side: 'right' as Side, code: rightCode },
          ],
        })

        return res.json({
          roomId: room.roomId,
          joinCodes: [
            { side: 'left' as Side, code: leftCode },
            { side: 'right' as Side, code: rightCode },
          ],
        })
      } catch (err) {
        console.error('[/create-room] error:', err)
        return res.status(500).json({ error: 'Failed to create room' })
      }
    })

    // ----------------------------------------------------------------
    // ADMIN: join a room as admin/operator (returns seat reservation for WS)
    // ----------------------------------------------------------------
    app.post('/join-admin/:roomId', requireAdmin, async (req, res) => {
      try {
        const reservation = await matchMaker.joinById(req.params.roomId, {
          __role: req.auth!.role,
          __adminAddress: req.auth!.address,
        })
        return res.json(reservation)
      } catch (err) {
        console.error('[/join-admin] error:', err)
        return res.status(400).json({ error: 'Failed to join as admin' })
      }
    })

    // ----------------------------------------------------------------
    // WARRIOR: join a room with Discord JWT + join code
    // Body: { playerToken, joinCode }
    // ----------------------------------------------------------------
    app.post('/join-warrior/:roomId', async (req, res) => {
      try {
        const { playerToken, joinCode } = req.body ?? {}
        if (!playerToken || !joinCode) {
          return res.status(400).json({ error: 'Missing playerToken or joinCode' })
        }
        const player = await verifyPlayerToken(playerToken).catch(() => null)
        if (!player) return res.status(401).json({ error: 'Invalid player token' })

        const reservation = await matchMaker.joinById(req.params.roomId, {
          joinCode: normalizeJoinCode(joinCode),
          __role: Role.WARRIOR,
          __discordId: player.discordId,
          __discordUsername: player.discordUsername,
          __discordAvatar: player.discordAvatar,
        })
        return res.json(reservation)
      } catch (err) {
        console.error('[/join-warrior] error:', err)
        return res.status(400).json({ error: 'Failed to join as warrior' })
      }
    })

    // ----------------------------------------------------------------
    // SPECTATOR: join a room as a read-only viewer (no auth)
    // ----------------------------------------------------------------
    app.post('/join-spectator/:roomId', async (req, res) => {
      try {
        const reservation = await matchMaker.joinById(req.params.roomId, {
          __role: Role.SPECTATOR,
        })
        return res.json(reservation)
      } catch (err) {
        console.error('[/join-spectator] error:', err)
        return res.status(400).json({ error: 'Failed to join as spectator' })
      }
    })

    // ----------------------------------------------------------------
    // AXIE DATA PROXY — keep Sky Mavis API key server-side
    // ----------------------------------------------------------------
    app.post('/axies/fetch', async (req, res) => {
      try {
        const { axieIds } = req.body ?? {}
        if (!Array.isArray(axieIds) || axieIds.length === 0) {
          return res.status(400).json({ error: 'axieIds must be a non-empty array' })
        }
        const safe = axieIds.filter((id: unknown) => typeof id === 'string' && /^\d+$/.test(id))
        if (safe.length === 0) return res.status(400).json({ error: 'no valid axie ids' })

        const query = buildAxieQuery(safe)
        const response = await fetch('https://api-gateway.skymavis.com/graphql/axie-marketplace', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.SKY_MAVIS_API_KEY,
          },
          body: JSON.stringify({ query }),
        })
        if (!response.ok) {
          return res.status(502).json({ error: 'upstream error' })
        }
        const json = await response.json()
        return res.json(json)
      } catch (err) {
        console.error('[/axies/fetch] error:', err)
        return res.status(500).json({ error: 'Failed to fetch axies' })
      }
    })

    // ----------------------------------------------------------------
    // SIWE NONCE — admin sign-in flow on the web
    // ----------------------------------------------------------------
    app.post('/siwe/verify', async (req, res) => {
      const { message, signature } = req.body ?? {}
      const result = await verifyAdminSiwe(message, signature)
      if (!result.ok) return res.status(401).json({ error: result.error })
      return res.json({ ok: true, address: result.address, role: result.role })
    })

    // ----------------------------------------------------------------
    // Colyseus monitor (dev only, behind a simple env-gate in prod if needed)
    // ----------------------------------------------------------------
    if (env.NODE_ENV !== 'production') {
      app.use('/monitor', monitor())
    }
  },

  beforeListen: () => {
    console.log(`[server] starting on port ${env.PORT}, env=${env.NODE_ENV}`)
  },
})

function buildAxieQuery(ids: string[]): string {
  return `query Axies {
    ${ids
      .map(
        (id) => `axie${id}: axie(axieId: "${id}") {
      bodyShape
      title
      class
      newGenes
      parts {
        abilities {
          attack
          defense
          energy
          id
        }
      }
    }`
      )
      .join('\n')}
  }`
}

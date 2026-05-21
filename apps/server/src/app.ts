import { verifyPlayerToken } from '@/auth/jwt'
import { env, isAdminDiscordId } from '@/configs/env'
import { requireAdmin } from '@/middlewares/auth'
import { BanningRoom } from '@/rooms/banning'
import { generateJoinCode, normalizeJoinCode } from '@/utils/codes'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import config from '@colyseus/tools'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { Role } from '@repo/shared/constants'
import { Side } from '@repo/shared/types'
import { matchMaker } from 'colyseus'
import cors from 'cors'
import { Encoder } from '@colyseus/schema'

Encoder.BUFFER_SIZE = 32 * 1024

matchMaker.controller.exposedMethods = ['reconnect', 'joinById']

export default config({
  options: { transport: new WebSocketTransport() },
  options: {
    transport: new WebSocketTransport(),
  },
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

    app.get('/health', (_req, res) => {
      res.json({
        ok: true,
        rooms: matchMaker.stats.local.roomCount,
        ts: Date.now(),
      })
    })

    // ----------------------------------------------------------------
    // ADMIN: create a room (Discord JWT, must be in ADMIN_DISCORD_IDS)
    // ----------------------------------------------------------------
    app.post('/create-room', requireAdmin, async (_req, res) => {
      try {
        const leftCode = generateJoinCode()
        const rightCode = generateJoinCode()

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
    // ADMIN: join a room as admin
    // ----------------------------------------------------------------
    app.post('/join-admin/:roomId', requireAdmin, async (req, res) => {
      try {
        const reservation = await matchMaker.joinById(req.params.roomId, {
          __role: Role.ADMIN,
          __discordId: req.auth!.player.discordId,
          __discordUsername: req.auth!.player.discordUsername,
        })
        return res.json(reservation)
      } catch (err) {
        console.error('[/join-admin] error:', err)
        return res.status(400).json({ error: 'Failed to join as admin' })
      }
    })

    // ----------------------------------------------------------------
    // WARRIOR: join a room with Discord JWT + join code
    // ----------------------------------------------------------------
    app.post('/join-warrior/:roomId', async (req, res) => {
      try {
        const { playerToken, joinCode } = req.body ?? {}
        if (!playerToken || !joinCode) {
          return res.status(400).json({ error: 'Missing playerToken or joinCode' })
        }
        const player = await verifyPlayerToken(playerToken).catch(() => null)
        if (!player) return res.status(401).json({ error: 'Invalid player token' })

        // Admin should not be able to join as warrior. (Optional — comment out to allow.)
        if (isAdminDiscordId(player.discordId)) {
          return res.status(400).json({ error: 'Admins cannot join as warriors' })
        }

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
    // SPECTATOR: read-only, no auth
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
    // AXIE DATA PROXY
    // ----------------------------------------------------------------
    app.post('/axies/fetch', async (req, res) => {
      try {
        const { axieIds } = req.body ?? {}
        if (!Array.isArray(axieIds) || axieIds.length === 0) {
          return res.status(400).json({ error: 'axieIds must be a non-empty array' })
        }
        if (!env.SKY_MAVIS_API_KEY) {
          return res.status(503).json({ error: 'SKY_MAVIS_API_KEY not configured on server' })
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

    if (env.NODE_ENV !== 'production') {
      app.use('/monitor', monitor())
    }
  },

  beforeListen: () => {
    console.log(`[server] starting on port ${env.PORT}, env=${env.NODE_ENV}`)
    console.log(`[server] admin discord IDs:`, env.ADMIN_DISCORD_IDS)
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

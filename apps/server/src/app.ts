import { verifyPlayerToken } from '@/auth/jwt'
import { env, isAdminDiscordId } from '@/configs/env'
import { requireOperator } from '@/middlewares/auth'
import { generateJoinCode } from '@/utils/codes'
import { Role } from '@repo/shared/constants'
import { Side } from '@repo/shared/types'
import { matchMaker } from 'colyseus'
import { Express } from 'express'

matchMaker.controller.exposedMethods = ['reconnect', 'joinById']

export function registerRoutes(app: Express) {
  app.get('/health', (_req, res) => {
    res.json({ ok: true, rooms: matchMaker.stats.local.roomCount, ts: Date.now() })
  })

  app.post('/create-room', requireOperator, async (req, res) => {
    try {
      console.log('[/create-room] by', req.auth?.player.discordUsername, `(${req.auth?.role})`)
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
      console.error('[/create-room]', err)
      return res.status(500).json({ error: 'Failed to create room' })
    }
  })

  app.post('/axies/fetch', async (req, res) => {
    try {
      const { axieIds } = req.body ?? {}
      if (!Array.isArray(axieIds) || axieIds.length === 0) {
        return res.status(400).json({ error: 'axieIds must be a non-empty array' })
      }
      if (!env.SKY_MAVIS_API_KEY) {
        return res.status(503).json({ error: 'SKY_MAVIS_API_KEY not configured' })
      }
      const safe = axieIds.filter((id: unknown) => typeof id === 'string' && /^\d+$/.test(id))
      if (safe.length === 0) return res.status(400).json({ error: 'no valid axie ids' })
      const response = await fetch('https://api-gateway.skymavis.com/graphql/axie-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.SKY_MAVIS_API_KEY },
        body: JSON.stringify({ query: buildAxieQuery(safe) }),
      })
      if (!response.ok) return res.status(502).json({ error: 'upstream error' })
      return res.json(await response.json())
    } catch (err) {
      console.error('[/axies/fetch]', err)
      return res.status(500).json({ error: 'Failed to fetch axies' })
    }
  })
}

function buildAxieQuery(ids: string[]): string {
  return `query Axies {
    ${ids.map((id) => `axie${id}: axie(axieId: "${id}") {
      bodyShape title class newGenes
      parts { abilities { attack defense energy id } }
    }`).join('\n')}
  }`
}

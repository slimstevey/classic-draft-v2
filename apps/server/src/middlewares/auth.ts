import { verifyPlayerToken } from '@/auth/jwt'
import { isAdminDiscordId } from '@/configs/env'
import { NextFunction, Request, Response } from 'express'
import { Role } from '@repo/shared/constants'
import { PlayerSession } from '@repo/shared/types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        role: Role
        player: PlayerSession
      }
    }
  }
}

/**
 * Require admin role. The Discord JWT determines the user; ADMIN_DISCORD_IDS env var
 * determines whether that user is allowed admin privileges.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  ;(async () => {
    const token = extractToken(req)
    if (!token) return res.status(401).json({ error: 'Missing player token' })
    try {
      const payload = await verifyPlayerToken(token)
      if (!isAdminDiscordId(payload.discordId)) {
        return res.status(403).json({ error: 'Not an admin' })
      }
      req.auth = { role: Role.ADMIN, player: payload }
      next()
    } catch {
      return res.status(401).json({ error: 'Invalid player token' })
    }
  })().catch(next)
}

/**
 * Require any valid Discord token (warrior).
 */
export function requireWarrior(req: Request, res: Response, next: NextFunction): void {
  ;(async () => {
    const token = extractToken(req)
    if (!token) return res.status(401).json({ error: 'Missing player token' })
    try {
      const payload = await verifyPlayerToken(token)
      const role = isAdminDiscordId(payload.discordId) ? Role.ADMIN : Role.WARRIOR
      req.auth = { role, player: payload }
      next()
    } catch {
      return res.status(401).json({ error: 'Invalid player token' })
    }
  })().catch(next)
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  const bearer = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : null
  return bearer ?? req.body?.playerToken ?? null
}

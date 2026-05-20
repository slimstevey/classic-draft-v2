import { verifyPlayerToken } from '@/auth/jwt'
import { verifyAdminSiwe } from '@/auth/siwe'
import { NextFunction, Request, Response } from 'express'
import { Role } from '@repo/shared/constants'
import { PlayerSession } from '@repo/shared/types'

// Augment Express request with auth context for downstream handlers.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        role: Role
        // Admin/operator
        address?: string
        // Warrior
        player?: PlayerSession
      }
    }
  }
}

/**
 * Require admin/operator SIWE auth. Reads { message, signature } from request body.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  ;(async () => {
    const { message, signature } = req.body ?? {}
    if (!message || !signature) {
      return res.status(401).json({ error: 'Missing message or signature' })
    }
    const result = await verifyAdminSiwe(message, signature)
    if (!result.ok) {
      return res.status(401).json({ error: result.error })
    }
    req.auth = { role: result.role, address: result.address }
    next()
  })().catch(next)
}

/**
 * Require warrior JWT auth. Reads token from Authorization: Bearer <token> or body.playerToken.
 */
export function requireWarrior(req: Request, res: Response, next: NextFunction): void {
  ;(async () => {
    const authHeader = req.headers.authorization
    const bearer = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : null
    const token = bearer ?? req.body?.playerToken ?? null
    if (!token) {
      return res.status(401).json({ error: 'Missing player token' })
    }
    try {
      const payload = await verifyPlayerToken(token)
      req.auth = { role: Role.WARRIOR, player: payload }
      next()
    } catch (err) {
      return res.status(401).json({ error: 'Invalid player token' })
    }
  })().catch(next)
}

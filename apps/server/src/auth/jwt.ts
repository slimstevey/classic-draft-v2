import { jwtVerify, SignJWT } from 'jose'
import { env } from '@/configs/env'
import { PlayerSession } from '@repo/shared/types'

const secretKey = new TextEncoder().encode(env.JWT_SECRET)

/**
 * Sign a player session token. Called by the web layer after Discord OAuth completes.
 * The server side also exposes this so the web app can hit a sign endpoint if desired,
 * but typically the web app signs its own using the shared JWT_SECRET.
 */
export async function signPlayerToken(payload: {
  discordId: string
  discordUsername: string
  discordAvatar: string | null
}): Promise<string> {
  return await new SignJWT({
    discordId: payload.discordId,
    discordUsername: payload.discordUsername,
    discordAvatar: payload.discordAvatar,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey)
}

/**
 * Verify a player session token. Returns the payload or throws.
 */
export async function verifyPlayerToken(token: string): Promise<PlayerSession> {
  const { payload } = await jwtVerify(token, secretKey)
  if (typeof payload.discordId !== 'string' || typeof payload.discordUsername !== 'string') {
    throw new Error('Invalid player token payload')
  }
  return payload as unknown as PlayerSession
}

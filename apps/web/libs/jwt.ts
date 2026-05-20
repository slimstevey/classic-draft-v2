import { jwtVerify, SignJWT } from 'jose'
import { serverEnv } from '@/env'

function key() {
  return new TextEncoder().encode(serverEnv().JWT_SECRET)
}

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
    .sign(key())
}

export async function verifyPlayerToken(token: string) {
  const { payload } = await jwtVerify(token, key())
  return payload as { discordId: string; discordUsername: string; discordAvatar: string | null; iat: number; exp: number }
}

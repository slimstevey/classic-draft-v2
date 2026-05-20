import { NextResponse } from 'next/server'
import { getPlayerCookie } from '@/libs/cookies'
import { verifyPlayerToken } from '@/libs/jwt'

export async function GET() {
  const token = await getPlayerCookie()
  if (!token) return NextResponse.json({ authenticated: false }, { status: 200 })
  try {
    const payload = await verifyPlayerToken(token)
    return NextResponse.json({
      authenticated: true,
      playerToken: token,
      user: {
        discordId: payload.discordId,
        discordUsername: payload.discordUsername,
        discordAvatar: payload.discordAvatar,
      },
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}

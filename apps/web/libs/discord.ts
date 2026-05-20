import { serverEnv } from '@/env'

const DISCORD_BASE = 'https://discord.com/api/v10'

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const env = serverEnv()
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    response_type: 'code',
    scope: 'identify',
    redirect_uri: redirectUri,
    state,
    prompt: 'none', // skip the consent screen if previously authorized
  })
  return `https://discord.com/oauth2/authorize?${params.toString()}`
}

export interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface DiscordUser {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
  discriminator: string
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<DiscordTokenResponse> {
  const env = serverEnv()
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })
  const res = await fetch(`${DISCORD_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    throw new Error(`Discord token exchange failed: ${res.status}`)
  }
  return (await res.json()) as DiscordTokenResponse
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`Discord user fetch failed: ${res.status}`)
  }
  return (await res.json()) as DiscordUser
}

export function avatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
}

/** Best human-readable username (Discord deprecated discriminator for most users). */
export function displayUsername(user: DiscordUser): string {
  return user.global_name ?? user.username
}

import { cookies } from 'next/headers'

export const PLAYER_TOKEN_COOKIE = 'acd_player_token'
export const OAUTH_STATE_COOKIE = 'acd_oauth_state'

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

export async function setPlayerCookie(token: string) {
  ;(await cookies()).set(PLAYER_TOKEN_COOKIE, token, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24, // 24 hours
  })
}

export async function clearPlayerCookie() {
  ;(await cookies()).delete(PLAYER_TOKEN_COOKIE)
}

export async function getPlayerCookie(): Promise<string | null> {
  const c = (await cookies()).get(PLAYER_TOKEN_COOKIE)
  return c?.value ?? null
}

export async function setOAuthStateCookie(state: string) {
  ;(await cookies()).set(OAUTH_STATE_COOKIE, state, {
    ...COOKIE_OPTS,
    maxAge: 60 * 10, // 10 minutes
  })
}

export async function getOAuthStateCookie(): Promise<string | null> {
  const c = (await cookies()).get(OAUTH_STATE_COOKIE)
  return c?.value ?? null
}

export async function clearOAuthStateCookie() {
  ;(await cookies()).delete(OAUTH_STATE_COOKIE)
}

import { NextRequest, NextResponse } from 'next/server'
import { avatarUrl, displayUsername, exchangeCodeForToken, fetchDiscordUser } from '@/libs/discord'
import { clearOAuthStateCookie, getOAuthStateCookie, setPlayerCookie } from '@/libs/cookies'
import { signPlayerToken } from '@/libs/jwt'
import { serverEnv } from '@/env'

export async function GET(req: NextRequest) {
  const env = serverEnv()
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(`${env.PUBLIC_WEB_URL}/warrior?error=${encodeURIComponent(errorParam)}`)
  }
  if (!code || !stateRaw) {
    return NextResponse.redirect(`${env.PUBLIC_WEB_URL}/warrior?error=missing_code`)
  }

  // Decode and CSRF-verify the state.
  let parsedState: { csrf: string; redirect: string }
  try {
    const decoded = Buffer.from(stateRaw, 'base64url').toString('utf-8')
    parsedState = JSON.parse(decoded)
  } catch {
    return NextResponse.redirect(`${env.PUBLIC_WEB_URL}/warrior?error=bad_state`)
  }

  const storedCsrf = await getOAuthStateCookie()
  await clearOAuthStateCookie()
  if (!storedCsrf || storedCsrf !== parsedState.csrf) {
    return NextResponse.redirect(`${env.PUBLIC_WEB_URL}/warrior?error=csrf`)
  }

  try {
    const redirectUri = `${env.PUBLIC_WEB_URL}/api/auth/discord/callback`
    const token = await exchangeCodeForToken(code, redirectUri)
    const user = await fetchDiscordUser(token.access_token)

    const playerToken = await signPlayerToken({
      discordId: user.id,
      discordUsername: displayUsername(user),
      discordAvatar: avatarUrl(user),
    })
    await setPlayerCookie(playerToken)

    const safeRedirect = parsedState.redirect.startsWith('/') ? parsedState.redirect : '/warrior'
    return NextResponse.redirect(`${env.PUBLIC_WEB_URL}${safeRedirect}`)
  } catch (err) {
    console.error('[discord callback] error:', err)
    return NextResponse.redirect(`${env.PUBLIC_WEB_URL}/warrior?error=oauth_failed`)
  }
}

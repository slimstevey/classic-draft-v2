import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { buildAuthorizeUrl } from '@/libs/discord'
import { setOAuthStateCookie } from '@/libs/cookies'
import { serverEnv } from '@/env'

export async function GET(req: NextRequest) {
  const env = serverEnv()
  const url = new URL(req.url)

  // Where to send the user after the OAuth dance completes. Default: /warrior.
  const redirectAfter = url.searchParams.get('redirect') ?? '/warrior'

  // Random state to defend against CSRF — also encodes the post-auth redirect.
  const csrf = randomBytes(16).toString('hex')
  const state = JSON.stringify({ csrf, redirect: redirectAfter })
  const encodedState = Buffer.from(state).toString('base64url')

  await setOAuthStateCookie(csrf)

  const redirectUri = `${env.PUBLIC_WEB_URL}/api/auth/discord/callback`
  const authorizeUrl = buildAuthorizeUrl(encodedState, redirectUri)

  return NextResponse.redirect(authorizeUrl)
}

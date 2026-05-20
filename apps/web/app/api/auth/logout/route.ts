import { NextResponse } from 'next/server'
import { clearPlayerCookie } from '@/libs/cookies'

export async function POST() {
  await clearPlayerCookie()
  return NextResponse.json({ ok: true })
}

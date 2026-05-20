'use client'

import { COLYSEUS_HTTP } from '@/libs/colyseus'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

export default function WarriorPage() {
  return (
    <Suspense fallback={<div className='p-8'>Loading…</div>}>
      <Inner />
    </Suspense>
  )
}

function Inner() {
  const router = useRouter()
  const search = useSearchParams()
  const { playerToken, discordUsername, discordAvatar, setPlayerSession, clearPlayerSession } = useAuthStore()

  const [roomId, setRoomId] = useState(search.get('room') ?? '')
  const [joinCode, setJoinCode] = useState(search.get('code') ?? '')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(search.get('error'))

  // On mount, sync session from /api/auth/me (so a returning user picks up their cookie).
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setPlayerSession({
            playerToken: data.playerToken,
            discordId: data.user.discordId,
            discordUsername: data.user.discordUsername,
            discordAvatar: data.user.discordAvatar,
          })
        } else {
          clearPlayerSession()
        }
      })
      .catch(() => clearPlayerSession())
  }, [setPlayerSession, clearPlayerSession])

  const login = () => {
    const redirect = `/warrior?${search.toString()}`
    window.location.href = `/api/auth/discord/login?redirect=${encodeURIComponent(redirect)}`
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearPlayerSession()
  }

  const joinRoom = async () => {
    setError(null)
    if (!playerToken || !roomId.trim() || !joinCode.trim()) return
    setJoining(true)
    try {
      const res = await fetch(`${COLYSEUS_HTTP}/join-warrior/${roomId.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerToken, joinCode: joinCode.trim() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? `Failed to join (HTTP ${res.status})`)
        setJoining(false)
        return
      }
      // Stash the code so NetworkProvider can re-attach on reconnect to this room.
      localStorage.setItem(`acd:joinCode:${roomId.trim()}`, joinCode.trim())
      router.push(`/battle/${roomId.trim()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setJoining(false)
    }
  }

  return (
    <main className='flex min-h-screen w-full items-center justify-center p-6'>
      <div className='w-full max-w-md border rounded-lg p-6 flex flex-col gap-4'>
        <h1 className='text-xl font-bold'>Warrior — Join Draft</h1>

        {error && (
          <div className='text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-red-300'>{error}</div>
        )}

        {playerToken ? (
          <div className='flex items-center gap-3 border rounded p-3'>
            {discordAvatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={discordAvatar} alt='avatar' className='w-10 h-10 rounded-full' />
            )}
            <div className='flex-1'>
              <div className='text-sm opacity-70'>Logged in as</div>
              <div className='font-medium'>{discordUsername}</div>
            </div>
            <button onClick={logout} className='text-xs underline opacity-70 hover:opacity-100'>
              Log out
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className='bg-[#5865F2] hover:bg-[#4752c4] text-white rounded px-4 py-3 font-medium transition-colors'>
            Continue with Discord
          </button>
        )}

        <div className='flex flex-col gap-2'>
          <label className='text-sm'>Room ID</label>
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder='e.g. abc123'
            className='border rounded px-3 py-2 bg-transparent'
          />
        </div>
        <div className='flex flex-col gap-2'>
          <label className='text-sm'>Join Code</label>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder='e.g. K7M2-X9PL'
            className='border rounded px-3 py-2 bg-transparent font-mono uppercase'
          />
          <p className='text-xs opacity-60'>The admin will DM you this code.</p>
        </div>

        <button
          onClick={joinRoom}
          disabled={!playerToken || !roomId.trim() || !joinCode.trim() || joining}
          className='border rounded px-4 py-2 disabled:opacity-40 hover:bg-white/5 disabled:cursor-not-allowed'>
          {joining ? 'Joining…' : 'Join Room'}
        </button>
      </div>
    </main>
  )
}

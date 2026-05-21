'use client'

import { COLYSEUS_HTTP } from '@/libs/colyseus'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminPage() {
  const router = useRouter()
  const { playerToken, discordUsername, discordAvatar, setPlayerSession, clearPlayerSession } = useAuthStore()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    window.location.href = `/api/auth/discord/login?redirect=${encodeURIComponent('/admin')}`
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearPlayerSession()
  }

  const createRoom = async () => {
    if (!playerToken) return
    setError(null)
    setCreating(true)
    try {
      const res = await fetch(`${COLYSEUS_HTTP}/create-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${playerToken}`,
        },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? `Failed (HTTP ${res.status})`)
        return
      }
      const data: { roomId: string; joinCodes: { side: string; code: string }[] } = await res.json()
      localStorage.setItem(`acd:joinCodes:${data.roomId}`, JSON.stringify(data.joinCodes))
      router.push(`/admin/room/${data.roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className='flex min-h-screen w-full items-center justify-center p-6'>
      <div className='w-full max-w-md border rounded-lg p-6 flex flex-col gap-4'>
        <h1 className='text-xl font-bold'>Admin — Create Room</h1>
        {error && (
          <div className='text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-red-300'>{error}</div>
        )}

        {playerToken ? (
          <>
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
            <button
              onClick={createRoom}
              disabled={creating}
              className='border rounded px-4 py-2 disabled:opacity-40 hover:bg-white/5'>
              {creating ? 'Creating…' : 'Create Room'}
            </button>
            <p className='text-xs opacity-50'>
              If you see &quot;Not an admin&quot;, your Discord ID isn&apos;t in the server&apos;s
              <code className='mx-1'>ADMIN_DISCORD_IDS</code> env var.
            </p>
          </>
        ) : (
          <button
            onClick={login}
            className='bg-[#5865F2] hover:bg-[#4752c4] text-white rounded px-4 py-3 font-medium transition-colors'>
            Continue with Discord
          </button>
        )}
      </div>
    </main>
  )
}

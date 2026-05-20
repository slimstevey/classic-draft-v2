'use client'

import { COLYSEUS_HTTP } from '@/libs/colyseus'
import { createSiweMessage } from '@/libs/utils'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi'

const ALLOWED_WALLET_IDS = ['RONIN_WALLET', 'WAYPOINT']

export default function AdminPage() {
  const router = useRouter()
  const { connectors, connect } = useConnect()
  const { address, isConnected, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const { setAdminCredentials } = useAuthStore()

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRoom = async () => {
    if (!address) return
    setError(null)
    setCreating(true)
    try {
      const message = createSiweMessage(address, 'Create a draft room')
      const signature = await signMessageAsync({ message })
      const res = await fetch(`${COLYSEUS_HTTP}/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature, address: address.toLowerCase() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? `Failed (HTTP ${res.status})`)
        return
      }
      const data: { roomId: string; joinCodes: { side: string; code: string }[] } = await res.json()
      setAdminCredentials({ address, message, signature })
      // Stash the join codes locally so the admin room page can show them.
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
        {error && <div className='text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-red-300'>{error}</div>}

        {isConnected && address ? (
          <>
            <div className='border rounded p-3 text-sm'>
              <div className='opacity-60'>Connected</div>
              <div className='font-mono break-all mt-1'>{address.toLowerCase()}</div>
              <div className='opacity-60 mt-1'>Wallet: {connector?.name ?? '—'}</div>
            </div>
            <button
              onClick={createRoom}
              disabled={creating}
              className='border rounded px-4 py-2 disabled:opacity-40 hover:bg-white/5'>
              {creating ? 'Creating…' : 'Create Room'}
            </button>
            <button onClick={() => disconnect()} className='text-xs underline opacity-60 hover:opacity-100'>
              Disconnect
            </button>
          </>
        ) : (
          <div className='flex flex-col gap-2'>
            {connectors
              .filter((c) => ALLOWED_WALLET_IDS.includes(c.id))
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => connect({ connector: c })}
                  className='border rounded px-4 py-2 text-left hover:bg-white/5'>
                  {c.name}
                </button>
              ))}
          </div>
        )}
      </div>
    </main>
  )
}

'use client'

import colyseus, { COLYSEUS_HTTP } from '@/libs/colyseus'
import { useAuthStore } from '@/stores/auth'
import { useBanningStore } from '@/stores/banning'
import { useRoomStore } from '@/stores/room'
import { useStatusStore } from '@/stores/status'
import { MESSAGES } from '@repo/shared/constants'
import { BanningState } from '@repo/shared/states'
import { CountdownUpdatePayload } from '@repo/shared/types'
import { getStateCallbacks, Room } from 'colyseus.js'
import { useParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

type Mode = 'admin' | 'warrior' | 'spectator'

export default function NetworkProvider({ children, mode }: { children: React.ReactNode; mode: Mode }) {
  const params = useParams()
  const roomId = (params?.id as string | undefined) ?? null

  const { adminMessage, adminSignature, adminAddress, playerToken } = useAuthStore()
  const { instance, setInstance, reconnectionTokens, setReconnectionToken, clearReconnectionToken } = useRoomStore()
  const { setWarriors, setAxies } = useBanningStore()
  const { setStatus, setPhase, setTurn, setCountdown, setEndsAt, setIsBufferTime } = useStatusStore()

  const roomRef = useRef<Room<BanningState> | null>(null)
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!roomId) return
    let cancelled = false

    const connect = async () => {
      if (roomRef.current) return // already connected

      let room: Room<BanningState> | null = null

      // 1) Try reconnect if we have a token for this specific room.
      const reconnectToken = reconnectionTokens[roomId]
      if (reconnectToken) {
        try {
          room = await colyseus.reconnect<BanningState>(reconnectToken)
        } catch {
          clearReconnectionToken(roomId)
          room = null
        }
      }

      // 2) Otherwise initiate a fresh seat reservation appropriate to the mode.
      if (!room) {
        try {
          const reservation = await requestSeatReservation(mode, roomId, {
            adminMessage,
            adminSignature,
            adminAddress,
            playerToken,
          })
          if (!reservation) return // missing auth — caller decides whether to redirect
          room = await colyseus.consumeSeatReservation<BanningState>(reservation)
        } catch (err) {
          console.error('[NetworkProvider] failed to join:', err)
          return
        }
      }

      if (cancelled || !room) {
        room?.leave()
        return
      }
      roomRef.current = room
      setInstance(room)
      setReconnectionToken(roomId, room.reconnectionToken)

      // Subscribe to state changes — sync to stores.
      const $ = getStateCallbacks(room)
      room.onStateChange((state: BanningState) => {
        const parsed = state.toJSON() as unknown as { warriors: any[]; status: any; phase: number; turn: number; endsAt: number; isBufferTime: boolean }
        if (parsed.warriors && parsed.warriors.length > 0) {
          setWarriors(parsed.warriors as any)
          const left = parsed.warriors.find((w) => w.side === 'left')?.pool ?? []
          const right = parsed.warriors.find((w) => w.side === 'right')?.pool ?? []
          setAxies([...left, ...right])
        }
        setStatus(parsed.status)
        setPhase(parsed.phase)
        setTurn(parsed.turn)
        setEndsAt(parsed.endsAt)
        setIsBufferTime(parsed.isBufferTime)
      })

      // Authoritative countdown updates from server.
      room.onMessage(MESSAGES.COUNTDOWN_UPDATE, (p: CountdownUpdatePayload) => {
        setCountdown(p.countdown)
        setPhase(p.phase)
        setTurn(p.turn)
        setIsBufferTime(p.isBufferTime)
        setEndsAt(p.endsAt)
      })

      // Local sub-second ticker derived from endsAt, so the UI counts down smoothly between
      // 1s server broadcasts. Tolerates tab backgrounding because everything is endsAt-based.
      if (tickerRef.current) clearInterval(tickerRef.current)
      tickerRef.current = setInterval(() => {
        const endsAt = useStatusStore.getState().endsAt
        if (!endsAt) return
        const now = Date.now() // approximate — server clock vs local clock can drift
        const remaining = Math.max(0, endsAt - now)
        // Only update if it would be visible — avoid pointless re-renders.
        if (Math.abs(remaining - useStatusStore.getState().countdown) > 250) {
          setCountdown(remaining)
        }
      }, 200)

      room.onLeave((code) => {
        console.log('[NetworkProvider] left room, code=', code)
        if (tickerRef.current) {
          clearInterval(tickerRef.current)
          tickerRef.current = null
        }
      })

      room.onError((code, message) => {
        console.error('[NetworkProvider] error:', code, message)
      })
    }

    connect()

    return () => {
      cancelled = true
      if (tickerRef.current) {
        clearInterval(tickerRef.current)
        tickerRef.current = null
      }
      // Don't leave on unmount — let the room ride through navigation so reconnect works.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, mode])

  if (!roomId) return <div className='p-4 text-sm text-muted-foreground'>Missing room id.</div>
  if (!instance) return <div className='p-4 text-sm text-muted-foreground'>Connecting to room {roomId}…</div>

  return <>{children}</>
}

interface AuthContext {
  adminMessage: string | null
  adminSignature: string | null
  adminAddress: string | null
  playerToken: string | null
}

async function requestSeatReservation(mode: Mode, roomId: string, auth: AuthContext) {
  if (mode === 'admin') {
    if (!auth.adminMessage || !auth.adminSignature || !auth.adminAddress) return null
    const res = await fetch(`${COLYSEUS_HTTP}/join-admin/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: auth.adminMessage,
        signature: auth.adminSignature,
        address: auth.adminAddress.toLowerCase(),
      }),
    })
    if (!res.ok) throw new Error(`join-admin failed: ${res.status}`)
    return await res.json()
  }
  if (mode === 'warrior') {
    if (!auth.playerToken) return null
    // joinCode is in localStorage from the warrior page or query param
    const joinCode = typeof window !== 'undefined' ? localStorage.getItem(`acd:joinCode:${roomId}`) : null
    if (!joinCode) return null
    const res = await fetch(`${COLYSEUS_HTTP}/join-warrior/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerToken: auth.playerToken, joinCode }),
    })
    if (!res.ok) throw new Error(`join-warrior failed: ${res.status}`)
    return await res.json()
  }
  // spectator
  const res = await fetch(`${COLYSEUS_HTTP}/join-spectator/${roomId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) throw new Error(`join-spectator failed: ${res.status}`)
  return await res.json()
}

'use client'

import colyseus from '@/libs/colyseus'
import { attachClockSync, applyBroadcastTime, serverNow } from '@/libs/server-clock'
import { useAuthStore } from '@/stores/auth'
import { useBanningStore } from '@/stores/banning'
import { useRoomStore } from '@/stores/room'
import { useStatusStore } from '@/stores/status'
import { MESSAGES } from '@repo/shared/constants'
import { BanningState } from '@repo/shared/states'
import { CountdownUpdatePayload } from '@repo/shared/types'
import { Room } from 'colyseus.js'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type Mode = 'admin' | 'warrior' | 'spectator'

export default function NetworkProvider({ children, mode }: { children: React.ReactNode; mode: Mode }) {
  const params = useParams()
  const roomId = (params?.id as string | undefined) ?? null

  const { playerToken, setPlayerSession } = useAuthStore()
  const { instance, setInstance, setReconnectionToken, clearReconnectionToken } = useRoomStore()
  const { setWarriors, setAxies } = useBanningStore()
  const { setStatus, setPhase, setTurn, setCountdown, setEndsAt, setStartedAt, setIsBufferTime } = useStatusStore()

  const roomRef = useRef<Room<BanningState> | null>(null)
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'spectator') {
      setAuthReady(true)
      return
    }
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
        }
      })
      .catch(() => {})
      .finally(() => setAuthReady(true))
  }, [mode, setPlayerSession])

  useEffect(() => {
    if (!roomId) return
    if (!authReady) return
    if (mode !== 'spectator' && !playerToken) {
      setErrorMsg('Not logged in. Please log in with Discord first.')
      return
    }
    let cancelled = false

    const connect = async () => {
      if (roomRef.current) return

      let room: Room<BanningState> | null = null

      try {
        const options = await buildJoinOptions(mode, roomId, { playerToken })
        if (options === null) {
          setErrorMsg('Missing auth or join code for this mode')
          return
        }
        room = await colyseus.joinById<BanningState>(roomId, options)
      } catch (err) {
        console.error('[NetworkProvider] failed to join:', err)
        setErrorMsg(err instanceof Error ? err.message : 'Failed to join room')
        return
      }

      if (cancelled || !room) {
        room?.leave()
        return
      }
      wireRoom(room)
    }

    const wireRoom = (room: Room<BanningState>) => {
      roomRef.current = room
      setInstance(room)
      setErrorMsg(null)

      // Persist the reconnection token so a dropped socket can resume the
      // same seat (server holds it open for RECONNECTION_WINDOW_SECONDS).
      setReconnectionToken(roomId!, room.reconnectionToken)

      // Clock sync: countdowns are computed against the server clock, so a
      // skewed local clock can't make the timer disagree with the server.
      const detachClock = attachClockSync(room)

      room.onStateChange((state: BanningState) => {
        const parsed = state.toJSON() as unknown as {
          warriors: unknown[]
          status: 'initial' | 'ready' | 'banning' | 'done'
          phase: number
          turn: number
          endsAt: number
          startedAt: number
          isBufferTime: boolean
        }
        if (parsed.warriors && parsed.warriors.length > 0) {
          setWarriors(parsed.warriors as never)
          const left =
            (parsed.warriors as { side: string; pool: unknown[] }[]).find((w) => w.side === 'left')?.pool ?? []
          const right =
            (parsed.warriors as { side: string; pool: unknown[] }[]).find((w) => w.side === 'right')?.pool ?? []
          setAxies([...left, ...right] as never)
        }
        setStatus(parsed.status)
        setPhase(parsed.phase)
        setTurn(parsed.turn)
        setEndsAt(parsed.endsAt)
        setStartedAt(parsed.startedAt)
        setIsBufferTime(parsed.isBufferTime)
      })

      room.onMessage(MESSAGES.COUNTDOWN_UPDATE, (p: CountdownUpdatePayload) => {
        // One-way clock fallback until the first ping round-trip completes.
        if (typeof p.serverTime === 'number') applyBroadcastTime(p.serverTime)
        setPhase(p.phase)
        setTurn(p.turn)
        setIsBufferTime(p.isBufferTime)
        setEndsAt(p.endsAt)
      })

      // SINGLE countdown writer. Deadline minus server-clock estimate — the
      // broadcast no longer writes countdown directly, so there are no longer
      // two sources fighting over the same value (the old back-and-forth).
      if (tickerRef.current) clearInterval(tickerRef.current)
      tickerRef.current = setInterval(() => {
        const { endsAt, status } = useStatusStore.getState()
        if (!endsAt || status !== 'banning') return
        setCountdown(Math.max(0, endsAt - serverNow()))
      }, 100)

      room.onLeave((code) => {
        console.log('[NetworkProvider] left room, code=', code)
        detachClock()
        if (tickerRef.current) {
          clearInterval(tickerRef.current)
          tickerRef.current = null
        }
        roomRef.current = null

        // Consented leave (navigation) -> done. Abnormal close (network blip,
        // server restart, sleep) -> resume the same seat via the token.
        if (code === 1000 || cancelled) {
          clearReconnectionToken(roomId!)
          return
        }
        attemptReconnect(0)
      })

      room.onError((code, message) => {
        console.error('[NetworkProvider] room error:', code, message)
        setErrorMsg(`Room error: ${message ?? code}`)
      })
    }

    const attemptReconnect = (attempt: number) => {
      if (cancelled) return
      if (attempt >= 8) {
        setErrorMsg('Connection lost. Please refresh the page.')
        return
      }
      const token = useRoomStore.getState().reconnectionTokens[roomId!]
      if (!token) {
        // No seat to resume (e.g. spectator) — plain rejoin.
        setInstance(null)
        connect()
        return
      }
      const backoff = Math.min(500 * 2 ** attempt, 8000)
      setTimeout(async () => {
        if (cancelled) return
        try {
          const room = await colyseus.reconnect<BanningState>(token)
          console.log('[NetworkProvider] reconnected, seat resumed')
          wireRoom(room)
        } catch (err) {
          console.warn(`[NetworkProvider] reconnect attempt ${attempt + 1} failed`, err)
          attemptReconnect(attempt + 1)
        }
      }, backoff)
    }

    connect()

    return () => {
      cancelled = true
      if (tickerRef.current) {
        clearInterval(tickerRef.current)
        tickerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, mode, authReady, playerToken])

  if (!roomId) return <div className='p-4 text-sm text-muted-foreground'>Missing room id.</div>
  if (errorMsg) return <div className='p-4 text-sm text-red-400'>Error: {errorMsg}</div>
  if (!authReady) return <div className='p-4 text-sm opacity-60'>Loading session…</div>
  if (!instance) return <div className='p-4 text-sm opacity-60'>Connecting to room {roomId}…</div>

  return <>{children}</>
}

async function buildJoinOptions(mode: Mode, roomId: string, auth: { playerToken: string | null }) {
  if (mode === 'spectator') {
    return { __role: 'spectator' }
  }
  if (!auth.playerToken) return null
  if (mode === 'warrior') {
    const joinCode = typeof window !== 'undefined' ? localStorage.getItem(`acd:joinCode:${roomId}`) : null
    if (!joinCode) return null
    return { __role: 'warrior', playerToken: auth.playerToken, joinCode }
  }
  return { __role: 'admin', playerToken: auth.playerToken }
}

import { MESSAGES } from '@repo/shared/constants'
import { TimeSyncResponse } from '@repo/shared/types'
import { Room } from 'colyseus.js'

/**
 * Server-clock estimation.
 *
 * Turn deadlines (`endsAt`) are epoch timestamps stamped by the SERVER.
 * Comparing them against the browser's `Date.now()` is wrong whenever the two
 * clocks disagree — which is common (phones drift, laptops sleep). A skewed
 * client sees its locally derived countdown fight the server's broadcast value
 * every second: the visible "timer goes back and forth".
 *
 * Fix: track `offset = serverClock - clientClock`, RTT-corrected via ping,
 * and compute all countdowns as `endsAt - serverNow()`.
 */

let offset = 0
let bestRtt = Infinity
let synced = false

export function serverNow(): number {
  return Date.now() + offset
}

export function isClockSynced(): boolean {
  return synced
}

function applySample(sampleOffset: number, rtt: number) {
  // Keep the estimate from the lowest-RTT sample we've seen — it has the
  // tightest bound on one-way latency error. Allow slightly worse samples
  // through so the offset can still track genuine drift over a long draft.
  if (rtt <= bestRtt * 1.5 || !synced) {
    if (rtt < bestRtt) bestRtt = rtt
    offset = sampleOffset
    synced = true
  }
}

/** One-way fallback: piggybacked `serverTime` on a broadcast we just received. */
export function applyBroadcastTime(serverTime: number) {
  if (synced) return // ping-based estimate is strictly better
  offset = serverTime - Date.now()
}

/**
 * Attach ping-based sync to a room. Pings immediately, then every 15s.
 * Returns a cleanup function.
 */
export function attachClockSync(room: Room): () => void {
  const handler = (msg: TimeSyncResponse) => {
    const now = Date.now()
    const rtt = now - msg.t0
    if (rtt < 0 || rtt > 10_000) return // clock jumped mid-flight; discard
    applySample(msg.serverTime + rtt / 2 - now, rtt)
  }
  room.onMessage(MESSAGES.TIME_SYNC, handler)

  const ping = () => {
    try {
      room.send(MESSAGES.TIME_SYNC, { t0: Date.now() })
    } catch {
      // room already left — interval cleanup will follow
    }
  }
  ping()
  const interval = setInterval(ping, 15_000)

  // Laptop lid / phone unlock: the local clock can leap while suspended.
  const onVisible = () => {
    if (!document.hidden) {
      bestRtt = Infinity // stale RTT floor no longer meaningful
      ping()
    }
  }
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    clearInterval(interval)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

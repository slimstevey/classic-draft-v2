import { Status } from '@repo/shared/types'
import { create } from 'zustand'

interface StatusStore {
  status: Status
  phase: number
  turn: number
  countdown: number // ms remaining (server-derived)
  endsAt: number // epoch ms (server clock domain)
  startedAt: number // epoch ms — with endsAt gives the turn's total duration
  isBufferTime: boolean
  setStatus: (s: Status) => void
  setPhase: (p: number) => void
  setTurn: (t: number) => void
  setCountdown: (ms: number) => void
  setEndsAt: (ts: number) => void
  setStartedAt: (ts: number) => void
  setIsBufferTime: (b: boolean) => void
}

export const useStatusStore = create<StatusStore>((set) => ({
  status: 'initial',
  phase: 0,
  turn: 0,
  countdown: 0,
  endsAt: 0,
  startedAt: 0,
  isBufferTime: false,
  setStatus: (status) => set({ status }),
  setPhase: (phase) => set({ phase }),
  setTurn: (turn) => set({ turn }),
  setCountdown: (countdown) => set({ countdown }),
  setEndsAt: (endsAt) => set({ endsAt }),
  setStartedAt: (startedAt) => set({ startedAt }),
  setIsBufferTime: (isBufferTime) => set({ isBufferTime }),
}))

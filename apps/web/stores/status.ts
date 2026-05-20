import { Status } from '@repo/shared/types'
import { create } from 'zustand'

interface StatusStore {
  status: Status
  phase: number
  turn: number
  countdown: number // ms remaining (server-derived)
  endsAt: number
  isBufferTime: boolean
  setStatus: (s: Status) => void
  setPhase: (p: number) => void
  setTurn: (t: number) => void
  setCountdown: (ms: number) => void
  setEndsAt: (ts: number) => void
  setIsBufferTime: (b: boolean) => void
}

export const useStatusStore = create<StatusStore>((set) => ({
  status: 'initial',
  phase: 0,
  turn: 0,
  countdown: 0,
  endsAt: 0,
  isBufferTime: false,
  setStatus: (status) => set({ status }),
  setPhase: (phase) => set({ phase }),
  setTurn: (turn) => set({ turn }),
  setCountdown: (countdown) => set({ countdown }),
  setEndsAt: (endsAt) => set({ endsAt }),
  setIsBufferTime: (isBufferTime) => set({ isBufferTime }),
}))

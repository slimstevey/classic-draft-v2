import { Room } from 'colyseus.js'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { BanningState } from '@repo/shared/states'

/**
 * Reconnection tokens are scoped per room ID so a user reconnecting to room A doesn't
 * accidentally try to use a token for room B. Map: roomId -> reconnectToken.
 */
export type RoomState = {
  instance: Room<BanningState> | null
  reconnectionTokens: Record<string, string>
}

export type RoomActions = {
  setInstance: (instance: Room<BanningState> | null) => void
  setReconnectionToken: (roomId: string, token: string) => void
  clearReconnectionToken: (roomId: string) => void
  clear: () => void
}

export const useRoomStore = create<RoomState & RoomActions>()(
  persist(
    (set, get) => ({
      instance: null,
      reconnectionTokens: {},
      setInstance: (instance) => set({ instance }),
      setReconnectionToken: (roomId, token) =>
        set({ reconnectionTokens: { ...get().reconnectionTokens, [roomId]: token } }),
      clearReconnectionToken: (roomId) => {
        const next = { ...get().reconnectionTokens }
        delete next[roomId]
        set({ reconnectionTokens: next })
      },
      clear: () => set({ instance: null, reconnectionTokens: {} }),
    }),
    {
      name: 'AXIE_CLASSIC_DRAFT:ROOM',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ reconnectionTokens: state.reconnectionTokens }),
    }
  )
)

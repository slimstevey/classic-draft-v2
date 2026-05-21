import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthStore {
  playerToken: string | null
  discordId: string | null
  discordUsername: string | null
  discordAvatar: string | null
  setPlayerSession: (data: {
    playerToken: string
    discordId: string
    discordUsername: string
    discordAvatar: string | null
  }) => void
  clearPlayerSession: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      playerToken: null,
      discordId: null,
      discordUsername: null,
      discordAvatar: null,
      setPlayerSession: ({ playerToken, discordId, discordUsername, discordAvatar }) =>
        set({ playerToken, discordId, discordUsername, discordAvatar }),
      clearPlayerSession: () =>
        set({ playerToken: null, discordId: null, discordUsername: null, discordAvatar: null }),
    }),
    {
      name: 'AXIE_CLASSIC_DRAFT:AUTH',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

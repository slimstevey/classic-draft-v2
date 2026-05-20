import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthStore {
  // Admin (Ronin wallet)
  adminAddress: string | null
  adminMessage: string | null
  adminSignature: string | null
  setAdminCredentials: (creds: { address: string; message: string; signature: string }) => void
  clearAdminCredentials: () => void

  // Warrior (Discord JWT)
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
      adminAddress: null,
      adminMessage: null,
      adminSignature: null,
      setAdminCredentials: ({ address, message, signature }) =>
        set({ adminAddress: address, adminMessage: message, adminSignature: signature }),
      clearAdminCredentials: () => set({ adminAddress: null, adminMessage: null, adminSignature: null }),

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

import { Warrior } from '@repo/shared/states'
import { Axie } from '@repo/shared/types'
import { create } from 'zustand'

interface BanningStore {
  warriors: Warrior[]
  setWarriors: (warriors: Warrior[]) => void
  axies: Axie[]
  setAxies: (axies: Axie[]) => void
  currentAxieLeftSelected: Axie | null
  currentAxieRightSelected: Axie | null
  setCurrentAxieLeftSelected: (a: Axie | null) => void
  setCurrentAxieRightSelected: (a: Axie | null) => void
}

export const useBanningStore = create<BanningStore>((set) => ({
  warriors: [],
  setWarriors: (warriors) => set({ warriors }),
  axies: [],
  setAxies: (axies) => set({ axies }),
  currentAxieLeftSelected: null,
  currentAxieRightSelected: null,
  setCurrentAxieLeftSelected: (axie) => set({ currentAxieLeftSelected: axie }),
  setCurrentAxieRightSelected: (axie) => set({ currentAxieRightSelected: axie }),
}))

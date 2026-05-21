import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const computeAxieImageUrl = (id: string) =>
  `https://axiecdn.axieinfinity.com/axies/${id}/axie/axie-full-transparent.png`

export const computeAxieCardUrl = (card: { id: string }) =>
  `/card-small/${card.id}.webp`

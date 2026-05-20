import { SiweMessage } from 'siwe'
import { ronin } from 'viem/chains'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Build a SIWE message for admin sign-in. */
export function createSiweMessage(address: string, statement: string) {
  const domain = window.location.host.split(':')[0]
  const uri = window.location.origin

  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri,
    version: '1',
    chainId: ronin.id,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  })

  return message.prepareMessage()
}

export const computeAxieImageUrl = (id: string) =>
  `https://axiecdn.axieinfinity.com/axies/${id}/axie/axie-full-transparent.png`

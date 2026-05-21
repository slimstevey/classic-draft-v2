'use client'

import { cn } from '@/libs/utils'
import { useBanningStore } from '@/stores/banning'
import { useAccount } from 'wagmi'

export default function PlayerIndicator() {
  const { warriors } = useBanningStore()
  const { address } = useAccount()

  const you = warriors.find((warrior) => warrior.discordId.toLowerCase() === address?.toLowerCase())

  return <div className={cn('absolute bottom-0 z-[100] text-white bg-red-500', you?.side === 'left' ? 'left-0' : 'right-0')}>YOU</div>
}

'use client'
import { useRoomStore } from '@/stores/room'
import { useStatusStore } from '@/stores/status'
import { useAuthStore } from '@/stores/auth'
import { MESSAGES } from '@repo/shared/constants'
import { Button } from './ui/button'
import { useBanningStore } from '@/stores/banning'
import { cn } from '@/libs/utils'

export default function ReadyButton() {
  const { instance } = useRoomStore()
  const { warriors } = useBanningStore()
  const { discordId } = useAuthStore()
  const { status } = useStatusStore()

  const you = warriors.find((warrior) => warrior.discordId === discordId)

  const handleReady = () => {
    if (you?.isReady) return
    instance?.send(MESSAGES.PLAYER_READY, { isReady: true })
  }

  if (status !== 'initial') return null

  return (
    <div className='absolute top-1/2 z-[1000] scale-150 left-1/2 -translate-x-1/2 -translate-y-1/2'>
      <Button onClick={handleReady} className={cn(you?.isReady ? 'bg-green-500' : 'bg-red-500')}>
        {you?.isReady ? '✅ Ready' : 'Ready'}
      </Button>
    </div>
  )
}

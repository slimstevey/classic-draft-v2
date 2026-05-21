import { useBanningStore } from '@/stores/banning'
import { useRoomStore } from '@/stores/room'
import { useStatusStore } from '@/stores/status'
import { useAuthStore } from '@/stores/auth'
import { useInspector } from '@/hooks/use-inspector'
import { SLOT_CONFIGS } from '@/configs/slot'
import { cn, computeAxieImageUrl } from '@/libs/utils'
import { MESSAGES } from '@repo/shared/constants'
import { Axie, Side } from '@repo/shared/types'
import Image from 'next/image'
import { useMemo } from 'react'

interface BanningSlotProps {
  slotConfig: (typeof SLOT_CONFIGS)[number]
  axie: Axie
  onClick: () => void
  side: Side
}

export function BanningSlot({ axie, slotConfig, onClick }: BanningSlotProps) {
  const { discordId } = useAuthStore()
  const { warriors } = useBanningStore()
  const { instance } = useRoomStore()
  const { phase } = useStatusStore()

  const { isInspector } = useInspector()

  const you = warriors.find((warrior) => warrior.discordId === discordId)

  const allowToBan = you?.isBanning && axie.side !== you.side

  const shouldShowIndicator = useMemo(() => {
    if (isInspector) {
      if (phase > 1) return true
      return false
    }
    if (phase < 2) {
      if (axie.side !== you?.side) return true
      return false
    }
    return true
  }, [phase, axie.side, you?.side, isInspector])

  const handleBan = () => {
    instance?.send(MESSAGES.BAN_AXIE, { axie })
  }

  return (
    <div
      className={cn(
        'relative cursor-pointer overflow-hidden pointer-events-auto',
        axie.isSelected && shouldShowIndicator ? 'bg-[#E99C37]' : 'bg-[#D9D9D9]',
        axie.isBanned && shouldShowIndicator && 'bg-[#716868]',
      )}
      style={{
        width: slotConfig.transform.container.width,
        height: slotConfig.transform.container.height,
        top: slotConfig.position.top,
        left: slotConfig.position.left,
      }}
      onClick={onClick}>
      {axie.isBanned && shouldShowIndicator ? (
        <div id='slot-ban-overlay' className='w-full h-full absolute z-[2]'>
          <div
            id='ban-slash'
            className='w-[6px] bg-red-500 h-[60px] rotate-[-45deg] absolute'
            style={{
              top: slotConfig.transform.overlay.top,
              left: slotConfig.transform.overlay.left,
            }}></div>
        </div>
      ) : (
        <>
          {allowToBan && axie.isSelected && (
            <div className='w-full h-full absolute z-[2]'>
              <div
                onClick={handleBan}
                className={cn(
                  'w-[60px] bg-white absolute text-center text-black font-bold cursor-pointer',
                  axie.side === 'left' ? 'scale-x-[1]' : 'scale-x-[-1]',
                )}
                style={{
                  top: slotConfig.transform.overlay.top,
                  left: slotConfig.transform.overlay.left,
                }}>
                Ban
              </div>
            </div>
          )}
        </>
      )}

      <Image
        draggable={false}
        src={computeAxieImageUrl(axie.id)}
        width={200}
        height={200}
        alt='slot1'
        className={cn('w-full h-full object-cover absolute', axie.isBanned && shouldShowIndicator && 'grayscale')}
        style={{
          transform: `scale(${slotConfig.transform.image.scale[0]}, ${slotConfig.transform.image.scale[1]})`,
          left: slotConfig.transform.image.left,
          top: slotConfig.transform.image.top,
        }}
        priority
      />
    </div>
  )
}

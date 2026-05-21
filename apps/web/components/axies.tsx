'use client'

import damage from '@/assets/damage.png'
import defense from '@/assets/defense.png'
import { Game } from '@/centers/_game'
import { useInspector } from '@/hooks/use-inspector'
import { cn, computeAxieCardUrl } from '@/libs/utils'
import { useBanningStore } from '@/stores/banning'
import { useStatusStore } from '@/stores/status'
import { Card } from '@repo/shared/types'
import Image from 'next/image'
import { useEffect, useMemo, useRef } from 'react'
import { useAccount } from 'wagmi'

export default function Axies() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { axies } = useBanningStore()
  const { phase, status } = useStatusStore()
  const { warriors } = useBanningStore()
  const { address } = useAccount()

  const you = warriors.find((warrior) => warrior.discordId === address?.toLowerCase())

  const shouldShowOpponentIndicator = phase > 1

  const LEFT = useMemo(() => axies.filter((axie) => axie.side === 'left' && axie.isSelected), [axies])
  const RIGHT = useMemo(() => axies.filter((axie) => axie.side === 'right' && axie.isSelected), [axies])

  const showLeftBannedSymbol = useMemo(() => {
    return LEFT.some((axie) => axie.isBanned && axie.isSelected)
  }, [LEFT])

  const showRightBannedSymbol = useMemo(() => {
    return RIGHT.some((axie) => axie.isBanned && axie.isSelected)
  }, [RIGHT])

  const { isInspector } = useInspector()

  const game = useRef<Game | null>(null)
  const initialized = useRef(false)

  const setup = async () => {
    if (!containerRef.current || game.current) return

    game.current = new Game(containerRef.current, false)

    // Initialize with all axies for preloading, but only if we have axies
    if (axies.length > 0) {
      await game.current.initAxie(axies)
      initialized.current = true
    }
  }

  useEffect(() => {
    void setup()

    return () => {
      game.current?.clear()
    }
  }, [])

  useEffect(() => {
    game.current?.hideAxies()
  }, [status])

  // Initialize when axies become available and handle switching
  useEffect(() => {
    if (!game.current) return

    // If we haven't initialized yet but now have axies, initialize
    if (!initialized.current && axies.length > 0) {
      const initializeAxies = async () => {
        await game.current!.initAxie(axies)
        initialized.current = true

        // Switch to selected axies after initialization
        if (LEFT.length > 0) {
          if (isInspector && phase > 1) {
            game.current!.switchAxie('left', LEFT[0].id)
          } else {
            if (!shouldShowOpponentIndicator) {
              if (LEFT[0].side !== you?.side) {
                game.current!.switchAxie('left', LEFT[0].id)
              }
            } else {
              game.current!.switchAxie('left', LEFT[0].id)
            }
          }
        }
        if (RIGHT.length > 0) {
          if (isInspector && phase > 1) {
            game.current!.switchAxie('right', RIGHT[0].id)
          } else {
            if (!shouldShowOpponentIndicator) {
              if (RIGHT[0].side !== you?.side) {
                game.current!.switchAxie('right', RIGHT[0].id)
              }
            } else {
              game.current!.switchAxie('right', RIGHT[0].id)
            }
          }
        }
      }
      void initializeAxies()
      return
    }

    // If already initialized, handle switching (with cache check)
    if (initialized.current) {
      const handleAxieSwitch = async () => {
        // Check and load left axie if needed
        if (LEFT.length > 0) {
          const axie = LEFT[0]
          const leftAxieId = axie.id
          if (!game.current!.axieCenter.axies.has(leftAxieId)) {
            const leftAxie = axies.find((axie) => axie.id === leftAxieId)
            if (leftAxie) {
              await game.current!.axieCenter.create(leftAxie.id, leftAxie.genes)
            }
          }

          if (isInspector && phase > 1) {
            game.current!.switchAxie('left', leftAxieId)
          } else {
            if (!shouldShowOpponentIndicator) {
              if (axie.side !== you?.side) {
                game.current!.switchAxie('left', axie.id)
              }
            } else {
              game.current!.switchAxie('left', leftAxieId)
            }
          }
        }

        // Check and load right axie if needed
        if (RIGHT.length > 0) {
          const rightAxieId = RIGHT[0].id
          if (!game.current!.axieCenter.axies.has(rightAxieId)) {
            const rightAxie = axies.find((axie) => axie.id === rightAxieId)
            if (rightAxie) {
              await game.current!.axieCenter.create(rightAxie.id, rightAxie.genes)
            }
          }
          const axie = RIGHT[0]

          if (isInspector && phase > 1) {
            game.current!.switchAxie('right', rightAxieId)
          } else {
            if (!shouldShowOpponentIndicator) {
              if (axie.side !== you?.side) {
                game.current!.switchAxie('right', axie.id)
              }
            } else {
              game.current!.switchAxie('right', rightAxieId)
            }
          }
        }
      }
      void handleAxieSwitch()
    }
  }, [axies, LEFT, RIGHT, shouldShowOpponentIndicator, isInspector])

  return (
    <div className='w-full h-full absolute top-0 left-0'>
      {isInspector &&
        (phase > 1 ? (
          <>
            <div className='absolute left-0 top-[150px] space-y-2'>
              <Cards data={LEFT.length > 0 ? LEFT[0].cards : []} side='left' />
            </div>

            <div className='absolute right-0 top-[150px] space-y-2'>
              <Cards data={RIGHT.length > 0 ? RIGHT[0].cards : []} side='right' />
            </div>
          </>
        ) : null)}
      {!isInspector && (
        <>
          {phase > 1 ? (
            <>
              <div className='absolute left-0 top-[150px] space-y-2'>{LEFT.length > 0 && <Cards data={LEFT[0].cards} side='left' />}</div>
              <div className='absolute right-0 top-[150px] space-y-2'>{RIGHT.length > 0 && <Cards data={RIGHT[0].cards} side='right' />}</div>
            </>
          ) : (
            <>
              {LEFT.length > 0 && you?.side !== LEFT[0].side && (
                <div className='absolute left-0 top-[150px] space-y-2'>
                  <Cards data={LEFT[0].cards} side='left' />
                </div>
              )}
              {RIGHT.length > 0 && you?.side !== RIGHT[0].side && (
                <div className='absolute right-0 top-[150px] space-y-2'>
                  <Cards data={RIGHT[0].cards} side='right' />
                </div>
              )}
            </>
          )}
        </>
      )}

      <div
        ref={containerRef}
        className={cn(
          'absolute z-[10] w-full h-[800px] top-1/2 -translate-y-1/2 left-0 opacity-0',
          isInspector ? phase > 1 && 'opacity-100' : 'opacity-100',
        )}></div>

      <div className='absolute top-1/2 -translate-y-1/2 z-[10] left-1/2 -translate-x-1/2'>
        {isInspector ? (
          <>
            {phase > 1 && (
              <>
                {showLeftBannedSymbol && LEFT.length > 0 && you?.side !== LEFT[0].side && (
                  <BannedSymbol className='absolute left-[-660px] top-[-180px]  z-[10]' />
                )}

                {showRightBannedSymbol && RIGHT.length > 0 && you?.side !== RIGHT[0].side && (
                  <BannedSymbol className='absolute left-[293px] top-[-180px]  z-[10]' />
                )}
              </>
            )}
          </>
        ) : (
          <>
            {phase > 1 ? (
              <>
                {showLeftBannedSymbol && <BannedSymbol className='absolute left-[-660px] top-[-180px]  z-[10]' />}

                {showRightBannedSymbol && <BannedSymbol className='absolute left-[293px] top-[-180px]  z-[10]' />}
              </>
            ) : (
              <>
                {showLeftBannedSymbol && LEFT.length > 0 && you?.side !== LEFT[0].side && (
                  <BannedSymbol className='absolute left-[-660px] top-[-180px]  z-[10]' />
                )}

                {showRightBannedSymbol && RIGHT.length > 0 && you?.side !== RIGHT[0].side && (
                  <BannedSymbol className='absolute left-[293px] top-[-180px]  z-[10]' />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface CardsProps {
  data: Card[]
  side: 'left' | 'right'
}

function Cards({ data, side }: CardsProps) {
  return data.length > 0
    ? data.map((card: Card) =>
        side === 'left' ? (
          <div key={card.id} className='flex gap-3 bg-[#31061C] p-3 rounded-r-3xl'>
            <div className='grid font-integral grid-rows-2 gap-3 w-[100px]'>
              <div className='bg-[#912280] rounded-lg flex items-center gap-2 px-3'>
                <Image src={damage} alt='damage' width={24} height={24} />
                <span className='text-white text-lg mb-1 leading-none tracking-wide'>{card.attack}</span>
              </div>
              <div className='bg-[#912280] rounded-lg flex items-center gap-2 px-3'>
                <Image src={defense} alt='defense' width={24} height={24} />
                <span className='text-white text-lg mb-1 leading-none tracking-wide'>{card.defense}</span>
              </div>
            </div>
            <div className='w-[100px] h-[100px] overflow-hidden rounded-2xl'>
              <Image src={computeAxieCardUrl(card)} className='' alt='axie' width={100} height={100} />
            </div>
          </div>
        ) : (
          <div key={card.id} className='flex gap-3 bg-[#31061C] p-3 rounded-l-3xl'>
            <div className='w-[100px] h-[100px] overflow-hidden rounded-2xl'>
              <Image src={computeAxieCardUrl(card)} className='' alt='axie' width={100} height={100} />
            </div>
            <div className='grid font-integral grid-rows-2 gap-3 w-[100px]'>
              <div className='bg-[#912280] rounded-lg flex items-center gap-2 px-4'>
                <span className='text-white text-lg mb-1 leading-none tracking-wide'>{card.attack}</span>
                <Image src={damage} alt='damage' width={24} height={24} />
              </div>
              <div className='bg-[#912280] rounded-lg flex items-center gap-2 px-4'>
                <span className='text-white text-lg mb-1 leading-none tracking-wide'>{card.defense}</span>
                <Image src={defense} alt='defense' width={24} height={24} />
              </div>
            </div>
          </div>
        ),
      )
    : null
}

interface BannedSymbolProps {
  className?: string
}

function BannedSymbol({ className }: BannedSymbolProps) {
  return (
    <svg
      className={cn('absolute left-[293px] top-[-180px]  z-[10]', className)}
      width='367'
      height='367'
      viewBox='0 0 367 367'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'>
      <g filter='url(#filter0_g_0_1)'>
        <circle cx='183.5' cy='183.5' r='170.5' stroke='#EB3030' strokeWidth='16' />
      </g>
      <g filter='url(#filter1_g_0_1)'>
        <path d='M337 26C226.402 132.605 56.6251 300.84 33 339' stroke='#EB3030' strokeWidth='16' strokeLinecap='round' />
      </g>
      <defs>
        <filter id='filter0_g_0_1' x='0.6' y='0.6' width='365.8' height='365.8' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'>
          <feFlood flood-opacity='0' result='BackgroundImageFix' />
          <feBlend mode='normal' in='SourceGraphic' in2='BackgroundImageFix' result='shape' />
          <feTurbulence type='fractalNoise' baseFrequency='0.076923079788684845 0.076923079788684845' numOctaves='3' seed='1568' />
          <feDisplacementMap
            in='shape'
            scale='8.8000001907348633'
            xChannelSelector='R'
            yChannelSelector='G'
            result='displacedImage'
            width='100%'
            height='100%'
          />
          <feMerge result='effect1_texture_0_1'>
            <feMergeNode in='displacedImage' />
          </feMerge>
        </filter>
        <filter id='filter1_g_0_1' x='20.999' y='14' width='328.001' height='337.001' filterUnits='userSpaceOnUse' colorInterpolationFilters='sRGB'>
          <feFlood floodOpacity='0' result='BackgroundImageFix' />
          <feBlend mode='normal' in='SourceGraphic' in2='BackgroundImageFix' result='shape' />
          <feTurbulence type='fractalNoise' baseFrequency='0.076923079788684845 0.076923079788684845' numOctaves='3' seed='7826' />
          <feDisplacementMap in='shape' scale='8' xChannelSelector='R' yChannelSelector='G' result='displacedImage' width='100%' height='100%' />
          <feMerge result='effect1_texture_0_1'>
            <feMergeNode in='displacedImage' />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}

'use client'

import { toSeconds } from '@repo/shared/utils'
import { useRef } from 'react'
import NumberFlow from '@number-flow/react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useStatusStore } from '@/stores/status'
import { useBanningStore } from '@/stores/banning'

gsap.registerPlugin(useGSAP)

export default function BanningIndicator() {
  const container = useRef<HTMLDivElement>(null)
  const progress = useRef<HTMLDivElement>(null)

  // Single source of truth: the status store, fed by NetworkProvider's one
  // deadline-based ticker. This component previously ran its own countdown
  // extrapolated from message *arrival* times — network jitter made the big
  // number visibly bounce ±1s ("goes back and forth"). It also stacked a new
  // COUNTDOWN_UPDATE handler on every status change without unsubscribing.
  const { status, phase, countdown, endsAt, startedAt, isBufferTime } = useStatusStore()
  const { warriors } = useBanningStore()

  const isLeftBanning = warriors.find((warrior) => warrior.side === 'left')?.isBanning
  const isRightBanning = warriors.find((warrior) => warrior.side === 'right')?.isBanning

  // Monotonic display guard: within one deadline, the shown second may only
  // decrease. Late clock-offset refinements can nudge the raw remaining up a
  // few hundred ms — without the guard that reads as the timer ticking UP.
  const displayGuard = useRef({ endsAt: 0, floor: Infinity })
  if (displayGuard.current.endsAt !== endsAt) {
    displayGuard.current = { endsAt, floor: Infinity }
  }
  const rawSeconds = Math.floor(toSeconds(countdown))
  const displaySeconds = Math.min(rawSeconds, displayGuard.current.floor)
  displayGuard.current.floor = displaySeconds

  // Progress relative to THIS turn's real duration (60s, 120s, or the buffer
  // pool) instead of a hardcoded 60s — the bar no longer jumps between turns.
  const totalMs = Math.max(1, endsAt - startedAt)

  useGSAP(
    () => {
      const percentage = (countdown / totalMs) * 100
      let endColor = `rgba(16,96,31,100)`
      if (percentage > 60) {
        endColor = `rgba(8,206,51,100)`
      } else if (percentage >= 30) {
        endColor = `rgba(227,182,17,100)`
      } else {
        endColor = `rgba(227,17,20,100)`
      }
      const color = `linear-gradient(to bottom, rgba(217,217,217,0), ${endColor})`

      gsap.to(container.current, {
        background: color,
      })
    },
    {
      scope: container,
      dependencies: [countdown],
    },
  )

  useGSAP(
    () => {
      const percentage = (countdown / totalMs) * 100
      let endColor = `rgba(16,96,31,100)`
      if (percentage > 60) {
        endColor = `rgba(8,206,51,100)`
      } else if (percentage >= 30) {
        endColor = `rgba(227,182,17,100)`
      } else {
        endColor = `rgba(227,17,20,100)`
      }
      gsap.to('#process-bar', {
        scaleX: percentage / 100,
        background: endColor,
      })
    },
    {
      scope: progress,
      dependencies: [countdown],
    },
  )

  return (
    <>
      <div ref={progress} id='process' className='w-full absolute bottom-0 h-2 bg-white z-[11]'>
        <div id='process-bar' className='h-full bg-black w-full  origin-center scale-x-[0.5]'></div>
      </div>

      <div ref={container} className='w-full absolute bottom-0 left-1/2 -translate-x-1/2 h-[200px] z-[0]'>
        {status === 'banning' && (
          <div className='flex items-center flex-col font-integral text-white font-black leading-none'>
            <span className='tracking-wider text-2xl mt-7 leading-none text-center'>
              Phase <NumberFlow value={phase} />
              <br />
              <span className='text-sm leading-none'>{isBufferTime ? '(Buffer)' : ''}</span>
            </span>
            <span className='text-[60px] mt-2'>{displaySeconds}</span>

            <div className='flex absolute top-1/2 -translate-y-1/2 h-10'>
              {isLeftBanning && (
                <figure className='w-10 aspect-square scale-x-[-1] -left-[150px] absolute'>
                  <svg className='w-full h-full' viewBox='0 0 78 94' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <path d='M0 94V0L78 48.5L0 94Z' fill='white' />
                  </svg>
                </figure>
              )}

              {isRightBanning && (
                <figure className='w-10 aspect-square -right-[150px] absolute'>
                  <svg className='w-full h-full' viewBox='0 0 78 94' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <path d='M0 94V0L78 48.5L0 94Z' fill='white' />
                  </svg>
                </figure>
              )}
            </div>
          </div>
        )}

        {(status === 'initial' || status === 'ready') && (
          <div className='flex items-center flex-col font-integral text-white font-black leading-none'>
            <span className='text-[50px] mt-[60px]'>READY</span>
          </div>
        )}
        {status === 'done' && (
          <div className='flex items-center flex-col font-integral text-white font-black leading-none'>
            <span className='text-[50px] mt-[60px]'>PLAY</span>
          </div>
        )}
      </div>
    </>
  )
}

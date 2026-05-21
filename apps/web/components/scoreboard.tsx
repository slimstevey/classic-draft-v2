'use client'

import { cn } from '@/libs/utils'
import { useBanningStore } from '@/stores/banning'
import { usePathname } from 'next/navigation'
import ScoreboardLogo from './scoreboard-logo'

export default function Scoreboard() {
  const { warriors } = useBanningStore()

  const leftWarrior = warriors.find((warrior) => warrior.side === 'left')
  const rightWarrior = warriors.find((warrior) => warrior.side === 'right')

  const path = usePathname()

  const isWarriorView = path.includes('battle')

  if (!leftWarrior || !rightWarrior) return null

  return (
    <>
      {isWarriorView && (
        <div className={cn('absolute top-0 bg-white px-4 h-[28px] flex items-center justify-center', 'left-0')}>
          <span className='uppercase font-integral text-black text-lg font-bold'>Warrior View</span>
        </div>
      )}
      <div className='absolute top-0 w-[1140px] left-1/2 -translate-x-1/2'>
        <div className='absolute top-0 left-0 z-[2]'>
          <div className='relative'>
            <svg width='451' height='71' viewBox='0 0 451 71' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M409.443 0L450.443 71H9.35645L0 0H409.443Z' fill='white' />
            </svg>
            <span className='uppercase font-integral text-black text-2xl font-bold absolute top-[17px] left-1/2 -translate-x-1/2'>
              {leftWarrior.name}
            </span>
          </div>

          {leftWarrior.isBanning && (
            <div className='absolute bottom-[-28px] right-[-14px]'>
              <svg width='201' height='28' viewBox='0 0 201 28' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M0 0H185.5L201 28H19.0001L9.5 13.7455L0 0Z' fill='white' />
              </svg>

              <span className='uppercase font-integral text-black text-lg font-bold absolute top-[3px] leading-none right-[30px]'>Banning</span>
            </div>
          )}

          <div className='absolute top-0 left-[-80px]'>
            <span className='absolute top-[13px] left-[100px] text-black text-3xl font-bold font-integral'>{leftWarrior.score}</span>
            <svg className='' width='166' height='71' viewBox='0 0 166 71' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path
                d='M134.351 0C149.587 4.3986 152.06 9.92612 158.322 15.1807C166.024 21.6426 172.26 59.3853 151.524 71H38.2246C30.1991 66.5553 24.9966 59.3019 23.832 52.7266C22.2969 44.0575 27.8904 33.1562 31.9014 31.4023C31.7886 27.3988 34.8438 21.0021 47.9648 27.4404C61.086 33.8789 56.7212 42.8035 52.8984 46.4609C49.3762 41.7201 38.0328 47.0815 42.3438 51.2354C48.6247 57.2859 70.0675 58.8435 67.4033 38.751C64.7389 18.6582 38.2688 16.8631 16.5391 11.5469C8.58159 9.60004 3.34399 5.07616 0 0H134.351Z'
                fill='#D9D9D9'
              />
            </svg>
          </div>
        </div>

        <ScoreboardLogo />

        <div className='absolute scale-x-[-1] top-0 right-0 z-[2]'>
          <div className='relative'>
            <svg width='451' height='71' viewBox='0 0 451 71' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M409.443 0L450.443 71H9.35645L0 0H409.443Z' fill='white' />
            </svg>

            <span className='uppercase scale-x-[-1] font-integral text-black text-2xl font-bold absolute top-[17px] left-1/2 -translate-x-1/2'>
              {rightWarrior.name}
            </span>
          </div>

          {rightWarrior.isBanning && (
            <div className='absolute bottom-[-28px] right-[-14px]'>
              <svg width='201' height='28' viewBox='0 0 201 28' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M0 0H185.5L201 28H19.0001L9.5 13.7455L0 0Z' fill='white' />
              </svg>

              <span className='uppercase scale-x-[-1] font-integral text-black text-lg font-bold absolute top-[3px] leading-none right-[30px]'>
                Banning
              </span>
            </div>
          )}

          <div className='absolute top-0 left-[-80px]'>
            <span className='absolute scale-x-[-1] top-[13px] left-[100px] text-black text-3xl font-bold font-integral'>{rightWarrior.score}</span>
            <svg className='' width='166' height='71' viewBox='0 0 166 71' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path
                d='M134.351 0C149.587 4.3986 152.06 9.92612 158.322 15.1807C166.024 21.6426 172.26 59.3853 151.524 71H38.2246C30.1991 66.5553 24.9966 59.3019 23.832 52.7266C22.2969 44.0575 27.8904 33.1562 31.9014 31.4023C31.7886 27.3988 34.8438 21.0021 47.9648 27.4404C61.086 33.8789 56.7212 42.8035 52.8984 46.4609C49.3762 41.7201 38.0328 47.0815 42.3438 51.2354C48.6247 57.2859 70.0675 58.8435 67.4033 38.751C64.7389 18.6582 38.2688 16.8631 16.5391 11.5469C8.58159 9.60004 3.34399 5.07616 0 0H134.351Z'
                fill='#D9D9D9'
              />
            </svg>
          </div>
        </div>
      </div>
    </>
  )
}

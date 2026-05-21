'use client'

import { useBanningStore } from '@/stores/banning'
import { useStatusStore } from '@/stores/status'
import { computeAxieImageUrl } from '@/libs/utils'

export default function PageClient() {
  const { axies, warriors } = useBanningStore()
  const { status, phase, turn, countdown, isBufferTime } = useStatusStore()

  const leftAxies = axies.filter((a: any) => a.side === 'left')
  const rightAxies = axies.filter((a: any) => a.side === 'right')
  const left = warriors.find((w: any) => w.side === 'left')
  const right = warriors.find((w: any) => w.side === 'right')

  const seconds = Math.ceil((countdown || 0) / 1000)

  return (
    <main className='min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-950 text-white p-6'>
      <header className='flex items-center justify-between mb-6'>
        <div className='text-2xl font-bold'>{left?.displayName || 'Left'}</div>
        <div className='text-center'>
          <div className='text-5xl font-mono font-bold'>{seconds}s</div>
          <div className='text-xs opacity-70'>{status} · phase {phase} · turn {turn}{isBufferTime ? ' · BUFFER' : ''}</div>
        </div>
        <div className='text-2xl font-bold'>{right?.displayName || 'Right'}</div>
      </header>

      <div className='grid grid-cols-2 gap-6'>
        <section>
          <div className='grid grid-cols-5 gap-2'>
            {leftAxies.map((axie: any) => (
              <div
                key={axie.id}
                className={[
                  'relative aspect-square rounded-lg overflow-hidden border-2',
                  axie.isBanned ? 'border-red-500 grayscale opacity-50' :
                  axie.isSelected ? 'border-orange-400' :
                  'border-white/20',
                ].join(' ')}>
                <img src={computeAxieImageUrl(axie.id)} alt={axie.id} className='w-full h-full object-cover' draggable={false} />
                <div className='absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-center py-0.5'>#{axie.id}</div>
                {axie.isBanned && <div className='absolute inset-0 flex items-center justify-center'><div className='text-red-500 text-4xl font-bold'>✕</div></div>}
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className='grid grid-cols-5 gap-2'>
            {rightAxies.map((axie: any) => (
              <div
                key={axie.id}
                className={[
                  'relative aspect-square rounded-lg overflow-hidden border-2',
                  axie.isBanned ? 'border-red-500 grayscale opacity-50' :
                  axie.isSelected ? 'border-orange-400' :
                  'border-white/20',
                ].join(' ')}>
                <img src={computeAxieImageUrl(axie.id)} alt={axie.id} className='w-full h-full object-cover' draggable={false} />
                <div className='absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-center py-0.5'>#{axie.id}</div>
                {axie.isBanned && <div className='absolute inset-0 flex items-center justify-center'><div className='text-red-500 text-4xl font-bold'>✕</div></div>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

'use client'

// COPY-FROM-V1: This is the streaming view. Use the same v1 components as the battle page —
// just without the interactive bits (no ready button, no click-to-ban). The HUD reads the same
// store, so once you bring over apps/web/components/{axies,banning-pool,scoreboard}.tsx it'll
// look identical to v1's /inspect/[id].
//
// Important: spectator view shows ONLY `warrior.displayName` (admin-set). It must NEVER show
// `discordUsername` — that's admin-only context for verifying identity.

import { useBanningStore } from '@/stores/banning'
import { useStatusStore } from '@/stores/status'

export default function SpectatorPage() {
  const { warriors, axies } = useBanningStore()
  const { phase, turn, countdown, isBufferTime } = useStatusStore()

  const left = warriors.find((w) => w.side === 'left')
  const right = warriors.find((w) => w.side === 'right')

  return (
    <main className='min-h-screen w-screen relative'>
      <div className='absolute top-4 left-0 right-0 flex justify-center gap-12 z-10'>
        <div className='text-2xl font-bold uppercase'>{left?.displayName ?? '—'}</div>
        <div className='text-2xl font-mono'>
          {Math.ceil(countdown / 1000)}s {isBufferTime && <span className='text-yellow-400'>(buffer)</span>}
        </div>
        <div className='text-2xl font-bold uppercase'>{right?.displayName ?? '—'}</div>
      </div>
      <div className='absolute bottom-0 left-0 right-0 p-6'>
        <div className='grid grid-cols-2 gap-6'>
          {(['left', 'right'] as const).map((side) => {
            const pool = axies.filter((a) => a.side === side)
            return (
              <div key={side} className='grid grid-cols-5 gap-2'>
                {pool.map((a) => (
                  <div
                    key={a.id}
                    className={`aspect-square border rounded flex items-center justify-center text-xs ${
                      a.isBanned ? 'opacity-20 line-through' : ''
                    } ${a.isSelected ? 'ring-2 ring-yellow-400' : ''}`}>
                    {a.id}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
      <div className='absolute top-16 left-0 right-0 text-center text-sm opacity-60'>
        Phase {phase} · Turn {turn}
      </div>
    </main>
  )
}

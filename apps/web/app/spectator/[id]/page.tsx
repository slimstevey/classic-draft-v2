'use client'

import { useBanningStore } from '@/stores/banning'
import { useStatusStore } from '@/stores/status'
import { computeAxieImageUrl, computeAxieCardUrl } from '@/libs/utils'

export default function PageClient() {
  const { axies, warriors } = useBanningStore()
  const { status, phase, turn, countdown, isBufferTime } = useStatusStore()

  const left = warriors.find((w: any) => w.side === 'left')
  const right = warriors.find((w: any) => w.side === 'right')
  const leftAxies = axies.filter((a: any) => a.side === 'left')
  const rightAxies = axies.filter((a: any) => a.side === 'right')

  const seconds = Math.ceil((countdown || 0) / 1000)
  const activeBanner = warriors.find((w: any) => w.isBanning && w.bannedCount > 0)
  const showPhase2Banner = status === 'banning' && phase === 2 && activeBanner

  // Inspection — whichever warrior is currently banning, show their inspection
  const inspector = activeBanner || warriors.find((w: any) => w.inspectedAxieId)
  const inspectedAxie = inspector?.inspectedAxieId ? axies.find((a: any) => a.id === inspector.inspectedAxieId) : null

  return (
    <main className='min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-950 text-white p-6 pb-72'>
      <header className='flex items-center justify-between mb-6'>
        <div className='text-2xl font-bold'>{left?.displayName || 'Left'}</div>
        <div className='text-center'>
          <div className='text-5xl font-mono font-bold'>{seconds}s</div>
          <div className='text-xs opacity-70'>{status} · phase {phase} · turn {turn}{isBufferTime ? ' · BUFFER' : ''}</div>
        </div>
        <div className='text-2xl font-bold'>{right?.displayName || 'Right'}</div>
      </header>

      {showPhase2Banner && (
        <div className='mb-6 px-6 py-3 bg-yellow-500/90 text-black font-bold text-xl text-center rounded-lg shadow-lg'>
          BANNING NOW: {activeBanner.displayName || activeBanner.side} — {activeBanner.bannedCount} ban{activeBanner.bannedCount === 1 ? '' : 's'} remaining
        </div>
      )}

      <div className='grid grid-cols-2 gap-6 mb-6'>
        <section>
          <div className='grid grid-cols-5 gap-2'>
            {leftAxies.map((axie: any) => <SpectatorAxieCard key={axie.id} axie={axie} phase={phase} isInspected={axie.id === inspectedAxie?.id} />)}
          </div>
        </section>
        <section>
          <div className='grid grid-cols-5 gap-2'>
            {rightAxies.map((axie: any) => <SpectatorAxieCard key={axie.id} axie={axie} phase={phase} isInspected={axie.id === inspectedAxie?.id} />)}
          </div>
        </section>
      </div>

      {/* Inspection preview (shown when a warrior clicks an axie) */}
      {inspectedAxie && phase >= 2 && (
        <div className='fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t-2 border-blue-400/50 p-4 z-40'>
          <div className='max-w-5xl mx-auto flex items-center gap-6'>
            <div className='text-sm font-bold text-blue-300'>{inspector?.displayName} is looking at:</div>
            <img
              src={computeAxieImageUrl(inspectedAxie.id)}
              alt={inspectedAxie.id}
              className='w-32 h-32 object-contain flex-shrink-0'
              draggable={false}
            />
            <div className='flex-1'>
              <div className='text-xl font-bold mb-1'>#{inspectedAxie.id}</div>
              <div className='text-xs opacity-70 mb-2'>side: {inspectedAxie.side} {inspectedAxie.isBanned && '· BANNED'}</div>
              <div className='grid grid-cols-2 gap-2'>
                {(inspectedAxie.cards || []).map((card: any) => (
                  <div key={card.id} className='flex items-center gap-2 bg-white/10 rounded p-2'>
                    <img src={computeAxieCardUrl(card)} alt={card.id} className='w-10 h-10 rounded' />
                    <div className='text-xs'>
                      <div className='font-mono opacity-70'>{card.id}</div>
                      <div className='flex gap-3 mt-1'>
                        <span>⚔️ {card.attack}</span>
                        <span>🛡️ {card.defense}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End-of-draft summary */}
      {status === 'done' && (
        <DoneOverlay leftAxies={leftAxies} rightAxies={rightAxies} left={left} right={right} />
      )}
    </main>
  )
}

function SpectatorAxieCard({ axie, phase, isInspected }: any) {
  return (
    <div className={[
      'relative aspect-square rounded-lg overflow-hidden border-2 transition',
      axie.isBanned ? 'border-red-500 grayscale opacity-50' :
      isInspected ? 'border-blue-400 ring-2 ring-blue-300 scale-105' :
      axie.isSelected && phase >= 2 ? 'border-orange-400' :
      'border-white/20',
    ].join(' ')}>
      <img src={computeAxieImageUrl(axie.id)} alt={axie.id} className='w-full h-full object-cover' draggable={false} />
      <div className='absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-center py-0.5'>#{axie.id}</div>
      {axie.isBanned && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='text-red-500 text-4xl font-bold'>✕</div>
        </div>
      )}
    </div>
  )
}

function DoneOverlay({ leftAxies, rightAxies, left, right }: any) {
  const leftBanned = leftAxies.filter((a: any) => a.isBanned)
  const leftRemaining = leftAxies.filter((a: any) => !a.isBanned)
  const rightBanned = rightAxies.filter((a: any) => a.isBanned)
  const rightRemaining = rightAxies.filter((a: any) => !a.isBanned)

  return (
    <div className='fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6'>
      <div className='bg-emerald-950 border border-emerald-500/30 rounded-2xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto'>
        <h1 className='text-4xl font-bold text-center mb-8'>DRAFT COMPLETE</h1>
        <div className='grid grid-cols-2 gap-8'>
          {[{w: left, banned: leftBanned, remaining: leftRemaining, label: 'LEFT'},
            {w: right, banned: rightBanned, remaining: rightRemaining, label: 'RIGHT'}].map((side: any, i) => (
            <div key={i}>
              <h2 className='text-2xl font-bold mb-4'>{side.w?.displayName || side.label}</h2>
              <div className='mb-4'>
                <h3 className='text-sm uppercase opacity-70 mb-2'>Banned ({side.banned.length})</h3>
                <div className='grid grid-cols-5 gap-2'>
                  {side.banned.map((a: any) => (
                    <div key={a.id} className='relative aspect-square rounded border border-red-500/50 overflow-hidden grayscale opacity-60'>
                      <img src={computeAxieImageUrl(a.id)} alt={a.id} className='w-full h-full object-cover' />
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <div className='text-red-500 text-3xl font-bold'>✕</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className='text-sm uppercase opacity-70 mb-2'>Remaining ({side.remaining.length})</h3>
                <div className='grid grid-cols-5 gap-2'>
                  {side.remaining.map((a: any) => (
                    <div key={a.id} className='aspect-square rounded border border-emerald-500/50 overflow-hidden'>
                      <img src={computeAxieImageUrl(a.id)} alt={a.id} className='w-full h-full object-cover' />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

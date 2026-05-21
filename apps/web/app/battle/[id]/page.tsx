'use client'

import { useAuthStore } from '@/stores/auth'
import { useBanningStore } from '@/stores/banning'
import { useRoomStore } from '@/stores/room'
import { useStatusStore } from '@/stores/status'
import { computeAxieImageUrl } from '@/libs/utils'
import { MESSAGES } from '@repo/shared/constants'

export default function PageClient() {
  const { axies } = useBanningStore()
  const { warriors } = useBanningStore()
  const { discordId } = useAuthStore()
  const { instance } = useRoomStore()
  const { status, phase, turn, countdown, isBufferTime } = useStatusStore()

  const you = warriors.find((w: any) => w.discordId === discordId)
  const opp = warriors.find((w: any) => w.discordId !== discordId)

  const leftAxies = axies.filter((a: any) => a.side === 'left')
  const rightAxies = axies.filter((a: any) => a.side === 'right')

  const handleReady = () => {
    instance?.send(MESSAGES.PLAYER_READY, { isReady: true })
  }

  const handleSelect = (axie: any) => {
    if (axie.isSelected || axie.isBanned) return
    instance?.send(MESSAGES.SELECT_AXIE, { axie })
  }

  const handleBan = (axie: any) => {
    instance?.send(MESSAGES.BAN_AXIE, { axie })
  }

  const seconds = Math.ceil((countdown || 0) / 1000)

  return (
    <main className='min-h-screen bg-gradient-to-b from-emerald-900 to-emerald-950 text-white p-6'>
      <header className='flex items-center justify-between mb-6'>
        <div>
          <div className='text-2xl font-bold'>{you?.displayName || 'You'} <span className='text-xs opacity-60'>(you)</span></div>
          <div className='text-xs opacity-60'>side: {you?.side ?? '—'}</div>
        </div>
        <div className='text-center'>
          <div className='text-5xl font-mono font-bold'>{seconds}s</div>
          <div className='text-xs opacity-70'>{status} · phase {phase} · turn {turn}{isBufferTime ? ' · BUFFER' : ''}</div>
          {you?.isBanning && <div className='text-yellow-300 text-sm font-bold mt-1'>YOUR TURN — ban {you.bannedCount} axies</div>}
        </div>
        <div className='text-right'>
          <div className='text-2xl font-bold'>{opp?.displayName || 'Opponent'}</div>
          <div className='text-xs opacity-60'>side: {opp?.side ?? '—'}</div>
        </div>
      </header>

      {status === 'initial' && (
        <div className='flex justify-center mb-6'>
          <button
            onClick={handleReady}
            disabled={you?.isReady}
            className='px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 disabled:cursor-not-allowed rounded-lg text-2xl font-bold shadow-lg'>
            {you?.isReady ? '✅ Ready — Waiting for opponent' : "I'm Ready"}
          </button>
        </div>
      )}

      <div className='grid grid-cols-2 gap-6'>
        <section>
          <h2 className='text-lg font-bold mb-2'>{warriors.find((w: any) => w.side === 'left')?.displayName || 'Left'}</h2>
          <div className='grid grid-cols-5 gap-2'>
            {leftAxies.map((axie: any) => (
              <AxieCard
                key={axie.id}
                axie={axie}
                you={you}
                onSelect={() => handleSelect(axie)}
                onBan={() => handleBan(axie)}
              />
            ))}
          </div>
        </section>
        <section>
          <h2 className='text-lg font-bold mb-2'>{warriors.find((w: any) => w.side === 'right')?.displayName || 'Right'}</h2>
          <div className='grid grid-cols-5 gap-2'>
            {rightAxies.map((axie: any) => (
              <AxieCard
                key={axie.id}
                axie={axie}
                you={you}
                onSelect={() => handleSelect(axie)}
                onBan={() => handleBan(axie)}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function AxieCard({ axie, you, onSelect, onBan }: any) {
  const canBan = you?.isBanning && axie.side !== you.side && axie.isSelected && !axie.isBanned

  return (
    <div
      onClick={onSelect}
      className={[
        'relative aspect-square rounded-lg cursor-pointer overflow-hidden border-2 transition',
        axie.isBanned ? 'border-red-500 grayscale opacity-50' :
        axie.isSelected ? 'border-orange-400 ring-2 ring-orange-300' :
        'border-white/20 hover:border-white/50',
      ].join(' ')}>
      <img
        src={computeAxieImageUrl(axie.id)}
        alt={axie.id}
        className='w-full h-full object-cover'
        draggable={false}
      />
      <div className='absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-center py-0.5'>#{axie.id}</div>
      {axie.isBanned && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='text-red-500 text-4xl font-bold'>✕</div>
        </div>
      )}
      {canBan && (
        <button
          onClick={(e) => { e.stopPropagation(); onBan() }}
          className='absolute top-1 right-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-lg z-10'>
          BAN
        </button>
      )}
    </div>
  )
}

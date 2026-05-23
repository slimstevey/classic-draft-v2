'use client'

import { useAuthStore } from '@/stores/auth'
import { useBanningStore } from '@/stores/banning'
import { useRoomStore } from '@/stores/room'
import { useStatusStore } from '@/stores/status'
import { computeAxieImageUrl, computeAxieCardUrl } from '@/libs/utils'
import { MESSAGES } from '@repo/shared/constants'
import { useState, useEffect } from 'react'

export default function PageClient() {
  const { axies, warriors } = useBanningStore()
  const { discordId } = useAuthStore()
  const { instance } = useRoomStore()
  const { status, phase, turn, countdown, isBufferTime } = useStatusStore()

  const [previewAxieId, setPreviewAxieId] = useState<string | null>(null)

  const you = warriors.find((w: any) => w.discordId === discordId)
  const opp = warriors.find((w: any) => w.discordId !== discordId)
  const left = warriors.find((w: any) => w.side === 'left')
  const right = warriors.find((w: any) => w.side === 'right')

  const leftAxies = axies.filter((a: any) => a.side === 'left')
  const rightAxies = axies.filter((a: any) => a.side === 'right')

  const previewAxie = axies.find((a: any) => a.id === previewAxieId)
  const seconds = Math.ceil((countdown || 0) / 1000)

  // Broadcast inspection click — also clear when clicking same axie or closing
  useEffect(() => {
    if (!instance) return
    instance.send(MESSAGES.INSPECT_AXIE, { axieId: previewAxieId ?? '' })
  }, [previewAxieId, instance])

  const handleReady = () => instance?.send(MESSAGES.PLAYER_READY, { isReady: true })
  const handleSelect = (axie: any) => {
    // Toggle preview: if same axie clicked, clear; else set
    setPreviewAxieId(prev => prev === axie.id ? null : axie.id)
    if (axie.isSelected || axie.isBanned) return
    instance?.send(MESSAGES.SELECT_AXIE, { axie })
  }
  const handleBan = (axie: any) => {
    instance?.send(MESSAGES.BAN_AXIE, { axie })
    setPreviewAxieId(null)
  }



  const activeBanner = warriors.find((w: any) => w.isBanning && w.bannedCount > 0)
  const showPhase2Banner = status === 'banning' && phase === 2 && activeBanner

  return (
    <main
      className='min-h-screen text-white p-6 pb-72 bg-no-repeat bg-cover bg-center bg-fixed'
      style={{
        backgroundImage: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url('/banner.webp')",
      }}>
      <header className='flex items-center justify-center mb-6'>
        <div className='text-center'>
          <div className='text-5xl font-mono font-bold'>{seconds}s</div>
          <div className='text-xs opacity-70'>{status} · phase {phase} · turn {turn}{isBufferTime ? ' · BUFFER' : ''}</div>
          {you?.isBanning && you.bannedCount > 0 && <div className='text-yellow-300 text-sm font-bold mt-1'>YOUR TURN — ban {you.bannedCount} axies</div>}
        </div>
      </header>

      {showPhase2Banner && (
        <div className='mb-6 px-6 py-3 bg-yellow-500/90 text-black font-bold text-xl text-center rounded-lg shadow-lg'>
          BANNING NOW: {activeBanner.displayName || activeBanner.side} — {activeBanner.bannedCount} ban{activeBanner.bannedCount === 1 ? '' : 's'} remaining
        </div>
      )}

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

      <div className='grid grid-cols-2 gap-6 mb-6'>
        <section>
          <h2 className='text-lg font-bold mb-2'>{left?.displayName || 'Left'}</h2>
          <div className='grid grid-cols-5 gap-2'>
            {leftAxies.map((axie: any) => (
              <AxieCard
                key={axie.id}
                axie={axie}
                you={you}
                phase={phase}
                isPreviewing={axie.id === previewAxieId}
                status={status}
                onSelect={() => handleSelect(axie)}
                onBan={() => handleBan(axie)}
              />
            ))}
          </div>
        </section>
        <section>
          <h2 className='text-lg font-bold mb-2'>{right?.displayName || 'Right'}</h2>
          <div className='grid grid-cols-5 gap-2'>
            {rightAxies.map((axie: any) => (
              <AxieCard
                key={axie.id}
                axie={axie}
                you={you}
                phase={phase}
                isPreviewing={axie.id === previewAxieId}
                status={status}
                onSelect={() => handleSelect(axie)}
                onBan={() => handleBan(axie)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Bottom preview panel - just big axie image */}
      {previewAxie && (
        <div className='fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t-2 border-white/30 p-4 z-40'>
          <div className='max-w-3xl mx-auto flex items-center justify-center gap-6 relative'>
            <button
              onClick={() => setPreviewAxieId(null)}
              className='absolute -top-2 -right-2 text-white/60 hover:text-white text-2xl bg-black/50 rounded-full w-8 h-8 flex items-center justify-center'>
              ✕
            </button>
            <img
              src={computeAxieImageUrl(previewAxie.id)}
              alt={previewAxie.id}
              className='w-56 h-56 object-contain flex-shrink-0'
              draggable={false}
            />
            <div>
              <div className='text-3xl font-bold mb-2'>#{previewAxie.id}</div>
              <div className='text-sm opacity-70 mb-4'>{previewAxie.isBanned ? 'BANNED' : ''}</div>
              {previewAxie.side !== you?.side && !previewAxie.isBanned && (
                you?.isBanning && you.bannedCount > 0 ? (
                  <button
                    onClick={() => handleBan(previewAxie)}
                    className='px-6 py-3 bg-red-600 hover:bg-red-700 rounded font-bold text-lg'>
                    BAN this axie
                  </button>
                ) : phase === 1 && status === 'banning' && axies.find((a: any) => a.isBanned && a.side !== you?.side && a.side === previewAxie.side) ? (
                  <div className='px-6 py-3 bg-gray-700 text-gray-300 rounded font-bold inline-block cursor-not-allowed'>
                    ✅ You already banned an axie · waiting for opponent / timer
                  </div>
                ) : (
                  <div className='px-6 py-3 bg-gray-700 text-gray-300 rounded font-bold inline-block cursor-not-allowed'>
                    Wait for your turn to ban
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
      {status === 'done' && (
        <DoneOverlay leftAxies={leftAxies} rightAxies={rightAxies} left={left} right={right} />
      )}

    </main>
  )
}

function AxieCard({ axie, you, phase, status, isPreviewing, onSelect, onBan }: any) {
  const isOpponentSide = you && axie.side !== you.side
  const canBan = you?.isBanning && isOpponentSide && axie.isSelected && !axie.isBanned

  // Show the "Not your turn" state when you select an opponent's axie but it's not your turn
  const showWaitingState = isOpponentSide && axie.isSelected && !you?.isBanning && !axie.isBanned

  // In phase 1, hide selection state of opponent's axies (you only see your own)
  const hideSelection = phase === 1 && you && axie.side !== you.side

  // In phase 1, hide bans on opponent's axies during the banning phase (reveal when phase 1 ends)
  const hideBan = phase === 1 && status === 'banning' && you && axie.side !== you.side && axie.isBanned

  return (
    <div
      onClick={onSelect}
      className={[
        'relative aspect-square rounded-lg cursor-pointer overflow-hidden border-2 transition',
        (axie.isBanned && !hideBan) ? 'border-red-500 grayscale opacity-50' :
        isPreviewing ? 'border-blue-400 ring-2 ring-blue-300 scale-105' :
        (!hideSelection && axie.isSelected) ? 'border-orange-400 ring-2 ring-orange-300' :
        'border-white/20 hover:border-white/50',
      ].join(' ')}>
      <img
        src={computeAxieImageUrl(axie.id)}
        alt={axie.id}
        className='w-full h-full object-cover'
        draggable={false}
      />
      <div className='absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-center py-0.5'>#{axie.id}</div>
      {axie.isBanned && !hideBan && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='text-red-500 text-5xl font-bold'>✕</div>
        </div>
      )}
      {canBan && (
        <button
          onClick={(e) => { e.stopPropagation(); onBan() }}
          className='absolute top-1 right-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-lg z-10'>
          BAN
        </button>
      )}
      {showWaitingState && (
        <div className='absolute top-1 right-1 px-2 py-1 bg-gray-700 text-gray-300 text-xs font-bold rounded shadow-lg z-10 cursor-not-allowed'>
          Wait your turn
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
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat'
      style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.92)), url('/banner.webp')" }}>
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

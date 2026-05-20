'use client'

// COPY-FROM-V1: This file should render the warrior HUD using the components from your v1 repo:
//   - apps/web/components/axies.tsx
//   - apps/web/components/banning-pool.tsx
//   - apps/web/components/scoreboard.tsx
//   - apps/web/components/ready-button.tsx
//   - apps/web/components/player-indicator.tsx
//   - apps/web/components/banning-indicator.tsx
//   - apps/web/assets/backgrounds/forest.png
//
// Bring those files over to /apps/web/components and /apps/web/assets respectively.
// They mostly just read from useBanningStore / useStatusStore which are wired up here.
//
// Minimal placeholder below so the project builds. Replace once components are copied.

import { useBanningStore } from '@/stores/banning'
import { useRoomStore } from '@/stores/room'
import { useStatusStore } from '@/stores/status'
import { MESSAGES } from '@repo/shared/constants'
import { BanAxiePayload, PlayerReadyPayload, SelectAxiePayload } from '@repo/shared/types'

export default function BattlePage() {
  const { instance } = useRoomStore()
  const { warriors, axies } = useBanningStore()
  const { status, phase, turn, countdown, isBufferTime } = useStatusStore()

  const setReady = () => {
    const payload: PlayerReadyPayload = { isReady: true }
    instance?.send(MESSAGES.PLAYER_READY, payload)
  }

  const select = (axieId: string) => {
    const axie = axies.find((a) => a.id === axieId)
    if (!axie) return
    instance?.send<SelectAxiePayload>(MESSAGES.SELECT_AXIE, { axie })
  }

  const ban = (axieId: string) => {
    const axie = axies.find((a) => a.id === axieId)
    if (!axie) return
    instance?.send<BanAxiePayload>(MESSAGES.BAN_AXIE, { axie })
  }

  const left = warriors.find((w) => w.side === 'left')
  const right = warriors.find((w) => w.side === 'right')

  return (
    <main className='min-h-screen p-6'>
      <div className='max-w-5xl mx-auto'>
        <div className='border rounded p-4 mb-4 text-sm'>
          <div className='flex justify-between items-center mb-2'>
            <span className='font-bold'>{left?.displayName ?? '—'}</span>
            <span className='font-mono'>{Math.ceil(countdown / 1000)}s {isBufferTime && '(buffer)'}</span>
            <span className='font-bold'>{right?.displayName ?? '—'}</span>
          </div>
          <div className='text-xs opacity-60 text-center'>
            Status: {status} · Phase {phase} · Turn {turn}
          </div>
        </div>

        {status === 'initial' && (
          <button onClick={setReady} className='border rounded px-4 py-2 hover:bg-white/5'>
            I&apos;m Ready
          </button>
        )}

        <div className='grid grid-cols-2 gap-6 mt-4'>
          {(['left', 'right'] as const).map((side) => {
            const w = warriors.find((x) => x.side === side)
            const pool = axies.filter((a) => a.side === side)
            return (
              <div key={side} className='border rounded p-3'>
                <h3 className='font-bold mb-2'>{w?.displayName ?? side}</h3>
                <div className='grid grid-cols-5 gap-2'>
                  {pool.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => (a.isSelected ? ban(a.id) : select(a.id))}
                      className={`border rounded p-1 text-xs ${a.isBanned ? 'opacity-30 line-through' : ''} ${
                        a.isSelected ? 'ring-2 ring-yellow-400' : ''
                      }`}>
                      {a.id}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p className='text-xs opacity-50 mt-6'>
          This is a minimal warrior UI. Drop in the v1 HUD components (axies / banning-pool /
          scoreboard / ready-button) to restore the full visual experience.
        </p>
      </div>
    </main>
  )
}

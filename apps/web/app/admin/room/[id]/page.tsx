'use client'

import { COLYSEUS_HTTP } from '@/libs/colyseus'
import { computeAxieImageUrl } from '@/libs/utils'
import { useAuthStore } from '@/stores/auth'
import { useBanningStore } from '@/stores/banning'
import { useRoomStore } from '@/stores/room'
import { useStatusStore } from '@/stores/status'
import { JOIN_CODE_LENGTH, MESSAGES } from '@repo/shared/constants'
import {
  Axie,
  AxiePart,
  AxiePartAbility,
  ForceSkipTurnPayload,
  KickWarriorPayload,
  Side,
  TurnOrder,
  UpdatePlayerInfoPayload,
  UpdateRoomConfigPayload,
} from '@repo/shared/types'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

interface JoinCodeRecord {
  side: Side
  code: string
}

export default function AdminRoomPage() {
  const { id } = useParams<{ id: string }>()
  const { instance } = useRoomStore()
  const { warriors, axies } = useBanningStore()
  const { playerToken } = useAuthStore()
  const [creatingRoom, setCreatingRoom] = useState(false)

  const createNewRoom = async () => {
    if (!playerToken) {
      setInfo('Not authenticated — go to /admin first')
      return
    }
    setCreatingRoom(true)
    try {
      const res = await fetch(`${COLYSEUS_HTTP}/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${playerToken}` },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setInfo(j.error ?? `Failed (HTTP ${res.status})`)
        return
      }
      const data: { roomId: string; joinCodes: { side: string; code: string }[] } = await res.json()
      localStorage.setItem(`acd:joinCodes:${data.roomId}`, JSON.stringify(data.joinCodes))
      window.open(`/admin/room/${data.roomId}`, '_blank')
      setInfo(`New room created: ${data.roomId} — opened in new tab`)
    } catch (err) {
      setInfo(err instanceof Error ? err.message : 'Failed to create room')
    } finally {
      setCreatingRoom(false)
    }
  }
  const { status, phase, turn, countdown, isBufferTime } = useStatusStore()

  // Form state
  const [leftName, setLeftName] = useState('Left Player')
  const [rightName, setRightName] = useState('Right Player')
  const [turnOrder, setTurnOrder] = useState<'left' | 'right'>('left')
  const [leftAxieIds, setLeftAxieIds] = useState('')
  const [rightAxieIds, setRightAxieIds] = useState('')
  const [poolSize, setPoolSize] = useState('10')
  const [banCount, setBanCount] = useState('3')

  const [joinCodes, setJoinCodes] = useState<JoinCodeRecord[]>([])
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  // Load the join codes that the server returned when admin created this room.
  useEffect(() => {
    if (!id) return
    const raw = localStorage.getItem(`acd:joinCodes:${id}`)
    if (raw) {
      try {
        setJoinCodes(JSON.parse(raw))
      } catch {
        // ignore
      }
    }
  }, [id])

  const leftWarrior = warriors.find((w) => w.side === 'left')
  const rightWarrior = warriors.find((w) => w.side === 'right')

  const leftCode = useMemo(() => joinCodes.find((c) => c.side === 'left')?.code ?? '', [joinCodes])
  const rightCode = useMemo(() => joinCodes.find((c) => c.side === 'right')?.code ?? '', [joinCodes])

  const formatCode = (c: string) => {
    if (c.length !== JOIN_CODE_LENGTH) return c
    return `${c.slice(0, 4)}-${c.slice(4)}`
  }

  const copy = (text: string) => navigator.clipboard.writeText(text).catch(() => {})

  const fetchAxiePool = async (axieIds: string[], side: Side): Promise<Axie[]> => {
    if (axieIds.length === 0) return []
    const res = await fetch(`${COLYSEUS_HTTP}/axies/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ axieIds }),
    })
    if (!res.ok) throw new Error(`axie fetch failed: ${res.status}`)
    const data = await res.json()
    console.log('[fetchAxiePool] response:', side, JSON.stringify(data).slice(0, 500))
    console.log('[fetchAxiePool] requested ids:', axieIds)
    return axieIds.map((axieId) => {
      const axie = data.data?.[`axie${axieId}`]
      const cards: Axie['cards'] = []
      axie?.parts?.forEach((part: AxiePart) => {
        part.abilities?.forEach((ab: AxiePartAbility) => {
          cards.push({ id: ab.id, attack: ab.attack, defense: ab.defense })
        })
      })
      return {
        id: axieId,
        genes: axie?.newGenes ?? '',
        cards,
        side,
        isSelected: false,
        isBanned: false,
      }
    })
  }

  const updateConfig = async () => {
    if (!instance) return
    setBusy(true)
    setInfo(null)
    try {
      const leftIds = leftAxieIds.split(/[\s,]+/).filter(Boolean)
      const rightIds = rightAxieIds.split(/[\s,]+/).filter(Boolean)
      const [leftPool, rightPool] = await Promise.all([
        fetchAxiePool(leftIds, 'left'),
        fetchAxiePool(rightIds, 'right'),
      ])

      const payload: UpdateRoomConfigPayload = {
        numberOfBans: parseInt(banCount, 10),
        poolSize: parseInt(poolSize, 10),
        warriors: [
          {
            side: 'left',
            displayName: leftName,
            turnOrder: (turnOrder === 'left' ? 'first' : 'second') as TurnOrder,
            joinCode: leftCode,
            pool: leftPool,
            isAllowToAddPool: leftPool.length === 0,
          },
          {
            side: 'right',
            displayName: rightName,
            turnOrder: (turnOrder === 'left' ? 'second' : 'first') as TurnOrder,
            joinCode: rightCode,
            pool: rightPool,
            isAllowToAddPool: rightPool.length === 0,
          },
        ],
      }
      console.log('[updateConfig] sending payload:', JSON.stringify(payload, null, 2))
      instance.send(MESSAGES.UPDATE_ROOM_CONFIG, payload)
      setInfo('Room config updated.')
    } catch (err) {
      setInfo(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const updatePlayerInfoOnly = () => {
    if (!instance) return
    const payload: UpdatePlayerInfoPayload = {
      warriors: [
        { side: 'left', displayName: leftName, score: leftWarrior?.score ?? 0 },
        { side: 'right', displayName: rightName, score: rightWarrior?.score ?? 0 },
      ],
    }
    instance.send(MESSAGES.UPDATE_PLAYER_INFO, payload)
    setInfo('Player names/scores updated.')
  }

  const resetBanning = () => {
    instance?.send(MESSAGES.RESET_BANNING, {})
    setInfo('Draft reset.')
  }

  const forceSkip = () => {
    const payload: ForceSkipTurnPayload = {}
    instance?.send(MESSAGES.FORCE_SKIP_TURN, payload)
    setInfo('Forced skip.')
  }

  const kick = (side: Side) => {
    const payload: KickWarriorPayload = { side }
    instance?.send(MESSAGES.KICK_WARRIOR, payload)
    setInfo(`Kicked ${side} side; code is reusable.`)
  }

  // Sync display name fields from server state on first load.
  useEffect(() => {
    if (leftWarrior && leftWarrior.displayName && leftName === 'Left Player') setLeftName(leftWarrior.displayName)
    if (rightWarrior && rightWarrior.displayName && rightName === 'Right Player') setRightName(rightWarrior.displayName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftWarrior?.displayName, rightWarrior?.displayName])

  return (
    <main className='min-h-screen w-full p-6'>
      <div className='max-w-5xl mx-auto flex flex-col gap-6'>
        <header className='flex items-start justify-between gap-4'>
          <div>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl font-bold'>Admin Room</h1>
              <button
                onClick={createNewRoom}
                disabled={creatingRoom}
                className='px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-sm font-semibold rounded shadow'>
                {creatingRoom ? 'Creating…' : '+ New Room'}
              </button>
            </div>
            <div className='text-sm opacity-70 mt-1'>
              ID: <code className='font-mono'>{id}</code>
            </div>
          </div>
          <div className='text-right text-sm'>
            <div>
              Status: <span className='font-mono'>{status}</span>
            </div>
            <div>
              Phase {phase} · Turn {turn} · Countdown {Math.ceil(countdown / 1000)}s
              {isBufferTime && <span className='ml-1 text-yellow-400'>(buffer)</span>}
            </div>
          </div>
        </header>

        {/* Mini Draft View */}
        <section className='border border-emerald-500/30 rounded-lg p-4 bg-black/20'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='font-semibold'>Live Draft View</h2>
            <div className='text-xs opacity-70 font-mono'>
              {status === 'done' ? (
                <span className='text-yellow-300 font-bold'>✓ DRAFT COMPLETE</span>
              ) : status === 'banning' ? (
                <span>
                  Phase {phase} · Turn {turn} · {Math.ceil(countdown / 1000)}s
                  {(() => {
                    const banner = warriors.find((w: any) => w.isBanning && w.bannedCount > 0)
                    return banner ? <span className='ml-2 text-yellow-300'>· {banner.displayName || banner.side} banning ({banner.bannedCount} left)</span> : null
                  })()}
                </span>
              ) : (
                <span>{status}</span>
              )}
            </div>
          </div>
          {axies.length === 0 ? (
            <div className='text-xs opacity-60 italic'>No axies loaded yet. Update Room Config below to load pools.</div>
          ) : (
            <div className='grid grid-cols-2 gap-3'>
              {['left', 'right'].map((side) => {
                const w = warriors.find((x: any) => x.side === side)
                const sideAxies = axies.filter((a: any) => a.side === side)
                return (
                  <div key={side}>
                    <div className='text-sm font-semibold mb-1'>{w?.displayName || side.toUpperCase()}{w?.isBanning && <span className='ml-2 text-yellow-300 text-xs'>BANNING</span>}</div>
                    <div className='grid grid-cols-5 gap-1'>
                      {sideAxies.map((a: any) => (
                        <div key={a.id} className={`relative aspect-square rounded overflow-hidden border ${a.isBanned ? 'border-red-500 opacity-40 grayscale' : a.isSelected ? 'border-orange-400' : 'border-white/10'}`}>
                          <img src={computeAxieImageUrl(a.id)} alt={a.id} className='w-full h-full object-cover' />
                          {a.isBanned && (
                            <div className='absolute inset-0 flex items-center justify-center'>
                              <div className='text-red-500 text-xl font-bold'>✕</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {info && <div className='text-xs bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2'>{info}</div>}

        {/* Join codes */}
        <section className='border rounded-lg p-4'>
          <h2 className='font-semibold mb-3'>Join Codes</h2>
          <p className='text-xs opacity-60 mb-3'>
            DM each player their code via Discord. Each code is single-use; if the wrong person
            joins, click <em>Kick</em> to free it for the correct player.
          </p>
          <div className='grid md:grid-cols-2 gap-3'>
            {(['left', 'right'] as const).map((side) => {
              const code = side === 'left' ? leftCode : rightCode
              const w = side === 'left' ? leftWarrior : rightWarrior
              return (
                <div key={side} className='border rounded p-3 flex flex-col gap-2'>
                  <div className='text-sm opacity-70'>{side === 'left' ? 'Left' : 'Right'} side</div>
                  <div className='flex items-center gap-2'>
                    <code className='font-mono text-lg tracking-wider'>{formatCode(code)}</code>
                    <button onClick={() => copy(code)} className='text-xs underline opacity-70 hover:opacity-100'>
                      copy code
                    </button>
                    <button
                      onClick={() => copy(`${window.location.origin}/warrior?room=${id}&code=${code}`)}
                      className='text-xs underline opacity-70 hover:opacity-100'>
                      copy link
                    </button>
                  </div>
                  <div className='text-xs flex items-center gap-2 mt-1'>
                    {w?.discordUsername ? (
                      <>
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            w.connected ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          title={w.connected ? 'connected' : 'disconnected'}
                        />
                        <span>Discord: <strong>{w.discordUsername}</strong></span>
                        <button onClick={() => kick(side)} className='ml-auto text-xs underline opacity-70'>
                          Kick
                        </button>
                      </>
                    ) : (
                      <span className='opacity-50'>not redeemed yet</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Player config */}
        <section className='border rounded-lg p-4 flex flex-col gap-3'>
          <h2 className='font-semibold'>Player Display Names (shown on stream)</h2>
          <div className='grid md:grid-cols-2 gap-3'>
            <div>
              <label className='text-sm'>Left display name</label>
              <input
                value={leftName}
                onChange={(e) => setLeftName(e.target.value)}
                className='border rounded px-3 py-2 bg-transparent w-full mt-1'
              />
            </div>
            <div>
              <label className='text-sm'>Right display name</label>
              <input
                value={rightName}
                onChange={(e) => setRightName(e.target.value)}
                className='border rounded px-3 py-2 bg-transparent w-full mt-1'
              />
            </div>
          </div>

          <div className='grid md:grid-cols-3 gap-3'>
            <div>
              <label className='text-sm'>Turn order</label>
              <select
                value={turnOrder}
                onChange={(e) => setTurnOrder(e.target.value as 'left' | 'right')}
                className='border rounded px-3 py-2 bg-transparent w-full mt-1'>
                <option value='left'>Left bans first</option>
                <option value='right'>Right bans first</option>
              </select>
            </div>
            <div>
              <label className='text-sm'>Pool size</label>
              <input
                value={poolSize}
                onChange={(e) => setPoolSize(e.target.value)}
                className='border rounded px-3 py-2 bg-transparent w-full mt-1'
              />
            </div>
            <div>
              <label className='text-sm'># Bans</label>
              <input
                value={banCount}
                onChange={(e) => setBanCount(e.target.value)}
                className='border rounded px-3 py-2 bg-transparent w-full mt-1'
              />
            </div>
          </div>

          <div className='grid md:grid-cols-2 gap-3'>
            <div>
              <label className='text-sm'>Left axie IDs (space or comma separated)</label>
              <textarea
                value={leftAxieIds}
                onChange={(e) => setLeftAxieIds(e.target.value)}
                className='border rounded px-3 py-2 bg-transparent w-full mt-1 h-24 font-mono text-xs'
                placeholder='4069536, 7473805, 11346889 ...'
              />
            </div>
            <div>
              <label className='text-sm'>Right axie IDs</label>
              <textarea
                value={rightAxieIds}
                onChange={(e) => setRightAxieIds(e.target.value)}
                className='border rounded px-3 py-2 bg-transparent w-full mt-1 h-24 font-mono text-xs'
                placeholder='12099902, 12080847 ...'
              />
            </div>
          </div>

          <div className='flex flex-wrap gap-2'>
            <button onClick={updateConfig} disabled={busy} className='border rounded px-4 py-2 hover:bg-white/5 disabled:opacity-40'>
              {busy ? 'Updating…' : 'Update Room Config'}
            </button>
            <button onClick={updatePlayerInfoOnly} className='border rounded px-4 py-2 hover:bg-white/5'>
              Update Player Info Only
            </button>
          </div>
        </section>

        {/* Mid-draft actions */}
        <section className='border rounded-lg p-4 flex flex-col gap-3'>
          <h2 className='font-semibold'>Mid-Draft Actions</h2>
          <div className='flex flex-wrap gap-2'>
            <button
              onClick={forceSkip}
              disabled={status !== 'banning'}
              className='border rounded px-4 py-2 hover:bg-yellow-500/10 disabled:opacity-40'>
              Force-skip current turn
            </button>
            <button onClick={resetBanning} className='border rounded px-4 py-2 hover:bg-red-500/10'>
              Reset Draft
            </button>
          </div>
          <p className='text-xs opacity-60'>
            Force-skip immediately advances to the next phase/turn, forfeiting any remaining bans for
            this turn. Use this if a disconnected player isn&apos;t coming back and you don&apos;t want to
            wait for the timer to expire.
          </p>
        </section>

        <section className='border rounded-lg p-4 flex flex-col gap-2 text-sm'>
          <h2 className='font-semibold'>Share Links</h2>
          <div className='flex gap-2 flex-wrap'>
            <button
              onClick={() => copy(`${window.location.origin}/spectator/${id}`)}
              className='border rounded px-3 py-1.5 text-xs hover:bg-white/5'>
              Copy Spectator URL
            </button>
            <a
              href={`/spectator/${id}`}
              target='_blank'
              rel='noreferrer'
              className='border rounded px-3 py-1.5 text-xs hover:bg-white/5'>
              Open Spectator View
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}

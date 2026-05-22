import { BanAxieCommand } from '@/commands/axie-ban'
import { ForceSkipTurnCommand } from '@/commands/force-skip-turn'
import { UnbanAxieCommand } from '@/commands/axie-unban'
import { KickWarriorCommand } from '@/commands/kick-warrior'
import { OnCreateCommand } from '@/commands/on-create-room'
import { OnJoinCommand } from '@/commands/on-join-room'
import { PlayerReadyCommand } from '@/commands/player-ready'
import { ResetBanCommand } from '@/commands/reset-ban'
import { SelectAxieCommand } from '@/commands/axie-select'
import { UpdatePlayerInfoCommand } from '@/commands/update-player-info'
import { UpdateRoomConfigCommand } from '@/commands/update-room-config'
import { isAllPlayersReady } from '@/utils'
import { verifyPlayerToken } from '@/auth/jwt'
import { isAdminDiscordId } from '@/configs/env'
import { normalizeJoinCode } from '@/utils/codes'
import { Role } from '@repo/shared/constants'
import { Dispatcher } from '@colyseus/command'
import { Client, Delayed, Room } from '@colyseus/core'
import {
  BANNING_BUFFER_TIME,
  BANNING_COUNTDOWN_OFFSET,
  MESSAGES,
  RECONNECTION_WINDOW_SECONDS,
} from '@repo/shared/constants'
import { BanningState, Warrior } from '@repo/shared/states'
import {
  BanAxiePayload,
  CountdownUpdatePayload,
  CreateRoomOptions,
  ForceSkipTurnPayload,
  JoinRoomOptions,
  KickWarriorPayload,
  PlayerReadyPayload,
  ResetBanPayload,
  SelectAxiePayload,
  TurnConfig,
  TurnOrder,
  UpdatePlayerInfoPayload,
  UpdateRoomConfigPayload,
} from '@repo/shared/types'
import { getBanningConfig, toMs } from '@repo/shared/utils'

export class BanningRoom extends Room<BanningState> {
  state = new BanningState()
  dispatcher = new Dispatcher(this)
  maxClients = 20
  autoDispose = false
  private disposeTimeout: NodeJS.Timeout | null = null

  private tickInterval: Delayed | null = null
  private endTimeout: Delayed | null = null
  private reconnectAborts = new Set<() => void>()

  onCreate(options: CreateRoomOptions) {
    this.roomId = generateRoomId()
    this.setMetadata({ createdAt: Date.now() })

    this.dispatcher.dispatch(new OnCreateCommand(), {})

    if (options.joinCodes && options.joinCodes.length > 0) {
      options.joinCodes.forEach(({ side, code }) => {
        const slot = new Warrior()
        slot.side = side
        slot.joinCode = code
        slot.codeConsumed = false
        slot.connected = false
        slot.isReady = false
        this.state.warriors.push(slot)
      })
    }

    this.registerMessages()
    this.setSimulationInterval((_dt) => this.update())
  }

  async onAuth(_client: Client, options: any) {
    const role = options.__role
    if (role === 'spectator') {
      return { role: 'spectator' }
    }
    if (!options.playerToken) {
      throw new Error('Missing playerToken')
    }
    const player = await verifyPlayerToken(options.playerToken).catch(() => null)
    if (!player) {
      throw new Error('Invalid playerToken')
    }
    if (role === 'admin') {
      if (!isAdminDiscordId(player.discordId)) {
        throw new Error('Not an admin')
      }
      return {
        role: 'admin',
        discordId: player.discordId,
        discordUsername: player.discordUsername,
        discordAvatar: player.discordAvatar,
      }
    }
    if (role === 'warrior') {
      if (isAdminDiscordId(player.discordId) && process.env.ALLOW_ADMIN_AS_WARRIOR !== 'true') {
        throw new Error('Admins cannot join as warriors')
      }
      if (!options.joinCode) {
        throw new Error('Missing joinCode')
      }
      return {
        role: 'warrior',
        discordId: player.discordId,
        discordUsername: player.discordUsername,
        discordAvatar: player.discordAvatar,
        joinCode: normalizeJoinCode(options.joinCode),
      }
    }
    throw new Error('Unknown role')
  }

  onJoin(client: Client, _options: any, auth: any) {
    this.dispatcher.dispatch(new OnJoinCommand(), {
      sessionId: client.sessionId,
      role: auth?.role ?? 'spectator',
      discordId: auth?.discordId,
      discordUsername: auth?.discordUsername,
      discordAvatar: auth?.discordAvatar ?? null,
      joinCode: auth?.joinCode,
    })
  }

  async onLeave(client: Client, consented: boolean) {
    const warrior = this.state.findWarriorBySession(client.sessionId)
    const operator = this.state.operators.get(client.sessionId)

    if (warrior) {
      warrior.connected = false
      if (consented) return

      try {
        await this.allowReconnection(client, RECONNECTION_WINDOW_SECONDS)
      } catch {
        // Reconnection window expired.
      }
      return
    }

    if (operator) {
      this.state.operators.delete(client.sessionId)
    }
  }

  onDispose() {
    console.log('[BanningRoom] disposing', this.roomId)
    this.clearAllTimers()
    this.reconnectAborts.forEach((abort) => abort())
    this.reconnectAborts.clear()
    this.dispatcher.stop()
  }

  private registerMessages() {
    this.onMessage(MESSAGES.UPDATE_ROOM_CONFIG, (client, message: UpdateRoomConfigPayload) => {
      this.dispatcher.dispatch(new UpdateRoomConfigCommand(), {
        sessionId: client.sessionId,
        numberOfBans: message.numberOfBans,
        poolSize: message.poolSize,
        warriors: message.warriors,
      })
    })

    this.onMessage(MESSAGES.UPDATE_PLAYER_INFO, (client, message: UpdatePlayerInfoPayload) => {
      this.dispatcher.dispatch(new UpdatePlayerInfoCommand(), {
        sessionId: client.sessionId,
        warriors: message.warriors,
      })
    })

    this.onMessage(MESSAGES.SELECT_AXIE, (client, message: SelectAxiePayload) => {
      this.dispatcher.dispatch(new SelectAxieCommand(), {
        sessionId: client.sessionId,
        axie: message.axie,
      })
    })

    this.onMessage(MESSAGES.BAN_AXIE, (client, message: BanAxiePayload) => {
      this.dispatcher.dispatch(new BanAxieCommand(), {
        sessionId: client.sessionId,
        axie: message.axie,
      })
    })

    this.onMessage(MESSAGES.PLAYER_READY, (client, message: PlayerReadyPayload) => {
      this.dispatcher.dispatch(new PlayerReadyCommand(), {
        sessionId: client.sessionId,
        isReady: message.isReady,
      })
    })

    this.onMessage(MESSAGES.RESET_BANNING, (client, _message: ResetBanPayload) => {
      this.dispatcher.dispatch(new ResetBanCommand(), {
        sessionId: client.sessionId,
      })
    })

    this.onMessage(MESSAGES.FORCE_SKIP_TURN, (client, _message: ForceSkipTurnPayload) => {
      this.dispatcher.dispatch(new ForceSkipTurnCommand(), {
        sessionId: client.sessionId,
      })
    })

    this.onMessage(MESSAGES.KICK_WARRIOR, (client, message: KickWarriorPayload) => {
      this.dispatcher.dispatch(new KickWarriorCommand(), {
        sessionId: client.sessionId,
        side: message.side,
      })
    })

    this.onMessage(MESSAGES.INSPECT_AXIE, (client, message: any) => {
      const w = this.state.findWarriorBySession(client.sessionId)
      if (w) w.inspectedAxieId = message?.axieId ?? ''
    })

    this.onMessage(MESSAGES.UNBAN_AXIE, (client, message: any) => {
      this.dispatcher.dispatch(new UnbanAxieCommand(), {
        sessionId: client.sessionId,
        axieId: message?.axieId ?? '',
      })
    })
  }

  private update() {
    if (this.state.status === 'ready' && isAllPlayersReady(this.state.warriors)) {
      this.startBanning()
    }
  }

  startBanning() {
    this.state.status = 'banning'
    this.state.phase = 1
    this.state.turn = 1
    this.state.warriors.forEach((w) => {
      w.isBanning = true
      w.bufferTime = 0
    })
    this.clock.start()
    this.startPhaseOne()
  }

  private startPhaseOne() {
    const config = getBanningConfig('phase_1', 'turn_1') as TurnConfig
    this.runTurn(1, 1, config, ['first', 'second'], () => this.startPhaseTwo(), {
      useBufferOnExpiry: false,
    })
  }

  private startPhaseTwo() {
    this.state.phase = 2
    this.state.turn = 1
    this.state.warriors.forEach((w) => {
      w.bufferTime = toMs(BANNING_BUFFER_TIME)
    })
    this.startPhaseTwoTurnOne()
  }

  private startPhaseTwoTurnOne() {
    const config = getBanningConfig('phase_2', 'turn_1') as TurnConfig
    this.runTurn(2, 1, config, ['first'], () => this.startPhaseTwoTurnTwo(), {
      useBufferOnExpiry: true,
    })
  }

  private startPhaseTwoTurnTwo() {
    const config = getBanningConfig('phase_2', 'turn_2') as TurnConfig
    this.runTurn(2, 2, config, ['second'], () => this.startPhaseTwoTurnThree(), {
      useBufferOnExpiry: true,
    })
  }

  private startPhaseTwoTurnThree() {
    const config = getBanningConfig('phase_2', 'turn_3') as TurnConfig
    this.runTurn(2, 3, config, ['first'], () => this.finishBanning(), {
      useBufferOnExpiry: true,
    })
  }

  private finishBanning() {
    this.clearAllTimers()
    this.state.status = 'done'
    // Keep room alive 4 hours so spectators can rewatch the draft
    if (this.disposeTimeout) clearTimeout(this.disposeTimeout)
    this.disposeTimeout = setTimeout(() => this.disconnect(), 4 * 60 * 60 * 1000)
    this.state.endsAt = 0
    this.state.startedAt = 0
    this.state.isBufferTime = false
    this.state.setPlayersNotBanning()
    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())
  }

  private runTurn(
    phase: number,
    turn: number,
    config: TurnConfig,
    playersBanning: TurnOrder[],
    nextStep: () => void,
    opts: { useBufferOnExpiry: boolean }
  ) {
    this.clearAllTimers()

    this.state.phase = phase
    this.state.turn = turn
    this.state.isBufferTime = false
    this.state.setBannedCount(config.warriors, config.amount)
    this.state.setPlayersBanning(playersBanning)

    const durationMs = toMs(config.countdown) + toMs(BANNING_COUNTDOWN_OFFSET)
    const now = this.clock.currentTime
    this.state.startedAt = now
    this.state.endsAt = now + durationMs

    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())

    this.tickInterval = this.clock.setInterval(() => {
      this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())
    }, 1000)

    this.endTimeout = this.clock.setTimeout(() => {
      this.tickInterval?.clear()
      this.tickInterval = null
      this.state.endsAt = this.clock.currentTime

      if (opts.useBufferOnExpiry) {
        this.handleTurnCompletionWithBuffer(nextStep)
      } else {
        nextStep()
      }
    }, durationMs)
  }

  private handleTurnCompletionWithBuffer(nextStep: () => void) {
    const active = this.getActiveWarrior()

    if (!active || active.bannedCount === 0) {
      nextStep()
      return
    }

    if (active.bufferTime <= 0) {
      nextStep()
      return
    }

    this.state.isBufferTime = true
    const bufferDurationMs = active.bufferTime
    const now = this.clock.currentTime
    this.state.startedAt = now
    this.state.endsAt = now + bufferDurationMs

    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())

    const startedAt = now

    this.tickInterval = this.clock.setInterval(() => {
      const elapsed = this.clock.currentTime - startedAt
      active.bufferTime = Math.max(0, bufferDurationMs - elapsed)
      this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())

      if (active.bannedCount === 0) {
        this.clearAllTimers()
        this.state.isBufferTime = false
        nextStep()
      }
    }, 1000)

    this.endTimeout = this.clock.setTimeout(() => {
      this.clearAllTimers()
      active.bufferTime = 0
      this.state.isBufferTime = false
      nextStep()
    }, bufferDurationMs)
  }

  checkAndAdvanceBanning() {
    const hasPending = this.state.warriors.some((w) => w.isBanning && w.bannedCount > 0)
    if (hasPending) return

    this.clearAllTimers()
    this.state.endsAt = this.clock.currentTime
    this.state.isBufferTime = false
    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())

    this.advanceFromCurrentTurn()
  }

  forceSkipCurrentTurn() {
    this.clearAllTimers()
    this.state.endsAt = this.clock.currentTime
    this.state.isBufferTime = false
    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())

    this.advanceFromCurrentTurn()
  }

  private advanceFromCurrentTurn() {
    if (this.state.status !== 'banning') return

    if (this.state.phase === 1) {
      this.startPhaseTwo()
      return
    }

    if (this.state.phase === 2) {
      switch (this.state.turn) {
        case 1:
          this.startPhaseTwoTurnTwo()
          return
        case 2:
          this.startPhaseTwoTurnThree()
          return
        default:
          this.finishBanning()
          return
      }
    }
  }

  resetGame() {
    this.clearAllTimers()
    this.state.status = 'initial'
    this.state.phase = 0
    this.state.turn = 0
    this.state.endsAt = 0
    this.state.startedAt = 0
    this.state.isBufferTime = false
    this.state.warriors.forEach((w) => {
      w.isBanning = false
      w.isReady = false
      w.bannedCount = 0
      w.bufferTime = 0
      w.pool.forEach((axie) => {
        axie.isBanned = false
        axie.isSelected = false
      })
    })
    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())
  }

  private getActiveWarrior() {
    return this.state.warriors.find((w) => w.isBanning && w.bannedCount > 0)
  }

  private clearAllTimers() {
    if (this.tickInterval) {
      this.tickInterval.clear()
      this.tickInterval = null
    }
    if (this.endTimeout) {
      this.endTimeout.clear()
      this.endTimeout = null
    }
  }

  private makeCountdownPayload(): CountdownUpdatePayload {
    const now = this.clock.currentTime
    const remaining = Math.max(0, this.state.endsAt - now)
    return {
      countdown: remaining,
      phase: this.state.phase,
      turn: this.state.turn,
      isBufferTime: this.state.isBufferTime,
      endsAt: this.state.endsAt,
    }
  }
}

function generateRoomId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}

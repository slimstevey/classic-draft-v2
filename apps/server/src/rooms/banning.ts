import { BanAxieCommand } from '@/commands/axie-ban'
import { ForceSkipTurnCommand } from '@/commands/force-skip-turn'
import { KickWarriorCommand } from '@/commands/kick-warrior'
import { OnCreateCommand } from '@/commands/on-create-room'
import { OnJoinCommand } from '@/commands/on-join-room'
import { PlayerReadyCommand } from '@/commands/player-ready'
import { ResetBanCommand } from '@/commands/reset-ban'
import { SelectAxieCommand } from '@/commands/axie-select'
import { UpdatePlayerInfoCommand } from '@/commands/update-player-info'
import { UpdateRoomConfigCommand } from '@/commands/update-room-config'
import { isAllPlayersReady } from '@/utils'
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

/**
 * BanningRoom — the core room implementing the Axie Classic draft state machine.
 *
 * Timer model (the key bug fix from v1):
 *   - We store `endsAt` (absolute server clock time when the current turn ends).
 *   - We tick a 1s interval that BROADCASTS the remaining time computed from `endsAt - now`.
 *     Drift is impossible because `endsAt` never moves.
 *   - We schedule a single `setTimeout` to fire at `endsAt` that hands off to `handleTurnCompletion`.
 *
 * Disconnect handling:
 *   - The timer NEVER pauses for a disconnected warrior. It keeps running.
 *   - `connected` flag on warrior is updated via onLeave/onJoin and synced to clients.
 *   - Admin can call FORCE_SKIP_TURN at any time to immediately advance.
 *   - If the active warrior is disconnected when the timer expires, their pending bans are
 *     forfeited and the draft advances normally.
 *   - Reconnection is allowed for RECONNECTION_WINDOW_SECONDS; on reconnect the warrior keeps
 *     all their state because it's keyed by discordId, not sessionId.
 */
export class BanningRoom extends Room<BanningState> {
  state = new BanningState()
  dispatcher = new Dispatcher(this)
  maxClients = 20 // 2 warriors + admins/spectators

  private tickInterval: Delayed | null = null
  private endTimeout: Delayed | null = null

  // Map of pending reconnection promise cleanups so we can cancel on dispose.
  private reconnectAborts = new Set<() => void>()

  onCreate(options: CreateRoomOptions) {
    // Custom room ID — short and shareable.
    this.roomId = generateRoomId()
    this.setMetadata({ createdAt: Date.now() })

    this.dispatcher.dispatch(new OnCreateCommand(), {})

    // Pre-seed empty warrior slots with their join codes. The admin's first
    // UPDATE_ROOM_CONFIG call will fill in display names, pools, etc. The slots
    // are addressable by side and join code starting from this point.
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

  onJoin(client: Client, options: JoinRoomOptions & { __role?: string; __discordId?: string; __discordUsername?: string; __discordAvatar?: string | null; }) {
    // The HTTP layer (app.ts) has already verified the caller's auth and attached resolved
    // identity fields onto the join options. We trust those here.
    this.dispatcher.dispatch(new OnJoinCommand(), {
      sessionId: client.sessionId,
      role: options.__role ?? 'spectator',
      discordId: options.__discordId,
      discordUsername: options.__discordUsername,
      discordAvatar: options.__discordAvatar ?? null,
      joinCode: options.joinCode,
          })
  }

  async onLeave(client: Client, consented: boolean) {
    const warrior = this.state.findWarriorBySession(client.sessionId)
    const operator = this.state.operators.get(client.sessionId)

    // Warrior path
    if (warrior) {
      warrior.connected = false

      if (consented) {
        // Player left on purpose — don't hold their seat.
        return
      }

      // Allow reconnection within RECONNECTION_WINDOW_SECONDS. Timer keeps running during this
      // window — see class header for rationale.
      try {
        await this.allowReconnection(client, RECONNECTION_WINDOW_SECONDS)
        // On reconnect, the new client will have a fresh sessionId. onJoin re-binds by discordId.
        // The `warrior.connected = true` flip happens in OnJoinCommand.
      } catch {
        // Reconnection window expired. Warrior remains in state but `connected = false`.
        // Admin can choose to leave the slot, or kick & reuse the join code.
      }
      return
    }

    // Operator path
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

  // ====================================================================
  // Messaging
  // ====================================================================

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
  }

  // ====================================================================
  // Simulation loop — auto-start when both warriors are ready
  // ====================================================================

  private update() {
    if (this.state.status === 'ready' && isAllPlayersReady(this.state.warriors)) {
      this.startBanning()
    }
  }

  // ====================================================================
  // Phase / turn orchestration
  // ====================================================================

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

    // Initialise per-warrior buffer time once at the start of phase 2.
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
    this.state.endsAt = 0
    this.state.startedAt = 0
    this.state.isBufferTime = false
    this.state.setPlayersNotBanning()
    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())
  }

  // ====================================================================
  // Generic turn runner — replaces the original two near-duplicate functions
  // ====================================================================

  /**
   * Run a single turn:
   *   - Set bannedCount on the indicated warriors.
   *   - Compute endsAt = now + duration (+ small display offset).
   *   - Start a 1s tick interval that BROADCASTS remaining time (no decrement-based state).
   *   - Schedule end timeout that calls handleTurnCompletion(nextStep).
   */
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

    // Tick every second, broadcasting the (derived) remaining time.
    this.tickInterval = this.clock.setInterval(() => {
      this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())
    }, 1000)

    // Single end-of-turn timeout. Always fires exactly once.
    this.endTimeout = this.clock.setTimeout(() => {
      this.tickInterval?.clear()
      this.tickInterval = null
      this.state.endsAt = this.clock.currentTime // freeze at 0 remaining

      if (opts.useBufferOnExpiry) {
        this.handleTurnCompletionWithBuffer(nextStep)
      } else {
        nextStep()
      }
    }, durationMs)
  }

  /**
   * Phase 2 only: when a turn's main countdown expires and the active warrior still has
   * pending bans AND has buffer time remaining, switch into buffer-time mode.
   *
   * Buffer time is per-warrior, accumulated across turns. We tick it down and check each
   * tick whether the warrior has finished banning (in which case we advance early) or
   * exhausted their buffer (in which case we advance and forfeit remaining bans).
   */
  private handleTurnCompletionWithBuffer(nextStep: () => void) {
    const active = this.getActiveWarrior()

    // No active warrior or no pending bans → advance immediately.
    if (!active || active.bannedCount === 0) {
      nextStep()
      return
    }

    // No buffer time available → advance, forfeiting the bans.
    if (active.bufferTime <= 0) {
      nextStep()
      return
    }

    // Enter buffer time. We schedule a single tick interval and a final timeout.
    this.state.isBufferTime = true
    const bufferDurationMs = active.bufferTime
    const now = this.clock.currentTime
    this.state.startedAt = now
    this.state.endsAt = now + bufferDurationMs

    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())

    const startedAt = now

    this.tickInterval = this.clock.setInterval(() => {
      // Decrement the warrior's accumulated buffer based on real elapsed time.
      const elapsed = this.clock.currentTime - startedAt
      active.bufferTime = Math.max(0, bufferDurationMs - elapsed)
      this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())

      // Early exit: warrior finished their bans.
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

  // ====================================================================
  // Public API exposed to commands
  // ====================================================================

  /**
   * Called by BanAxieCommand after a successful ban. If all required bans this turn are
   * done, we advance early (cancelling timers).
   */
  checkAndAdvanceBanning() {
    const hasPending = this.state.warriors.some((w) => w.isBanning && w.bannedCount > 0)
    if (hasPending) return

    this.clearAllTimers()
    this.state.endsAt = this.clock.currentTime
    this.state.isBufferTime = false
    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())

    this.advanceFromCurrentTurn()
  }

  /**
   * Called by ForceSkipTurnCommand. Admin manually advances regardless of pending bans.
   * Pending bans are forfeited.
   */
  forceSkipCurrentTurn() {
    this.clearAllTimers()
    this.state.endsAt = this.clock.currentTime
    this.state.isBufferTime = false
    this.broadcast(MESSAGES.COUNTDOWN_UPDATE, this.makeCountdownPayload())

    this.advanceFromCurrentTurn()
  }

  /**
   * Determine which step comes next based on the current phase/turn and call into it.
   */
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

  /**
   * Called by ResetBanCommand. Clears all timers and resets game state to 'initial'.
   */
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

  // ====================================================================
  // Helpers
  // ====================================================================

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

/**
 * Generate a short, human-friendly room ID (lowercase alphanumeric, 6 chars).
 * Random enough to avoid collisions in practice; matchMaker handles dup retries.
 */
function generateRoomId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}

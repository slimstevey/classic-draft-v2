import { BanningRoom } from '@/rooms/banning'
import { normalizeJoinCode } from '@/utils/codes'
import { Command } from '@colyseus/command'
import { Role } from '@repo/shared/constants'
import { Operator } from '@repo/shared/states'

interface OnJoinCommandPayload {
  sessionId: string
  role: string
  discordId?: string
  discordUsername?: string
  discordAvatar?: string | null
  joinCode?: string
  adminAddress?: string
}

/**
 * Called from BanningRoom.onJoin. The HTTP layer has already authenticated the caller and
 * passed validated identity fields here. We only need to bind state.
 */
export class OnJoinCommand extends Command<BanningRoom, OnJoinCommandPayload> {
  execute(payload: OnJoinCommandPayload) {
    const { sessionId, role } = payload

    switch (role) {
      case Role.ADMIN:
      case Role.OPERATOR: {
        const op = new Operator()
        op.id = sessionId
        op.role = role
        op.address = (payload.adminAddress ?? '').toLowerCase()
        this.state.operators.set(sessionId, op)
        console.log('[✅][OnJoin/operator]', sessionId, op.address)
        return
      }
      case Role.WARRIOR: {
        const { discordId, joinCode, discordUsername } = payload
        if (!discordId || !joinCode) {
          console.error('[OnJoin/warrior] missing discordId or joinCode')
          return
        }
        const normalizedCode = normalizeJoinCode(joinCode)

        // Find the warrior slot matching this join code.
        const slot = this.state.findWarriorByJoinCode(normalizedCode)
        if (!slot) {
          console.error('[OnJoin/warrior] no slot matches join code', normalizedCode)
          return
        }

        // If the code has been consumed by a DIFFERENT discordId, reject.
        if (slot.codeConsumed && slot.discordId && slot.discordId !== discordId) {
          console.error('[OnJoin/warrior] join code already consumed by another Discord user')
          return
        }

        // Bind / re-bind. Same Discord user can reconnect freely.
        slot.id = sessionId
        slot.discordId = discordId
        slot.discordUsername = discordUsername ?? slot.discordUsername
        slot.connected = true
        slot.codeConsumed = true

        console.log('[✅][OnJoin/warrior]', sessionId, 'side=', slot.side, 'discord=', slot.discordUsername)
        return
      }
      case Role.SPECTATOR: {
        // Spectators don't need any room state binding — they just receive broadcasts.
        console.log('[✅][OnJoin/spectator]', sessionId)
        return
      }
      default: {
        console.error('[OnJoin] unknown role', role)
      }
    }
  }
}

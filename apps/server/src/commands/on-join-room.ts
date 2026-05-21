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
}

export class OnJoinCommand extends Command<BanningRoom, OnJoinCommandPayload> {
  execute(payload: OnJoinCommandPayload) {
    const { sessionId, role } = payload

    switch (role) {
      case Role.ADMIN:
      case Role.OPERATOR: {
        const op = new Operator()
        op.id = sessionId
        op.role = role
        op.address = '' // legacy field, no longer used
        op.name = payload.discordUsername ?? ''
        this.state.operators.set(sessionId, op)
        console.log('[✅][OnJoin/admin]', sessionId, payload.discordUsername)
        return
      }
      case Role.WARRIOR: {
        const { discordId, joinCode, discordUsername } = payload
        if (!discordId || !joinCode) {
          console.error('[OnJoin/warrior] missing discordId or joinCode')
          return
        }
        const normalizedCode = normalizeJoinCode(joinCode)
        const slot = this.state.findWarriorByJoinCode(normalizedCode)
        if (!slot) {
          console.error('[OnJoin/warrior] no slot matches join code', normalizedCode)
          return
        }
        if (slot.codeConsumed && slot.discordId && slot.discordId !== discordId) {
          console.error('[OnJoin/warrior] join code already consumed by another Discord user')
          return
        }
        slot.id = sessionId
        slot.discordId = discordId
        slot.discordUsername = discordUsername ?? slot.discordUsername
        slot.connected = true
        slot.codeConsumed = true
        console.log('[✅][OnJoin/warrior]', sessionId, 'side=', slot.side, 'discord=', slot.discordUsername)
        return
      }
      case Role.SPECTATOR: {
        console.log('[✅][OnJoin/spectator]', sessionId)
        return
      }
      default: {
        console.error('[OnJoin] unknown role', role)
      }
    }
  }
}

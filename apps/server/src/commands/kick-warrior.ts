import { BanningRoom } from '@/rooms/banning'
import { require } from '@/utils'
import { Command } from '@colyseus/command'
import { Role } from '@repo/shared/constants'
import { ColyseusClientBasePayload, KickWarriorPayload } from '@repo/shared/types'

const ALLOWED_ROLES = [Role.ADMIN, Role.OPERATOR]

export class KickWarriorCommand extends Command<BanningRoom, KickWarriorPayload & ColyseusClientBasePayload> {
  execute({ sessionId, side }: KickWarriorPayload & ColyseusClientBasePayload) {
    const admin = this.state.operators.get(sessionId)
    require(!!admin, 'Not an operator')
    require(ALLOWED_ROLES.includes(admin.role), 'Not allowed')

    const slot = this.state.findWarriorBySide(side)
    if (!slot) return

    // Clear identity but keep the slot structure so admin can simply reuse the same code
    // for a different player. Pool/scoreboard are preserved.
    slot.discordId = ''
    slot.discordUsername = ''
    slot.codeConsumed = false
    slot.connected = false
    slot.isReady = false
    slot.id = ''
    console.log('[✅][KickWarrior]', sessionId, side)
  }
}

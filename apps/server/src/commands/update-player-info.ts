import { BanningRoom } from '@/rooms/banning'
import { require } from '@/utils'
import { Command } from '@colyseus/command'
import { Role } from '@repo/shared/constants'
import { ColyseusClientBasePayload, UpdatePlayerInfoPayload } from '@repo/shared/types'

const ALLOWED_ROLES = [Role.ADMIN, Role.OPERATOR]

export class UpdatePlayerInfoCommand extends Command<BanningRoom, UpdatePlayerInfoPayload & ColyseusClientBasePayload> {
  execute({ sessionId, warriors }: UpdatePlayerInfoPayload & ColyseusClientBasePayload) {
    const admin = this.state.operators.get(sessionId)
    require(!!admin, 'Not an operator')
    require(ALLOWED_ROLES.includes(admin.role), 'Not allowed')

    warriors.forEach((data) => {
      const slot = this.state.findWarriorBySide(data.side)
      if (!slot) return
      slot.displayName = data.displayName
      slot.score = data.score
    })

    console.log('[✅][UpdatePlayerInfo]', sessionId)
  }
}

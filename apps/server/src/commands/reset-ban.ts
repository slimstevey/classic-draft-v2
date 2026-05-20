import { BanningRoom } from '@/rooms/banning'
import { require } from '@/utils'
import { Command } from '@colyseus/command'
import { Role } from '@repo/shared/constants'
import { ColyseusClientBasePayload, ResetBanPayload } from '@repo/shared/types'

const ALLOWED_ROLES = [Role.ADMIN, Role.OPERATOR]

export class ResetBanCommand extends Command<BanningRoom, ResetBanPayload & ColyseusClientBasePayload> {
  execute({ sessionId }: ResetBanPayload & ColyseusClientBasePayload) {
    const admin = this.state.operators.get(sessionId)
    require(!!admin, 'Not an operator')
    require(ALLOWED_ROLES.includes(admin.role), 'Not allowed')

    this.room.resetGame()
    console.log('[✅][ResetBan]', sessionId)
  }
}

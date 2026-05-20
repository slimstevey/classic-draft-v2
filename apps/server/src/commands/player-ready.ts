import { BanningRoom } from '@/rooms/banning'
import { isAllPlayersReady } from '@/utils'
import { Command } from '@colyseus/command'
import { ColyseusClientBasePayload, PlayerReadyPayload } from '@repo/shared/types'

export class PlayerReadyCommand extends Command<BanningRoom, PlayerReadyPayload & ColyseusClientBasePayload> {
  execute({ sessionId, isReady }: PlayerReadyPayload & ColyseusClientBasePayload) {
    const warrior = this.state.findWarriorBySession(sessionId)
    if (!warrior) {
      console.error('[PlayerReady] warrior not found')
      return
    }
    warrior.isReady = isReady

    if (isAllPlayersReady(this.state.warriors) && this.state.warriors.length === 2) {
      this.state.status = 'ready'
    }
    console.log('[✅][PlayerReady]', sessionId, isReady)
  }
}

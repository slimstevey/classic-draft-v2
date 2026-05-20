import { BanningRoom } from '@/rooms/banning'
import { Command } from '@colyseus/command'
import { BanAxiePayload, ColyseusClientBasePayload } from '@repo/shared/types'

export class BanAxieCommand extends Command<BanningRoom, BanAxiePayload & ColyseusClientBasePayload> {
  execute({ sessionId, axie }: BanAxiePayload & ColyseusClientBasePayload) {
    const warrior = this.state.findWarriorBySession(sessionId)
    const foundAxie = this.state.findAxieById(axie.id)
    const owner = this.state.findOwnerOfAxie(axie.id)

    if (!warrior) {
      console.error('[BanAxie] warrior not in room')
      return
    }
    if (!foundAxie || !owner) {
      console.error('[BanAxie] axie not found in pool')
      return
    }
    if (warrior.discordId === owner.discordId) {
      console.error('[BanAxie] cannot ban your own axie')
      return
    }
    if (foundAxie.isBanned) {
      console.error('[BanAxie] axie already banned')
      return
    }
    if (!warrior.isBanning || warrior.bannedCount <= 0) {
      console.error('[BanAxie] not allowed to ban right now', warrior.bannedCount)
      return
    }

    foundAxie.isBanned = true
    warrior.bannedCount--
    console.log('[✅][BanAxie]', sessionId, axie.id, 'remaining=', warrior.bannedCount)

    this.room.checkAndAdvanceBanning()
  }
}

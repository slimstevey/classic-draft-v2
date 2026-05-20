import { BanningRoom } from '@/rooms/banning'
import { Command } from '@colyseus/command'
import { ColyseusClientBasePayload, SelectAxiePayload } from '@repo/shared/types'

export class SelectAxieCommand extends Command<BanningRoom, SelectAxiePayload & ColyseusClientBasePayload> {
  execute({ sessionId, axie }: SelectAxiePayload & ColyseusClientBasePayload) {
    const warrior = this.state.findWarriorBySession(sessionId)
    const foundAxie = this.state.findAxieById(axie.id)
    const owner = this.state.findOwnerOfAxie(axie.id)

    if (!warrior) {
      console.error('[SelectAxie] warrior not in room')
      return
    }
    if (!warrior.isBanning) {
      console.error('[SelectAxie] not your turn')
      return
    }
    if (!foundAxie || !owner) {
      console.error('[SelectAxie] axie not found in pool')
      return
    }
    if (warrior.discordId === owner.discordId) {
      console.error('[SelectAxie] cannot select your own axie')
      return
    }

    owner.pool.forEach((a) => {
      a.isSelected = false
    })
    foundAxie.isSelected = true
    console.log('[✅][SelectAxie]', sessionId, axie.id)
  }
}

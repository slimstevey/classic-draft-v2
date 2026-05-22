import { BanningRoom } from '@/rooms/banning'
import { Command } from '@colyseus/command'
import { ColyseusClientBasePayload } from '@repo/shared/types'

interface UnbanAxiePayload {
  axieId: string
}

export class UnbanAxieCommand extends Command<BanningRoom, UnbanAxiePayload & ColyseusClientBasePayload> {
  execute({ sessionId, axieId }: UnbanAxiePayload & ColyseusClientBasePayload) {
    const warrior = this.state.findWarriorBySession(sessionId)
    const foundAxie = this.state.findAxieById(axieId)
    const owner = this.state.findOwnerOfAxie(axieId)

    if (!warrior) {
      console.error('[UnbanAxie] warrior not in room')
      return
    }
    if (!foundAxie || !owner) {
      console.error('[UnbanAxie] axie not found')
      return
    }
    if (warrior.discordId === owner.discordId) {
      console.error('[UnbanAxie] cannot unban your own axie')
      return
    }
    if (!foundAxie.isBanned) {
      console.error('[UnbanAxie] axie was not banned')
      return
    }
    // Only allowed during phase 1 (simultaneous), not phase 2 turn-based
    if (this.state.phase !== 1 || this.state.status !== 'banning') {
      console.error('[UnbanAxie] only allowed during phase 1 banning')
      return
    }

    foundAxie.isBanned = false
    warrior.bannedCount++
    warrior.isBanning = true
    console.log('[✅][UnbanAxie]', sessionId, axieId, 'restored=', warrior.bannedCount)
  }
}

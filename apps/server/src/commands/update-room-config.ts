import { BanningRoom } from '@/rooms/banning'
import { normalizeJoinCode } from '@/utils/codes'
import { require } from '@/utils'
import { Command } from '@colyseus/command'
import { ArraySchema } from '@colyseus/schema'
import { BANNING_BUFFER_TIME, Role } from '@repo/shared/constants'
import { Axie, Card, Warrior } from '@repo/shared/states'
import {
  Axie as AxieDTO,
  ColyseusClientBasePayload,
  Side,
  TurnOrder,
  UpdateRoomConfigPayload,
} from '@repo/shared/types'
import { toMs } from '@repo/shared/utils'

const ALLOWED_ROLES = [Role.ADMIN, Role.OPERATOR]

export class UpdateRoomConfigCommand extends Command<BanningRoom, UpdateRoomConfigPayload & ColyseusClientBasePayload> {
  execute({ sessionId, numberOfBans, poolSize, warriors }: UpdateRoomConfigPayload & ColyseusClientBasePayload) {
    const admin = this.state.operators.get(sessionId)
    require(!!admin, 'Not an operator')
    require(ALLOWED_ROLES.includes(admin.role), 'Not allowed')

    this.state.setting.numberOfBans = numberOfBans
    this.state.setting.poolSize = poolSize

    // Update or create warrior slots indexed by side. The join code is the *new* slot identity.
    warriors.forEach((data) => {
      const normalizedCode = normalizeJoinCode(data.joinCode)
      // Look up existing slot by side (we only ever have 1 per side).
      let slot = this.state.findWarriorBySide(data.side)

      if (!slot) {
        slot = new Warrior()
        slot.side = data.side
        this.state.warriors.push(slot)
      }

      // If the slot already has a different code consumed, preserve discord binding.
      // Otherwise overwrite cleanly.
      const isNewSlot = !slot.codeConsumed
      slot.joinCode = normalizedCode
      slot.displayName = data.displayName
      slot.turnOrder = data.turnOrder
      slot.isAllowToAddPool = data.isAllowToAddPool
      slot.role = Role.WARRIOR
      slot.bufferTime = toMs(BANNING_BUFFER_TIME)
      // Mutate existing ArraySchema instead of replacing so Colyseus syncs the change
      slot.pool.clear()
      buildPool(data.pool).forEach((axie: Axie) => slot.pool.push(axie))

      if (isNewSlot) {
        slot.codeConsumed = false
        slot.discordId = ''
        slot.discordUsername = ''
        slot.connected = false
      }
    })

    console.log('[✅][UpdateRoomConfig]', sessionId)
    this.state.warriors.forEach((w) => {
      console.log('[UpdateRoomConfig] warrior', w.side, 'pool size:', w.pool.length, 'displayName:', w.displayName)
    })
  }
}

function buildPool(poolData: AxieDTO[]): any {
  const pool = new ArraySchema<Axie>()
  poolData.forEach((axieData) => {
    const axie = new Axie(axieData.id, axieData.genes, [], axieData.side)
    axieData.cards.forEach((cardData) => {
      axie.cards.push(new Card(cardData.id, cardData.attack, cardData.defense))
    })
    pool.push(axie)
  })
  return pool
}

import { ArraySchema, MapSchema, Schema, type } from '@colyseus/schema'
import { Role } from '../constants'
import { Side, Status, TurnOrder } from '../types'

export class Card extends Schema {
  @type('string') id: string = ''
  @type('number') attack: number = 0
  @type('number') defense: number = 0

  constructor(id: string, attack: number, defense: number) {
    super()
    this.id = id
    this.attack = attack
    this.defense = defense
  }
}

export class Axie extends Schema {
  @type('string') id: string = ''
  @type('string') genes: string = ''
  @type([Card]) cards = new ArraySchema<Card>()
  @type('boolean') isSelected: boolean = false
  @type('boolean') isBanned: boolean = false
  @type('string') side: Side = 'left'

  constructor(id: string = '', genes: string = '', cards: Card[] = [], side: Side = 'left') {
    super()
    this.id = id
    this.genes = genes
    this.cards = new ArraySchema<Card>()
    cards.forEach((card) => this.cards.push(card))
    this.isSelected = false
    this.isBanned = false
    this.side = side
  }
}

export class Warrior extends Schema {
  // Colyseus session — rotates on reconnect.
  @type('string') id: string = ''
  // Stable identity, set when the player redeems their join code with a valid Discord JWT.
  @type('string') discordId: string = ''
  // Admin sees this for verification. NOT broadcast to spectator view (server strips it).
  @type('string') discordUsername: string = ''
  // The display name admin sets — this is what shows on the stream HUD.
  @type('string') displayName: string = ''
  // Per-side join code (admin shares with player).
  @type('string') joinCode: string = ''
  @type('boolean') codeConsumed: boolean = false
  @type([Axie]) pool = new ArraySchema<Axie>()
  @type('boolean') isAllowToAddPool: boolean = false
  @type('string') role: Role = Role.WARRIOR
  @type('boolean') connected: boolean = false
  @type('string') turnOrder: TurnOrder = 'first'
  @type('string') side: Side = 'left'
  @type('boolean') isBanning: boolean = false
  @type('number') score: number = 0
  @type('boolean') isReady: boolean = false
  @type('number') bannedCount: number = 0
  @type('number') bufferTime: number = 0
}

export class Operator extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('string') role: Role = Role.NONE
  @type('string') address: string = ''
}

export class Setting extends Schema {
  @type('number') numberOfBans: number = 0
  @type('number') poolSize: number = 0
}

export class BanningState extends Schema {
  @type([Warrior]) warriors = new ArraySchema<Warrior>()
  @type({ map: Operator }) operators = new MapSchema<Operator>()
  @type(Setting) setting = new Setting()
  @type('string') status: Status = 'initial'
  @type('number') phase: number = 0
  @type('number') turn: number = 0
  // Server clock time (ms) at which the current turn ends. Clients compute remaining = endsAt - now.
  // Note: clients should use room.state.endsAt with the server's clock estimate.
  @type('number') endsAt: number = 0
  // Server clock time at which the current turn started — used by clients to render progress.
  @type('number') startedAt: number = 0
  // Whether the current ticking time is the warrior's per-side buffer time.
  @type('boolean') isBufferTime: boolean = false

  findWarriorBySession(sessionId: string): Warrior | null {
    for (const w of this.warriors) {
      if (w.id === sessionId) return w
    }
    return null
  }

  findWarriorByDiscordId(discordId: string): Warrior | null {
    for (const w of this.warriors) {
      if (w.discordId === discordId) return w
    }
    return null
  }

  findWarriorByJoinCode(joinCode: string): Warrior | null {
    for (const w of this.warriors) {
      if (w.joinCode === joinCode) return w
    }
    return null
  }

  findWarriorBySide(side: Side): Warrior | null {
    for (const w of this.warriors) {
      if (w.side === side) return w
    }
    return null
  }

  findAxieById(id: string): Axie | null {
    for (const w of this.warriors) {
      for (const a of w.pool) {
        if (a.id === id) return a
      }
    }
    return null
  }

  findOwnerOfAxie(id: string): Warrior | null {
    for (const w of this.warriors) {
      if (w.pool.some((a) => a.id === id)) return w
    }
    return null
  }

  setPlayersBanning(turnOrder: TurnOrder[]) {
    this.warriors.forEach((w) => {
      w.isBanning = false
    })
    turnOrder.forEach((to) => {
      const warrior = this.warriors.find((w) => w.turnOrder === to)
      if (warrior) warrior.isBanning = true
    })
  }

  setPlayersNotBanning() {
    this.warriors.forEach((w) => {
      w.isBanning = false
    })
  }

  setBannedCount(turnOrder: TurnOrder[], amount: number[]) {
    this.warriors.forEach((w) => {
      const idx = turnOrder.indexOf(w.turnOrder)
      if (idx !== -1) w.bannedCount = amount[idx]
    })
  }
}

process.env.COLYSEUS_SEAT_RESERVATION_TIME = '60'

import { LocalDriver } from '@colyseus/core'
import { listen } from '@colyseus/tools'
import app from './app'

console.log('[boot] COLYSEUS_SEAT_RESERVATION_TIME =', process.env.COLYSEUS_SEAT_RESERVATION_TIME)

listen(app)

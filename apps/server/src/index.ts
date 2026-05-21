// MUST be set BEFORE any colyseus import
process.env.COLYSEUS_SEAT_RESERVATION_TIME = '300'

import { listen } from '@colyseus/tools'
import app from './app'

console.log('[boot] COLYSEUS_SEAT_RESERVATION_TIME =', process.env.COLYSEUS_SEAT_RESERVATION_TIME)

listen(app)

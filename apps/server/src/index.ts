process.env.COLYSEUS_SEAT_RESERVATION_TIME = '60'
// Force local driver (no Redis needed for single-instance deploys)
process.env.COLYSEUS_PRESENCE = 'local'

import { LocalDriver, LocalPresence, matchMaker } from '@colyseus/core'
import { listen } from '@colyseus/tools'
import app from './app'

// Force LocalDriver before anything else touches the matchmaker
;(matchMaker as any).driver = new LocalDriver()
;(matchMaker as any).presence = new LocalPresence()

console.log('[boot] COLYSEUS_SEAT_RESERVATION_TIME =', process.env.COLYSEUS_SEAT_RESERVATION_TIME)
console.log('[boot] forced LocalDriver + LocalPresence')

listen(app)

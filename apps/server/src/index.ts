process.env.COLYSEUS_SEAT_RESERVATION_TIME = '60'

import { Server, LocalDriver, LocalPresence } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { Encoder } from '@colyseus/schema'
import { env } from './configs/env'
import { BanningRoom } from './rooms/banning'
import { registerRoutes } from './app'

Encoder.BUFFER_SIZE = 32 * 1024

const expressApp = express()
expressApp.use(express.json())
expressApp.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  })
)

const httpServer = createServer(expressApp)
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
  driver: new LocalDriver(),
  presence: new LocalPresence(),
})

gameServer.define('banning', BanningRoom)

if (env.NODE_ENV !== 'production') {
  expressApp.use('/playground', playground())
  expressApp.use('/monitor', monitor())
}

registerRoutes(expressApp)

const port = Number(env.PORT) || 2567
httpServer.listen(port, () => {
  console.log(`[boot] server listening on port ${port}, env=${env.NODE_ENV}`)
  console.log(`[boot] admin discord IDs:`, env.ADMIN_DISCORD_IDS)
  console.log(`[boot] seat reservation time: ${process.env.COLYSEUS_SEAT_RESERVATION_TIME}s`)
})

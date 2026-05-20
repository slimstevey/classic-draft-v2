import { Client } from 'colyseus.js'
import { clientEnv } from '@/env'

const colyseus = new Client(clientEnv.NEXT_PUBLIC_COLYSEUS_WS_URL)

export default colyseus

// Plain HTTP base for endpoints that aren't seat-reservation flows.
export const COLYSEUS_HTTP = clientEnv.NEXT_PUBLIC_COLYSEUS_HTTP_URL

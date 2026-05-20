import { BANNING_CONFIG, Role } from './constants'

export type Side = 'left' | 'right'
export type TurnOrder = 'first' | 'second'
export type Status = 'initial' | 'ready' | 'banning' | 'done'

// ============================================================
// Auth types
// ============================================================

// Player JWT payload (signed by web server, verified by both web + game server).
export interface PlayerSession {
  discordId: string
  discordUsername: string // for admin verification ONLY, never shown on stream
  discordAvatar: string | null
  iat: number
  exp: number
}

// Admin SIWE auth used when calling protected HTTP routes from admin UI.
export interface SignedMessage {
  message: string
  signature: string
  address: string
}

// ============================================================
// Axie types
// ============================================================

export interface Card {
  id: string
  attack: number
  defense: number
}

export interface Axie {
  id: string
  genes: string
  cards: Card[]
  side: Side
  isSelected: boolean
  isBanned: boolean
}

// ============================================================
// Room / Warrior types
// ============================================================

// Warrior as seen by the client (plain JSON, distinct from Colyseus state class).
export interface Warrior {
  id: string // colyseus sessionId
  displayName: string // what shows on stream — admin sets this
  discordId: string // bound at join time, used by server to match identity
  discordUsername: string // admin-only, never broadcast to spectator
  pool: Axie[]
  side: Side
  turnOrder: TurnOrder
  isBanning: boolean
  connected: boolean
  isAllowToAddPool: boolean
  score: number
  bannedCount: number
  bufferTime: number // ms
}

// ============================================================
// Room creation / join
// ============================================================

export interface CreateRoomOptions {
  joinCodes?: { side: Side; code: string }[]
}

export interface CreateRoomResponse {
  roomId: string
  joinCodes: {
    side: Side
    code: string
  }[]
}

export interface JoinRoomOptions {
  roomId: string
  joinCode: string
  playerToken: string // JWT issued by web after Discord OAuth
}

export interface SpectateRoomOptions {
  roomId: string
}

// ============================================================
// Game messages (client -> server payloads)
// ============================================================

export interface SelectAxiePayload {
  axie: Axie
}

export interface BanAxiePayload {
  axie: Axie
}

export interface PlayerReadyPayload {
  isReady: boolean
}

export interface ResetBanPayload {
  // empty
}

export interface ForceSkipTurnPayload {
  // empty
}

export interface KickWarriorPayload {
  side: Side
}

export interface UpdatePlayerInfoPayload {
  warriors: Pick<Warrior, 'side' | 'displayName' | 'score'>[]
}

export interface UpdateRoomConfigPayload {
  numberOfBans: number
  poolSize: number
  warriors: {
    side: Side
    displayName: string
    turnOrder: TurnOrder
    joinCode: string // generated at room create; admin sends back so server pairs them
    pool: Axie[]
    isAllowToAddPool: boolean
  }[]
}

// Server -> all clients
export interface CountdownUpdatePayload {
  countdown: number // ms remaining, server-derived
  phase: number
  turn: number
  isBufferTime: boolean
  endsAt: number // absolute server clock time when this turn ends
}

// Server -> single client
export interface RoomErrorPayload {
  code: string
  message: string
}

export type ColyseusClientBasePayload = {
  sessionId: string
}

// ============================================================
// Banning config types
// ============================================================

export interface TurnConfig {
  id: string
  countdown: number
  warriors: TurnOrder[]
  amount: number[]
}

export interface PhaseConfig {
  id: string
  label: string
  [key: `turn_${number}`]: TurnConfig
}

export interface BanningConfig {
  [key: `phase_${number}`]: PhaseConfig
}

export type PhaseKeys = 'phase_1' | 'phase_2'
export type TurnKeys<T extends PhaseKeys> = T extends 'phase_1' ? 'turn_1' : 'turn_1' | 'turn_2' | 'turn_3'

export function getBanningConfig(): BanningConfig
export function getBanningConfig<P extends PhaseKeys>(phase: P): BanningConfig[P]
export function getBanningConfig<P extends PhaseKeys, T extends TurnKeys<P>>(phase: P, turn: T): TurnConfig
export function getBanningConfig<P extends PhaseKeys, T extends TurnKeys<P>>(phase?: P, turn?: T) {
  const config = BANNING_CONFIG
  if (!phase) return config
  if (!turn) return config[phase]
  return config[phase][turn]
}

// ============================================================
// Axie GraphQL helpers
// ============================================================

export interface AxiePartAbility {
  id: string
  attack: number
  defense: number
}

export interface AxiePart {
  abilities: AxiePartAbility[]
}

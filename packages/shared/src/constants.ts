import { BanningConfig } from './types'

export enum Role {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  WARRIOR = 'warrior',
  SPECTATOR = 'spectator',
  NONE = 'none',
}

// All message types exchanged between server <-> client.
export enum MESSAGES {
  INSPECT_AXIE = 'inspect-axie',
  UNBAN_AXIE = 'unban-axie',
  UPDATE_PLAYER_INFO = 'update-player-info',
  UPDATE_ROOM_CONFIG = 'update-room-config',
  SELECT_AXIE = 'select-axie',
  BAN_AXIE = 'ban-axie',
  PLAYER_READY = 'player-ready',
  COUNTDOWN_UPDATE = 'countdown-update',
  RESET_BANNING = 'reset-banning',
  FORCE_SKIP_TURN = 'force-skip-turn',
  KICK_WARRIOR = 'kick-warrior',
  ROOM_ERROR = 'room-error',
  // Client <-> server clock sync. Client sends { t0: Date.now() }, server replies
  // { t0, serverTime }. Client derives an RTT-corrected offset so countdowns are
  // computed against the SERVER clock, immune to local clock skew.
  TIME_SYNC = 'time-sync',
}

// Default countdown per turn (seconds).
export const DEFAULT_BANNING_COUNTDOWN = 60
// Extra display offset so the UI shows "60" for a full second before counting.
export const BANNING_COUNTDOWN_OFFSET = 0
// Total buffer time pool each warrior gets at the start of phase 2.
export const BANNING_BUFFER_TIME = DEFAULT_BANNING_COUNTDOWN * 2
// How long Colyseus allows a player to reconnect after a drop (seconds).
// Timer keeps running during this window — see room logic for details.
export const RECONNECTION_WINDOW_SECONDS = 180

// Join codes
export const JOIN_CODE_LENGTH = 8 // 8 chars, dash-separated as XXXX-XXXX in display
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/1/O/I

export const BANNING_CONFIG: BanningConfig = {
  phase_1: {
    id: 'p1',
    label: '1',
    turn_1: {
      id: 'p1_t1',
      countdown: DEFAULT_BANNING_COUNTDOWN,
      warriors: ['first', 'second'],
      amount: [1, 1],
    },
  },
  phase_2: {
    id: 'p2',
    label: '2',
    turn_1: {
      id: 'p2_t1',
      countdown: DEFAULT_BANNING_COUNTDOWN,
      warriors: ['first'],
      amount: [1],
    },
    turn_2: {
      id: 'p2_t2',
      countdown: DEFAULT_BANNING_COUNTDOWN * 2,
      warriors: ['second'],
      amount: [2],
    },
    turn_3: {
      id: 'p2_t3',
      countdown: DEFAULT_BANNING_COUNTDOWN,
      warriors: ['first'],
      amount: [1],
    },
  },
}

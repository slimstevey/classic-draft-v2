import { PhaseKeys, TurnKeys, BanningConfig, TurnConfig, PhaseConfig } from '../types'
import { BANNING_CONFIG } from '../constants'

export function toMs(seconds: number): number {
  return seconds * 1000
}

export function toSeconds(ms: number): number {
  return ms / 1000
}

export function getBanningConfig(): BanningConfig
export function getBanningConfig<P extends PhaseKeys>(phase: P): PhaseConfig
export function getBanningConfig<P extends PhaseKeys, T extends TurnKeys<P>>(phase: P, turn: T): TurnConfig
export function getBanningConfig<P extends PhaseKeys, T extends TurnKeys<P>>(phase?: P, turn?: T) {
  if (!phase) return BANNING_CONFIG
  if (!turn) return BANNING_CONFIG[phase]
  return BANNING_CONFIG[phase][turn] as TurnConfig
}

import { PhaseKeys, TurnKeys, BanningConfig, TurnConfig, PhaseConfig } from '../types'
import { BANNING_CONFIG, Role } from '../constants'

export function toMs(seconds: number): number {
  return seconds * 1000
}

export function toSeconds(ms: number): number {
  return ms / 1000
}

/**
 * Determine the role of a wallet address.
 * Admin/operator allowlists are passed in (server reads from env, client just uses for display).
 */
export function roleOfAddress(address: string, adminAddress: string, operatorAddresses: string[]): Role {
  const a = address.toLowerCase()
  if (a === adminAddress.toLowerCase()) return Role.ADMIN
  if (operatorAddresses.map((x) => x.toLowerCase()).includes(a)) return Role.OPERATOR
  return Role.NONE
}

export function getBanningConfig(): BanningConfig
export function getBanningConfig<P extends PhaseKeys>(phase: P): PhaseConfig
export function getBanningConfig<P extends PhaseKeys, T extends TurnKeys<P>>(phase: P, turn: T): TurnConfig
export function getBanningConfig<P extends PhaseKeys, T extends TurnKeys<P>>(phase?: P, turn?: T) {
  if (!phase) return BANNING_CONFIG
  if (!turn) return BANNING_CONFIG[phase]
  return BANNING_CONFIG[phase][turn] as TurnConfig
}

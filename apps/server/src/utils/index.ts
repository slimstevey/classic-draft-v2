import { Warrior } from '@repo/shared/states'

export function isAllPlayersReady(warriors: ArrayLike<Warrior>): boolean {
  const arr = Array.from(warriors as unknown as Iterable<Warrior>)
  if (arr.length === 0) return false
  return arr.every((w) => w.isReady)
}

export function require(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '@repo/shared/constants'

/**
 * Generate a random join code using an unambiguous alphabet (no 0/O/1/I).
 * Format: XXXX-XXXX (with dash inserted for readability when shown to humans).
 */
export function generateJoinCode(): string {
  let code = ''
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)]
  }
  return code
}

/**
 * Normalize a code that may include dashes/whitespace/case differences from user input.
 */
export function normalizeJoinCode(input: string): string {
  return input.replace(/[-\s]/g, '').toUpperCase()
}

/**
 * Format a code for human display: split into two halves with a dash.
 * Only meaningful when length is exactly JOIN_CODE_LENGTH.
 */
export function formatJoinCode(code: string): string {
  const c = normalizeJoinCode(code)
  if (c.length !== JOIN_CODE_LENGTH) return c
  const half = JOIN_CODE_LENGTH / 2
  return `${c.slice(0, half)}-${c.slice(half)}`
}

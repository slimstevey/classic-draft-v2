import { SiweMessage } from 'siwe'
import { env } from '@/configs/env'
import { Role } from '@repo/shared/constants'
import { roleOfAddress } from '@repo/shared/utils'

export interface SiweVerifyResult {
  ok: true
  address: string
  role: Role.ADMIN | Role.OPERATOR
}

export interface SiweVerifyFailure {
  ok: false
  error: string
}

/**
 * Verifies a SIWE signature and asserts the signing address has admin/operator role.
 * Returns a discriminated union so callers can branch safely.
 */
export async function verifyAdminSiwe(message: string, signature: string): Promise<SiweVerifyResult | SiweVerifyFailure> {
  try {
    const siwe = new SiweMessage(message)
    const verification = await siwe.verify({ signature })
    if (!verification.success) {
      return { ok: false, error: 'Signature verification failed' }
    }
    const address = siwe.address.toLowerCase()
    const role = roleOfAddress(address, env.ADMIN_WALLET_ADDRESS, env.OPERATOR_WALLET_ADDRESSES)
    if (role !== Role.ADMIN && role !== Role.OPERATOR) {
      return { ok: false, error: 'Address is not an admin or operator' }
    }
    return { ok: true, address, role }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown SIWE error' }
  }
}

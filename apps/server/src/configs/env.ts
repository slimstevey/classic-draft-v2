import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z
    .string()
    .default('2567')
    .transform((s) => parseInt(s, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ADMIN_WALLET_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'ADMIN_WALLET_ADDRESS must be a valid Ethereum address')
    .transform((s) => s.toLowerCase()),
  OPERATOR_WALLET_ADDRESSES: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
    ),
  SKY_MAVIS_API_KEY: z.string().min(1, 'SKY_MAVIS_API_KEY is required for fetching Axie data'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

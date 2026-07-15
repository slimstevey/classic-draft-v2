import { z } from 'zod'

function splitIds(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

const EnvSchema = z.object({
  PORT: z
    .string()
    .default('2567')
    .transform((s) => parseInt(s, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Comma-separated Discord User IDs with FULL admin privileges.
  ADMIN_DISCORD_IDS: z
    .string()
    .min(1, 'ADMIN_DISCORD_IDS is required (comma-separated Discord user IDs)')
    .transform(splitIds),

  // Comma-separated Discord User IDs with OPERATOR privileges: they can create rooms
  // and run drafts (skip turn, kick, reset, edit config) but are a distinct tier so
  // future admin-only actions don't need an env migration.
  OPERATOR_DISCORD_IDS: z.string().default('').transform(splitIds),

  SKY_MAVIS_API_KEY: z.string().default(''),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

export function isAdminDiscordId(discordId: string): boolean {
  return env.ADMIN_DISCORD_IDS.includes(discordId)
}

export function isOperatorDiscordId(discordId: string): boolean {
  return env.OPERATOR_DISCORD_IDS.includes(discordId)
}

/** Resolve the highest privilege tier for a Discord user. */
export function roleForDiscordId(discordId: string): 'admin' | 'operator' | null {
  if (isAdminDiscordId(discordId)) return 'admin'
  if (isOperatorDiscordId(discordId)) return 'operator'
  return null
}

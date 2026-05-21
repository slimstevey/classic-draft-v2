import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z
    .string()
    .default('2567')
    .transform((s) => parseInt(s, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Comma-separated list of Discord User IDs that are allowed to act as admins.
  // First one is the primary admin. Others are operators (same privileges in the room layer).
  ADMIN_DISCORD_IDS: z
    .string()
    .min(1, 'ADMIN_DISCORD_IDS is required (comma-separated Discord user IDs)')
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    ),

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

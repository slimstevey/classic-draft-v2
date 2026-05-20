import { z } from 'zod'

const ServerEnvSchema = z.object({
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  PUBLIC_WEB_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
})

const ClientEnvSchema = z.object({
  NEXT_PUBLIC_COLYSEUS_WS_URL: z.string().url(),
  NEXT_PUBLIC_COLYSEUS_HTTP_URL: z.string().url(),
})

export const clientEnv = ClientEnvSchema.parse({
  NEXT_PUBLIC_COLYSEUS_WS_URL: process.env.NEXT_PUBLIC_COLYSEUS_WS_URL,
  NEXT_PUBLIC_COLYSEUS_HTTP_URL: process.env.NEXT_PUBLIC_COLYSEUS_HTTP_URL,
})

// Server-only env. Reading this from a client component throws at build time.
export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() called from client code')
  }
  return ServerEnvSchema.parse({
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    PUBLIC_WEB_URL: process.env.PUBLIC_WEB_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  })
}

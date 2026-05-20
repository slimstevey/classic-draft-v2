FROM oven/bun:1.2 AS base

WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile || bun install

# ---- build ----
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/web
# Build-time env: only NEXT_PUBLIC_* are baked in. Everything else is read at runtime.
ARG NEXT_PUBLIC_COLYSEUS_WS_URL
ARG NEXT_PUBLIC_COLYSEUS_HTTP_URL
ENV NEXT_PUBLIC_COLYSEUS_WS_URL=$NEXT_PUBLIC_COLYSEUS_WS_URL
ENV NEXT_PUBLIC_COLYSEUS_HTTP_URL=$NEXT_PUBLIC_COLYSEUS_HTTP_URL
RUN bun run build

# ---- runtime ----
FROM oven/bun:1.2-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app /app
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["bun", "run", "start"]

FROM oven/bun:1.2 AS base

WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile || bun install

# ---- build ----
FROM deps AS build
COPY . .
WORKDIR /app/apps/server
RUN bun run build

# ---- runtime ----
FROM oven/bun:1.2-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/server
EXPOSE 2567
CMD ["bun", "src/index.ts"]

# syntax=docker/dockerfile:1.7

# ---- Builder ----
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
WORKDIR /app

# Manifests first (better layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @movie-talkin/web build
RUN pnpm --filter @movie-talkin/api build

# ---- Runtime ----
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
WORKDIR /app

# Production deps only for the API workspace (and its workspace deps via `...`).
# All workspace manifests must be present or pnpm errors out on the missing ones.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --prod --filter "@movie-talkin/api..."

# Built artifacts
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/src/db/migrations apps/api/dist/db/migrations
COPY --from=builder /app/apps/web/dist apps/web/dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]

# ---- Stage 1: Dependencies ----
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/shared/package.json packages/shared/

RUN npm ci

# ---- Stage 2: Build ----
FROM node:20-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package.json turbo.json tsconfig.base.json ./
COPY apps/dashboard/ apps/dashboard/
COPY packages/shared/ packages/shared/

# In production, nginx proxies /api/* to mkt-api, so the dashboard
# does not need API rewrites. Set a placeholder so the build succeeds.
ENV API_URL=http://mkt-api:4100

# Ensure public dir exists (may be empty)
RUN mkdir -p apps/dashboard/public

RUN npx turbo build --filter=@synap6ia/dashboard

# ---- Stage 3: Runtime ----
FROM node:20-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy standalone output (outputFileTracingRoot = monorepo root)
# Standalone includes: node_modules/, apps/dashboard/server.js, etc.
COPY --from=build /app/apps/dashboard/.next/standalone ./
# Copy static assets
COPY --from=build /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
# Copy public assets if they exist
COPY --from=build /app/apps/dashboard/public ./apps/dashboard/public

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=20s \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "apps/dashboard/server.js"]

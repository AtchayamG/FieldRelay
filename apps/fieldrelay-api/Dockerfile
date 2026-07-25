# FieldRelay API — multi-stage build.
#
# Stage 1 installs the whole workspace and compiles the API together with the
# packages it depends on. Stage 2 keeps only production dependencies and the
# compiled output, so the deployed image contains no source, no test files and
# no build toolchain.

# ---------- build ----------
FROM node:24-alpine AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /repo

# Manifests first so a dependency-only change is the only thing that busts the
# install layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/testing/package.json packages/testing/
COPY apps/fieldrelay-api/package.json apps/fieldrelay-api/
COPY apps/fieldrelay-app/package.json apps/fieldrelay-app/

RUN pnpm install --frozen-lockfile

COPY packages packages
COPY apps/fieldrelay-api apps/fieldrelay-api

# Copying the source directories replaces the per-package node_modules that the
# install above created, so the workspace links have to be restored. The store
# is already warm, so this resolves from cache rather than the network.
RUN pnpm install --frozen-lockfile --prefer-offline

RUN pnpm --filter @fieldrelay/contracts build \
 && pnpm --filter fieldrelay-api build \
 && pnpm --filter fieldrelay-api --prod --legacy deploy /app

# ---------- runtime ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Never run as root. The API writes nothing to disk, so the filesystem can also
# be mounted read-only by the orchestrator.
RUN addgroup -S fieldrelay && adduser -S fieldrelay -G fieldrelay

COPY --from=build --chown=fieldrelay:fieldrelay /app/node_modules ./node_modules
COPY --from=build --chown=fieldrelay:fieldrelay /repo/apps/fieldrelay-api/dist ./dist
COPY --from=build --chown=fieldrelay:fieldrelay /repo/apps/fieldrelay-api/package.json ./
# Straight from the build context: migrations are data, not build output, so
# there is nothing to compile them from.
COPY --chown=fieldrelay:fieldrelay infra/database/migrations ./infra/database/migrations

USER fieldrelay
EXPOSE 3000

# GET /health runs a real database query, so an unhealthy database fails the
# container rather than leaving it serving errors.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]

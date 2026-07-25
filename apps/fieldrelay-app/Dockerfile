# FieldRelay web app — build the SPA, then serve it from nginx.
#
# nginx also proxies /api to the API container, so the browser makes only
# same-origin requests. That keeps CORS out of the deployment entirely and means
# the session token is never sent cross-origin.

# ---------- build ----------
FROM node:24-alpine AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/testing/package.json packages/testing/
COPY apps/fieldrelay-api/package.json apps/fieldrelay-api/
COPY apps/fieldrelay-app/package.json apps/fieldrelay-app/

RUN pnpm install --frozen-lockfile

COPY packages packages
COPY apps/fieldrelay-app apps/fieldrelay-app

# Copying the source directories replaces the per-package node_modules that the
# install above created, so the workspace links have to be restored. The store
# is already warm, so this resolves from cache rather than the network.
RUN pnpm install --frozen-lockfile --prefer-offline

RUN pnpm --filter @fieldrelay/contracts build \
 && pnpm --filter @fieldrelay/design-tokens build \
 && pnpm --filter fieldrelay-app build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/fieldrelay-app/dist /usr/share/nginx/html
COPY apps/fieldrelay-app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

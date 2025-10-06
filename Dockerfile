# Dockerfile (multi-stage: deps / builder / dev / release)
# - dev target installs devDependencies and nodemon for live reload (used by docker-compose dev)
# - release stage contains built JS only

#####################################
# deps stage: install production deps
#####################################
FROM node:18 AS deps
WORKDIR /app
# copy package manifests first for better layer caching
COPY package.json package-lock.json* ./
# Copy prisma schema before npm install to prevent prepare script from failing
COPY prisma ./prisma
RUN npm install --prefer-offline --no-audit --progress=false

#####################################
# builder stage: install all deps & build
#####################################
FROM node:18-alpine AS builder
WORKDIR /app

# 1. Copy dependency manifests (lock file if present)
COPY package*.json ./

# 2. Install ALL dependencies deterministically
RUN npm ci --include=dev

# 3. Copy TypeScript config early (improves cache when only source changes)
COPY tsconfig.json ./

# 4. Copy Prisma schema
COPY prisma ./prisma

# 5. Provide build-time defaults so Prisma "get-config" doesn't fail during `prisma generate`
# These will be overridden by platform env vars at runtime
ARG PRISMA_DB_URL="postgresql://user:password@localhost:5432/mydatabase?schema=public"
ARG PRISMA_DB_DIRECT_URL="postgresql://user:password@localhost:5432/mydatabase?schema=public"
ENV DATABASE_URL=${PRISMA_DB_URL}
ENV DATABASE_DIRECT_URL=${PRISMA_DB_DIRECT_URL}

# 6. Generate Prisma client
RUN npx prisma generate

# 7. Copy source code (everything else)
COPY . .

# 8. Prevent stray local .env from overriding platform-provided environment variables
RUN rm -f .env || true

# 9. Build TypeScript
RUN npm run build

#####################################
# dev stage: for local development (nodemon + ts-node)
#####################################
FROM node:18 AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
# Copy prisma schema before npm install to prevent prepare script from failing
COPY prisma ./prisma
# install dev dependencies so ts-node/ts-node-dev etc are available
RUN npm install
# install nodemon globally so it's available in the container
RUN npm install -g nodemon
# copy remaining project files
COPY . .
# copy and set executable permission for entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENV NODE_ENV=development
EXPOSE 4000

# Use entrypoint script for proper initialization
CMD ["docker-entrypoint.sh"]

#####################################
# release stage: production image with built JS
#####################################
FROM node:18-alpine AS release
WORKDIR /app

## Install system deps required by Prisma (openssl)
RUN apk add --no-cache openssl

# 1. Copy dependency manifests
COPY package*.json ./

# 2. Copy prisma schema BEFORE install so prepare script (prisma generate) can find it
COPY prisma ./prisma

# 3. Install only production deps (using modern flag)
RUN npm ci --omit=dev

# 4. (Safety) Re-run prisma generate explicitly (harmless if already run during prepare)
RUN npx prisma generate --schema=prisma/schema.prisma

# 5. Copy build output from builder (already compiled TS)
COPY --from=builder /app/dist ./dist

# 6. Prevent stray local .env from overriding platform-provided environment variables
RUN rm -f .env || true

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "fetch('http://localhost:' + (process.env.PORT||4000) + '/me').catch(()=>process.exit(1))" || exit 1

# Ensure database schema is up-to-date before starting the server
# If DATABASE_DIRECT_URL is not provided by the platform, fall back to DATABASE_URL so Prisma config validation passes
CMD sh -c "export DATABASE_DIRECT_URL=\${DATABASE_DIRECT_URL:-\$DATABASE_URL} && npx prisma migrate deploy && node dist/index.js"
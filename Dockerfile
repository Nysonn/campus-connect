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

# 5. Generate Prisma client
RUN npx prisma generate

# 6. Copy source code (everything else)
COPY . .

# 7. Build TypeScript
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

# Copy only production dependencies by re-installing using pruned package.json
COPY package*.json ./
RUN npm ci --only=production

# Copy prisma schema & generated client (schema sometimes needed for migrate if you add it later)
COPY prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy built application
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "fetch('http://localhost:' + (process.env.PORT||4000) + '/me').catch(()=>process.exit(1))" || exit 1

CMD ["node", "dist/index.js"]
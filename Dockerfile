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
RUN npm install --prefer-offline --no-audit --progress=false

#####################################
# builder stage: install all deps & build
#####################################
FROM deps AS builder
WORKDIR /app
COPY . .
# generate prisma client (requires @prisma/client present)
RUN npx prisma generate
# build typescript to dist
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
# copy built JS and production node_modules from previous stages
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
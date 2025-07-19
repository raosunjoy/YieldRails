# Multi-stage build for YieldRails backend service

# ---- Base Node ----
FROM node:18-alpine AS base
WORKDIR /app
# Add tini for proper signal handling
RUN apk add --no-cache tini
# Install dependencies required for Prisma
RUN apk add --no-cache openssl

# ---- Dependencies ----
FROM base AS dependencies
# Copy package files
COPY package.json package-lock.json ./
# Install production dependencies
RUN npm ci --only=production
# Install ALL dependencies for the build step
RUN cp -R node_modules /tmp/node_modules
RUN npm ci

# ---- Build ----
FROM dependencies AS build
# Copy source files
COPY . .
# Generate Prisma client
RUN npx prisma generate
# Build TypeScript
RUN npm run build

# ---- Release ----
FROM base AS release
# Set environment variables
ENV NODE_ENV=production
# Copy production dependencies
COPY --from=dependencies /tmp/node_modules ./node_modules
# Copy built application
COPY --from=build /app/dist ./dist
# Copy Prisma schema and migrations
COPY --from=build /app/prisma ./prisma
# Copy package.json and other necessary files
COPY package.json ./
COPY .env.example ./
COPY scripts ./scripts

# Expose the application port
EXPOSE 3000

# Use tini as entrypoint to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]
# Start the application
CMD ["node", "dist/src/server.js"]
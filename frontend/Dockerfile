# Multi-stage build for YieldRails frontend

# ---- Base Node ----
FROM node:18-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS dependencies
# Copy package files
COPY package.json package-lock.json ./
# Install dependencies
RUN npm ci

# ---- Build ----
FROM dependencies AS build
# Copy source files
COPY . .
# Set environment variables for build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Build the application
RUN npm run build

# ---- Production ----
FROM node:18-alpine AS production
WORKDIR /app
# Set environment variables
ENV NODE_ENV=production
# Copy built application
COPY --from=build /app/next.config.js ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
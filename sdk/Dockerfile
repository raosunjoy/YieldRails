# Multi-stage build for YieldRails SDK

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
# Build the SDK
RUN npm run build
# Create package for distribution
RUN npm pack

# ---- Release ----
FROM node:18-alpine AS release
WORKDIR /app
# Copy built package
COPY --from=build /app/*.tgz ./
# Copy package.json and README
COPY --from=build /app/package.json ./
COPY --from=build /app/README.md ./

# Default command (does nothing, this is a library container)
CMD ["echo", "This is a library container, not meant to be run directly"]
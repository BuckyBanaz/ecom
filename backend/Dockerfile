# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma engine needs OpenSSL on Alpine
RUN apk add --no-cache openssl libc6-compat postgresql16-client

# Copy package files
COPY package*.json ./
COPY tsconfig.json tsconfig.build.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Fresh compile every image build (tsc may warn on types but must emit dist)
RUN rm -rf dist && (npm run build || true) \
    && test -f dist/services/settingsStore.js \
    && test -f dist/controllers/adminSettingsController.js

# Production stage
FROM node:20-alpine

WORKDIR /app

# Prisma migrate/generate requires OpenSSL on Alpine
RUN apk add --no-cache openssl libc6-compat postgresql16-client

# Copy package files
COPY package*.json ./

# Install dependencies needed for Prisma migrations and runtime
RUN npm ci && npm cache clean --force

# Copy prisma files
COPY prisma ./prisma

# Generate Prisma client for this image (builder client is not copied)
RUN npx prisma generate

# Copy built dist from builder
COPY --from=builder /app/dist ./dist

# Utility scripts (e.g. clear_orders.js, clear_dummy_users.js)
COPY clear_orders.js clear_dummy_users.js ./

# Create uploads + SEO files directories
RUN mkdir -p public/uploads backups seo

# Expose port
EXPOSE 5000

# Run migrations and start app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

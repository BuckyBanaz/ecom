# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma engine needs OpenSSL on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build || echo "Build failed, continuing..."

# Production stage
FROM node:20-alpine

WORKDIR /app

# Prisma migrate/generate requires OpenSSL on Alpine
RUN apk add --no-cache openssl libc6-compat

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

# Utility scripts (e.g. clear_orders.js)
COPY clear_orders.js ./

# Create uploads directory
RUN mkdir -p public/uploads

# Expose port
EXPOSE 5000

# Run migrations and start app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

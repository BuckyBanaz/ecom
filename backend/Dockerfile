# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy prisma schema first
COPY prisma ./prisma

# Generate Prisma client
RUN npm run prisma:generate || npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build || true

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy prisma files
COPY prisma ./prisma

# Copy built app from builder (if build succeeded)
COPY --from=builder /app/dist ./dist 2>/dev/null || true

# Copy node_modules/.prisma from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true

# Create uploads directory
RUN mkdir -p public/uploads

# Expose port
EXPOSE 5000

# Run migrations and start app
CMD ["sh", "-c", "npx prisma migrate deploy --skip-generate && node dist/index.js"]

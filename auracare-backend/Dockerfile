# Build stage
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create production build (if needed)
# RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Runtime stage
FROM node:18-alpine

# Install system dependencies
RUN apk --no-cache add curl

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/ ./

# Create necessary directories
RUN mkdir -p logs uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "server.js"]

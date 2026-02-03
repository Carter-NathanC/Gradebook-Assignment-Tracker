# STAGE 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build the React frontend
RUN npm run build

# STAGE 2: Production Runner
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/install.js ./install.js

# Ensure data directory exists
RUN mkdir -p /app/data

# EXPOSE PORT
EXPOSE 3000

# Volume for persistent data
VOLUME ["/app/data"]

# Start command (Running as default ROOT user to avoid permission issues)
CMD ["sh", "-c", "node install.js && node server.js"]

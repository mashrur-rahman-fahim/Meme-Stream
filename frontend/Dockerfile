# Multi-stage build for React + Vite application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# Set npm configuration to handle optional dependencies gracefully
ENV npm_config_target_platform=linux
ENV npm_config_target_arch=x64
ENV npm_config_target_libc=musl

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Clean install with proper handling of optional dependencies
RUN npm cache clean --force
RUN npm install --verbose --no-audit --no-fund

# Manually install Rollup binary for Alpine Linux
RUN npm install @rollup/rollup-linux-x64-musl --save-optional --no-save || \
    npm install @rollup/rollup-linux-x64-gnu --save-optional --no-save || \
    echo "Rollup binary installation failed, continuing with fallback"

# Copy all source code
COPY . .

# Build argument for API URL (can be set during build)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application with verbose output for debugging
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
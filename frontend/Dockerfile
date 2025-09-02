# Multi-stage build for React + Vite application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy all source code
COPY . .

# Debug: Check file structure
RUN echo "=== Checking file structure ==="
RUN ls -la
RUN echo "=== Checking src directory ==="
RUN ls -la src/
RUN echo "=== Checking context directory ==="
RUN ls -la context/
RUN echo "=== Checking if main.jsx exists ==="
RUN cat src/main.jsx

# Build argument for API URL (can be set during build)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application
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

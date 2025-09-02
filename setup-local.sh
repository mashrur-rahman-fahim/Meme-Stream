#!/bin/bash

# MemeStream Local Development Setup Script

echo "🚀 Setting up MemeStream for local development..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is installed"

# Create .env file if it doesn't exist
if [ ! -f "MemeStreamApi/.env" ]; then
    echo "📝 Creating .env file from template..."
    cp MemeStreamApi/.env.production MemeStreamApi/.env
    echo "⚠️  Please update the .env file with your actual credentials!"
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend:  http://localhost:5216"
    echo "   API Docs: http://localhost:5216/swagger"
    echo ""
    echo "📊 Monitor logs with: docker-compose logs -f"
    echo "🛑 Stop services with: docker-compose down"
else
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
fi

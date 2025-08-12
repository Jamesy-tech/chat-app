#!/bin/bash

# Simple Chat App Setup Script
echo "🚀 Setting up Simple Chat App..."

# Create necessary directories
mkdir -p public data

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found!"

# Build and start the application
echo "📦 Building Docker image..."
docker-compose build

echo "🎬 Starting the application..."
docker-compose up -d

echo "⏰ Waiting for application to start..."
sleep 5

# Check if the application is running
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo "🌐 Open your browser and go to: http://localhost:3000"
else
    echo "❌ Application failed to start. Check logs with: docker-compose logs"
fi

echo ""
echo "📋 Useful commands:"
echo "  • View logs: docker-compose logs -f"
echo "  • Stop app: docker-compose down"
echo "  • Restart app: docker-compose restart"
echo "  • Rebuild app: docker-compose build && docker-compose up -d"
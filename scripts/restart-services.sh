#!/bin/bash

# Restart Services Script for fal.ai Dashboard
# This script restarts the backend and slack services with proper error handling

set -e

echo "🔄 Restarting fal.ai Dashboard Services..."

# Validate environment variables
echo "🔍 Validating environment configuration..."
if node scripts/validate-env.js; then
    echo "✅ Environment validation passed"
else
    echo "❌ Environment validation failed"
    echo "Please fix the missing environment variables and try again"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is in use"
        return 0
    else
        echo "✅ Port $port is available"
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo "🔄 Killing process on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check current PM2 status
echo "📊 Current PM2 Status:"
pm2 list

# Stop all services
echo "🛑 Stopping all services..."
pm2 stop ecosystem.config.js || true
pm2 delete ecosystem.config.js || true

# Wait a moment
sleep 3

# Check for port conflicts
echo "🔍 Checking for port conflicts..."
if check_port 3000; then
    echo "⚠️  Port 3000 is in use. Backend may use alternative port."
fi

if check_port 3001; then
    echo "⚠️  Port 3001 is in use. Slack service may use alternative port."
fi

# Start services
echo "🚀 Starting services..."
pm2 start ecosystem.config.js

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Service Status:"
pm2 list

# Check if services are running
echo "🔍 Checking service health..."

# Get backend port from PM2 logs
BACKEND_PORT=$(pm2 logs dashboard-backend --lines 1 --nostream 2>/dev/null | grep -o '"port":[^,]*' | grep -o '[0-9]*' | tail -1 || echo "3000")

echo "🔗 Backend detected on port: $BACKEND_PORT"

# Test backend health
echo "🏥 Testing backend health..."
if curl -s "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
fi

# Test slack service
echo "🤖 Testing Slack service..."
if pm2 logs dashboard-slack --lines 5 --nostream 2>/dev/null | grep -q "Backend API connectivity verified"; then
    echo "✅ Slack service connected to backend"
else
    echo "⚠️  Slack service may have connection issues"
fi

echo "🎉 Restart complete!"
echo ""
echo "📋 Useful commands:"
echo "  pm2 logs                    # View all logs"
echo "  pm2 logs dashboard-backend  # View backend logs"
echo "  pm2 logs dashboard-slack    # View slack logs"
echo "  pm2 monit                   # Monitor services"
echo "  pm2 restart ecosystem.config.js  # Restart all services" 
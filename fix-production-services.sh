#!/bin/bash

# =============================================================================
# Production Services Fix Script
# =============================================================================

echo "🔧 Fixing Production Services Configuration..."
echo "=============================================="

# Stop all existing services
echo "🛑 Stopping all existing services..."
pm2 stop all
pm2 delete all

# Wait for services to stop
sleep 3

# Check if ports are free
echo "🔍 Checking port availability..."
if lsof -i :3000 >/dev/null 2>&1; then
    echo "⚠️  Port 3000 is still in use. Force killing..."
    sudo lsof -ti :3000 | xargs kill -9 2>/dev/null || true
fi

if lsof -i :3001 >/dev/null 2>&1; then
    echo "⚠️  Port 3001 is still in use. Force killing..."
    sudo lsof -ti :3001 | xargs kill -9 2>/dev/null || true
fi

# Wait a moment
sleep 2

echo "✅ Services stopped successfully"
echo ""

# Check environment variables
echo "🔧 Checking environment variables..."
if [ -z "$SLACK_BOT_TOKEN" ]; then
    echo "⚠️  SLACK_BOT_TOKEN not set in environment"
    echo "   Loading from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$SLACK_SIGNING_SECRET" ]; then
    echo "⚠️  SLACK_SIGNING_SECRET not set in environment"
    echo "   Loading from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$SLACK_APP_TOKEN" ]; then
    echo "⚠️  SLACK_APP_TOKEN not set in environment"
    echo "   Loading from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

echo "✅ Environment variables loaded"
echo ""

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start services with fixed configuration
echo "🚀 Starting services with fixed configuration..."
echo "=============================================="

# Start backend first
echo "📡 Starting Backend API Server..."
pm2 start ecosystem.config.js --only dashboard-backend

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Check if backend is running
if pm2 list | grep -q "dashboard-backend.*online"; then
    echo "✅ Backend API Server started successfully"
else
    echo "❌ Backend API Server failed to start"
    pm2 logs dashboard-backend --lines 10
    exit 1
fi

# Start Slack service
echo "🤖 Starting Slack Bot Service..."
pm2 start ecosystem.config.js --only dashboard-slack

# Wait for Slack service to start
echo "⏳ Waiting for Slack service to start..."
sleep 10

# Check if Slack service is running
if pm2 list | grep -q "dashboard-slack.*online"; then
    echo "✅ Slack Bot Service started successfully"
else
    echo "❌ Slack Bot Service failed to start"
    pm2 logs dashboard-slack --lines 10
    exit 1
fi

# Show status
echo ""
echo "📊 Service Status:"
echo "=================="
pm2 list

echo ""
echo "🔍 Health Check:"
echo "================"

# Test backend health endpoint
echo "🏥 Testing backend health endpoint..."
curl -s http://localhost:3000/health || echo "❌ Backend health check failed"

echo ""
echo "📋 Recent Logs:"
echo "==============="
pm2 logs --lines 5

echo ""
echo "🎉 Services should now be running correctly!"
echo "💡 Use 'pm2 logs' to monitor the services"
echo "💡 Use 'pm2 monit' to see real-time monitoring" 
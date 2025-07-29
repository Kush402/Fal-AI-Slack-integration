#!/bin/bash

# Slack AI Asset Generator - Deployment Script
# For small team deployment (20 users max) on web droplet

set -e

echo "🚀 Starting Slack AI Asset Generator deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found. Please create one from config/env.production"
    exit 1
fi

# Load environment variables
source .env

print_status "Checking system requirements..."

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js version: $(node --version)"

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    print_warning "Redis is not running. Starting Redis..."
    sudo systemctl start redis-server
fi

print_status "Redis is running"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing PM2..."
    sudo npm install -g pm2
fi

print_status "Installing dependencies..."
npm install

print_status "Creating logs directory..."
mkdir -p logs

print_status "Validating configuration..."
node -e "
const config = require('./src/config');
console.log('✅ Configuration validated successfully');
console.log('📊 App config:', JSON.stringify(config.app, null, 2));
console.log('🔧 Redis config:', JSON.stringify(config.redis, null, 2));
"

print_status "Starting application with PM2..."

# Create PM2 ecosystem file if it doesn't exist
if [ ! -f ecosystem.config.js ]; then
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'slack-ai-generator',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
fi

# Stop existing PM2 process if running
pm2 stop slack-ai-generator 2>/dev/null || true
pm2 delete slack-ai-generator 2>/dev/null || true

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

print_status "Application started successfully!"

# Wait a moment for the app to start
sleep 3

# Check if the application is running
if curl -s http://localhost:3000/health > /dev/null; then
    print_status "✅ Application is running and healthy"
    print_status "🌐 API available at: http://localhost:3000"
    print_status "📊 Health check: http://localhost:3000/health"
else
    print_error "❌ Application failed to start properly"
    print_status "Check logs with: pm2 logs slack-ai-generator"
    exit 1
fi

# Display useful commands
echo ""
print_status "Useful commands:"
echo "  📊 Check status: pm2 status"
echo "  📝 View logs: pm2 logs slack-ai-generator"
echo "  🔄 Restart: pm2 restart slack-ai-generator"
echo "  📈 Monitor: pm2 monit"
echo "  🛑 Stop: pm2 stop slack-ai-generator"

# Check Redis connection
if redis-cli ping > /dev/null 2>&1; then
    print_status "✅ Redis connection successful"
else
    print_warning "⚠️  Redis connection failed. Check Redis configuration."
fi

print_status "🎉 Deployment completed successfully!" 
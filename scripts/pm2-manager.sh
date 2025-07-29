#!/bin/bash

# PM2 Dashboard Manager Script
# Manages the fal.ai dashboard services with proper startup order and clustering

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed. Installing PM2..."
        npm install -g pm2
    fi
}

# Check if ecosystem file exists
check_ecosystem() {
    if [ ! -f "ecosystem.config.js" ]; then
        print_error "ecosystem.config.js not found!"
        exit 1
    fi
}

# Start all services with proper order
start_all() {
    print_header "Starting Dashboard Services"
    check_pm2
    check_ecosystem
    
    print_status "Starting dashboard-backend (will start first)..."
    pm2 start ecosystem.config.js --only dashboard-backend
    
    print_status "Waiting for backend to be ready..."
    sleep 10
    
    print_status "Starting dashboard-slack (depends on backend)..."
    pm2 start ecosystem.config.js --only dashboard-slack
    
    print_status "All services started successfully!"
    pm2 status
}

# Stop all services
stop_all() {
    print_header "Stopping Dashboard Services"
    
    print_status "Stopping all services..."
    pm2 stop ecosystem.config.js
    
    print_status "All services stopped!"
    pm2 status
}

# Restart all services
restart_all() {
    print_header "Restarting Dashboard Services"
    
    print_status "Restarting all services..."
    pm2 restart ecosystem.config.js
    
    print_status "All services restarted!"
    pm2 status
}

# Delete all services
delete_all() {
    print_header "Deleting Dashboard Services"
    
    print_status "Deleting all services..."
    pm2 delete ecosystem.config.js
    
    print_status "All services deleted!"
    pm2 status
}

# Show status
show_status() {
    print_header "Dashboard Services Status"
    pm2 status
}

# Show logs
show_logs() {
    print_header "Dashboard Services Logs"
    pm2 logs
}

# Monitor services
monitor() {
    print_header "Dashboard Services Monitor"
    pm2 monit
}

# Scale services
scale_services() {
    print_header "Scaling Dashboard Services"
    
    local backend_instances=${1:-4}
    local slack_instances=${2:-2}
    
    print_status "Scaling dashboard-backend to $backend_instances instances..."
    pm2 scale dashboard-backend $backend_instances
    
    print_status "Scaling dashboard-slack to $slack_instances instances..."
    pm2 scale dashboard-slack $slack_instances
    
    print_status "Services scaled successfully!"
    pm2 status
}

# Health check
health_check() {
    print_header "Dashboard Services Health Check"
    
    # Check if services are running
    if pm2 list | grep -q "dashboard-backend"; then
        print_status "dashboard-backend: RUNNING"
    else
        print_error "dashboard-backend: NOT RUNNING"
    fi
    
    if pm2 list | grep -q "dashboard-slack"; then
        print_status "dashboard-slack: RUNNING"
    else
        print_error "dashboard-slack: NOT RUNNING"
    fi
    
    # Check backend API health
    if curl -s http://localhost:3000/health > /dev/null; then
        print_status "Backend API: HEALTHY"
    else
        print_error "Backend API: UNHEALTHY"
    fi
}

# Setup logs directory
setup_logs() {
    print_header "Setting up logs directory"
    mkdir -p logs
    print_status "Logs directory created!"
}

# Show help
show_help() {
    echo "PM2 Dashboard Manager"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start all services (backend first, then slack)"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  delete      Delete all services"
    echo "  status      Show service status"
    echo "  logs        Show service logs"
    echo "  monitor     Monitor services"
    echo "  scale       Scale services (default: backend=4, slack=2)"
    echo "  health      Health check"
    echo "  setup-logs  Setup logs directory"
    echo "  help        Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 scale 6 3"
    echo "  $0 health"
}

# Main script logic
case "${1:-help}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    delete)
        delete_all
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    monitor)
        monitor
        ;;
    scale)
        scale_services $2 $3
        ;;
    health)
        health_check
        ;;
    setup-logs)
        setup_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 
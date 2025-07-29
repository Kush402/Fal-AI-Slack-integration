/**
 * PM2 Ecosystem Configuration for Slack AI Asset Generator Dashboard
 * 
 * This configuration manages two separate services:
 * 1. Dashboard Backend API Server (Pure Express API)
 * 2. Dashboard Slack Bot Service (Standalone Slack bot)
 * 
 * Features:
 * - Clustered instances for better performance
 * - Proper startup order (backend first, then slack)
 * - Production-ready configuration
 * - Comprehensive logging and monitoring
 * 
 * Usage:
 *   Start all services: pm2 start ecosystem.config.js
 *   Start specific service: pm2 start ecosystem.config.js --only dashboard-backend
 *   Stop all services: pm2 stop ecosystem.config.js
 *   Restart all services: pm2 restart ecosystem.config.js
 *   Monitor services: pm2 monit
 *   View logs: pm2 logs
 *   Scale backend: pm2 scale dashboard-backend 4
 *   Scale slack: pm2 scale dashboard-slack 2
 */

// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  apps: [
    {
      // Dashboard Backend API Server
      name: 'dashboard-backend',
      script: 'src/server.js',
      instances: 1, // Single instance for small team deployment
      exec_mode: 'cluster', // Enable clustering
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        SERVICE_NAME: 'dashboard-backend',
        MOCK_DRIVE_UPLOADS: 'false',
        // Google Drive configuration
        GOOGLE_SHARED_DRIVE_ID: process.env.GOOGLE_SHARED_DRIVE_ID,
        GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
        GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID,
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_X509_CERT_URL: process.env.GOOGLE_CLIENT_X509_CERT_URL,
        GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
        GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
        // All other env vars will be loaded from .env file
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        SERVICE_NAME: 'dashboard-backend',
        MOCK_DRIVE_UPLOADS: 'false',
        // Google Drive configuration
        GOOGLE_SHARED_DRIVE_ID: process.env.GOOGLE_SHARED_DRIVE_ID,
        GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
        GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID,
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_X509_CERT_URL: process.env.GOOGLE_CLIENT_X509_CERT_URL,
        GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
        GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
        // All other env vars will be loaded from .env file
      },
      log_file: './logs/dashboard-backend-combined.log',
      out_file: './logs/dashboard-backend-out.log',
      error_file: './logs/dashboard-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      // Health check for clustering
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      // Performance monitoring
      pmx: true,
      // Cluster-specific settings
      instance_var: 'INSTANCE_ID',
      // Load balancing
      load_balancing_method: 'least-connection'
    },
    {
      // Dashboard Slack Bot Service
      name: 'dashboard-slack',
      script: 'src/slack-service.js',
      instances: 1, // Single instance for small team deployment
      exec_mode: 'cluster', // Enable clustering
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        SLACK_PORT: 3001,
        BACKEND_API_URL: 'http://localhost:3000',
        SERVICE_NAME: 'dashboard-slack',
        // Google Drive configuration
        GOOGLE_SHARED_DRIVE_ID: process.env.GOOGLE_SHARED_DRIVE_ID,
        GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
        GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID,
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_X509_CERT_URL: process.env.GOOGLE_CLIENT_X509_CERT_URL,
        GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
        GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
        // All other env vars will be loaded from .env file
      },
      env_production: {
        NODE_ENV: 'production',
        SLACK_PORT: 3001,
        BACKEND_API_URL: 'http://localhost:3000',
        SERVICE_NAME: 'dashboard-slack',
        // Google Drive configuration
        GOOGLE_SHARED_DRIVE_ID: process.env.GOOGLE_SHARED_DRIVE_ID,
        GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
        GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID,
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_X509_CERT_URL: process.env.GOOGLE_CLIENT_X509_CERT_URL,
        GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
        GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
        // All other env vars will be loaded from .env file
      },
      log_file: './logs/dashboard-slack-combined.log',
      out_file: './logs/dashboard-slack-out.log',
      error_file: './logs/dashboard-slack-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      // Slack bot depends on backend API - ensures proper startup order
      depends_on: ['dashboard-backend'],
      delay_time: 8000, // Wait 8 seconds after backend starts
      // Health check for clustering
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      // Performance monitoring
      pmx: true,
      // Cluster-specific settings
      instance_var: 'INSTANCE_ID',
      // Load balancing
      load_balancing_method: 'least-connection'
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/fal.ai_dashboard.git',
      path: '/var/www/fal.ai_dashboard',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y',
      'post-setup': 'npm install pm2 -g'
    },
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/fal.ai_dashboard.git',
      path: '/var/www/fal.ai_dashboard-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
}; 
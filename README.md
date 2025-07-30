# 🚀 Slack AI Asset Generator

A production-ready Slack-integrated AI asset generator for creative teams, featuring a decoupled architecture with separate backend API and Slack bot services.

## 🎯 Overview

This system enables creative teams to generate high-quality marketing assets using cutting-edge AI models through Slack integration. The project uses a **microservices architecture** with two independent services:

1. **Backend API Server** (`src/server.js`) - Pure Express.js API
2. **Slack Bot Service** (`src/slack-service.js`) - Standalone Slack bot

### Key Features:
- ✅ Thread-scoped, multi-user sessions
- ✅ Structured campaign data collection
- ✅ 8 fal.ai service integrations (26+ models)
- ✅ Automatic Google Drive organization
- ✅ Real-time progress tracking
- ✅ Regeneration and editing capabilities

### Benefits of Separated Architecture:
- ✅ **Independent Scaling** - Scale backend and Slack bot separately
- ✅ **Independent Deployment** - Deploy services independently
- ✅ **Better Reliability** - If one service fails, the other continues
- ✅ **Easier Testing** - Test backend API without Slack dependencies
- ✅ **PM2 Management** - Professional process management with monitoring

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+
- PM2 (installed globally): `npm install -g pm2`

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp config/env.example .env
# Edit .env with your actual values
```

### 3. Create Log Directory
```bash
npm run setup:logs
```

### 4. Start Services with PM2
```bash
# Start both services
npm run pm2:start

# Or start individually
npm run pm2:backend  # Backend API only
npm run pm2:slack    # Slack bot only
```

### 5. Log Management (Optional)
```bash
# Check log statistics
npm run log:stats

# Run log cleanup (dry run first)
npm run log:cleanup:dry
npm run log:cleanup

# Check port status
npm run port:check
```

---

## 📋 Available Scripts

### Development (Single Process)
```bash
npm run dev:backend     # Backend API in development mode
npm run dev:slack       # Slack bot in development mode
```

### Production (PM2 Managed)
```bash
npm run pm2:start       # Start both services
npm run pm2:stop        # Stop both services  
npm run pm2:restart     # Restart both services
npm run pm2:delete      # Delete both services
npm run pm2:status      # Show service status
npm run pm2:logs        # Show logs from both services
npm run pm2:monit       # Open PM2 monitoring dashboard
```

### Individual Service Management
```bash
pm2 start ecosystem.config.js --only dashboard-backend
pm2 start ecosystem.config.js --only dashboard-slack
pm2 restart dashboard-backend
pm2 restart dashboard-slack
pm2 logs dashboard-backend
pm2 logs dashboard-slack
```

### Log Management
```bash
npm run log:stats          # Get log statistics
npm run log:cleanup:dry    # Preview cleanup (dry run)
npm run log:cleanup        # Run actual cleanup
npm run port:check         # Check port availability
```

---

## 🔧 Configuration

### Environment Variables

#### Required for Backend API:
```bash
# App Configuration
PORT=3000
NODE_ENV=development

# Session Storage (use memory for development)
SESSION_STORAGE_TYPE=memory

# Mock Services (for development without real credentials)
ENABLE_MOCK_SERVICES=true
MOCK_DRIVE_UPLOADS=true

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret
```

#### Required for Slack Bot:
```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SOCKET_MODE=true

# Backend API Connection
BACKEND_API_URL=http://localhost:3000
SLACK_PORT=3001
```

#### Optional Production Settings:
```bash
# Fal.ai API
FAL_AI_API_KEY=your-fal-ai-key

# Google Cloud (for production)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GOOGLE_DRIVE_PARENT_FOLDER_ID=your-folder-id

# Redis (for production)
REDIS_HOST=localhost
REDIS_PORT=6379
SESSION_STORAGE_TYPE=redis
```

---

## 🔄 Canonical Workflow

### Step 1: Initialization
```
TRIGGER: /Dashboard
ACTION: Show structured campaign collection modal
BACKEND: POST /api/mcp/session/create
```

**Data Collected:**
- **Client Name** (required, 100 chars max)
- **Campaign Idea** (required, 500 chars max)  
- **Creative Directions** (optional, 300 chars max)
- **Visual Directions** (optional, 300 chars max)

### Step 2: Operation Selection
```
TRIGGER: Modal submission
ACTION: Show operation dropdown
BACKEND: GET /api/mcp/operations
```

**Available Operations:**
- ��️ **Text to Image** - Generate images from text
- 🎬 **Text to Video** - Create videos from descriptions
- �� **Image to Video** - Animate static images
- 🧊 **Image to 3D** - Convert images to 3D models
- 🎵 **Text to Audio** - Generate music/audio from text
- 🗣️ **Text to Speech** - Convert text to speech
- 🖼️ **Image to Image** - Transform and edit existing images
- �� **Video to Video** - Modify or restyle existing videos

### Step 3: Model Selection & Asset Generation
```
TRIGGER: Operation selected
ACTION: Show model selection and parameter configuration
BACKEND: POST /api/generate-asset
```

### Step 4: Asset Delivery
```
TRIGGER: Asset generated
ACTION: Upload to Google Drive, notify user in Slack
```

---

## 🌐 API Endpoints

### Backend API Server (Port 3000)

#### Health & Status
- `GET /health` - Health check
- `GET /` - API information

#### Session Management
- `POST /api/session/create` - Create new session
- `POST /api/session/select-operation` - Select operation type
- `POST /api/session/select-model` - Select AI model

#### Asset Generation
- `GET /api/models/:operation` - List available models
- `POST /api/generate` - Generate asset
- `GET /api/job/:jobId/status` - Check generation status

#### Enhancement
- `POST /api/enhance-prompt` - Enhance prompt with Gemini

### Slack Bot Service (Port 3001)
- Handles Slack interactions
- Communicates with Backend API via HTTP
- No direct API endpoints (Slack webhook receiver)

---

## 🏗️ Technical Architecture

### Backend Stack
```
Express.js Server
├── MCP Session Manager (Redis)
├── Cursor Rules Engine (Workflow)
├── 8x fal.ai Services (26+ Models)
├── Google Drive Service (OAuth)
└── Slack Bot (Bolt SDK)
```

### API Endpoints
```
POST   /api/mcp/session/create
GET    /api/mcp/session/:userId/:threadId
PUT    /api/mcp/session/:userId/:threadId/state
PUT    /api/mcp/session/:userId/:threadId/context
DELETE /api/mcp/session/:userId/:threadId
GET    /api/mcp/operations
GET    /api/mcp/models/:operationId
GET    /api/mcp/model/:operationId/:modelId
POST   /api/mcp/enhance-prompt
GET    /api/mcp/stats
GET    /api/mcp/user/:userId/sessions
GET    /api/mcp/health
```

### Session Management
- **Scope:** Thread-based (multi-user safe)
- **Storage:** Redis with JSON context
- **Isolation:** Per-user, per-thread
- **Timeout:** 2 hours idle
- **Cleanup:** Automatic background process

---

## 🔒 Security & Validation

### **Multi-Layer Security Implementation**
- **Network Security** - HTTPS/SSL, CORS, Rate Limiting, IP Whitelisting
- **Application Security** - Input validation, SQL injection prevention, XSS protection
- **Authentication** - JWT tokens, Slack user validation, session management
- **Infrastructure** - Security headers, error handling, comprehensive logging

### **Critical Security Requirements**

#### **Required Security Variables:**
```bash
# JWT Configuration (CRITICAL)
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters-long

# Encryption (CRITICAL)
ENCRYPTION_KEY=your-encryption-key-here-minimum-32-characters-long

# API Keys (CRITICAL)
FAL_KEY=your-fal-ai-api-key-here
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here
```

#### **Security Validation:**
- JWT_SECRET must be at least 32 characters long
- ENCRYPTION_KEY must be at least 32 characters long
- All API keys must be valid and active
- No default/fallback values for security keys

### **Attack Prevention**
- **SQL Injection** - Pattern-based detection and input sanitization
- **XSS Protection** - Content Security Policy and input filtering
- **File Upload Security** - Type validation, size limits, extension filtering
- **Rate Limiting** - Multiple tiers (General: 100/15min, Generation: 10/15min)

### **Production Security Features**
- **Security Headers** - Comprehensive HTTP security headers
- **Request Validation** - Size limits, URL length validation
- **Session Security** - UUID validation, timeout handling
- **Security Monitoring** - Real-time attack detection and logging

### **Security Configuration**
```bash
# Required for production
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key-here
ALLOWED_ORIGINS=https://your-domain.com,https://slack.com
```

---

## 🔍 Monitoring & Debugging

### PM2 Monitoring
```bash
pm2 monit           # Real-time monitoring dashboard
pm2 status          # Service status overview
pm2 logs            # Combined logs from both services
pm2 logs dashboard-backend # Backend API logs only
pm2 logs dashboard-slack  # Slack bot logs only
```

### Log Files
- `logs/dashboard-backend-combined.log` - Backend API logs
- `logs/dashboard-slack-combined.log` - Slack bot logs
- `logs/dashboard-backend-error.log` - Backend API errors
- `logs/dashboard-slack-error.log` - Slack bot errors

### Health Checks
```bash
# Check backend API
curl http://localhost:3000/health

# Check if services are running
pm2 status
```

### Metrics Tracked
- User sessions and activity
- Model usage and performance
- Error rates and response times
- Generation success/failure rates

---

## 🧪 Testing

### Backend API Testing
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test session creation
curl -X POST http://localhost:3000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"U123","channelId":"C123","campaignData":{"campaignIdea":"Test campaign"}}'
```

### Slack Bot Testing
1. Ensure backend API is running
2. Start Slack bot service
3. Use `/dashboard` command in Slack

---

## 🚢 Deployment

### Development
```bash
# Start in development mode
npm run dev:backend &
npm run dev:slack &
```

### Production with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start production services
NODE_ENV=production npm run pm2:start

# Save PM2 configuration
pm2 save
pm2 startup  # Follow the instructions to auto-start on boot
```

### Docker Deployment (Optional)
```bash
# Build and run with docker-compose
docker-compose up -d
```

---

## 📊 Performance Benchmarks

### Response Times
- **Modal Display:** < 500ms
- **Gemini Enhancement:** < 5s
- **Model Selection:** < 200ms
- **fal.ai Generation:** 30s - 5min (model dependent)
- **Drive Upload:** < 10s

### Throughput
- **Concurrent Users:** 100+
- **Sessions per Hour:** 1000+
- **Assets Generated per Day:** 10,000+

---

## 🔧 Troubleshooting

### Common Issues

#### Backend API Won't Start
1. Check port 3000 is available: `lsof -i :3000`
2. Verify environment variables: `cat .env`
3. Check logs: `pm2 logs dashboard-backend`

#### Slack Bot Can't Connect to Backend
1. Verify backend is running: `curl http://localhost:3000/health`
2. Check BACKEND_API_URL in environment
3. Check logs: `pm2 logs dashboard-slack`

#### Slack Authentication Errors
1. Verify Slack tokens in .env
2. Check Slack app configuration
3. Ensure Socket Mode is enabled

#### Session Storage Issues
- For development: Use `SESSION_STORAGE_TYPE=memory`
- For production: Ensure Redis is running

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev:backend
DEBUG=* npm run dev:slack
```

---

## 📁 Project Structure

```
src/
├── server.js              # Pure Backend API Server
├── slack-service.js        # Standalone Slack Bot Service  
├── config/                 # Configuration management
├── routes/                 # API routes
├── services/
│   ├── falai/             # Fal.ai service integrations
│   ├── drive/             # Google Drive service
│   ├── gemini/            # Gemini enhancement service
│   └── slack/             # Slack-related utilities
└── utils/                 # Utilities and helpers

ecosystem.config.js         # PM2 configuration
package.json               # Dependencies and scripts
.env                       # Environment variables
```

---

## 🎯 Next Steps

1. **Configure Slack App** - Set up your Slack app with proper tokens
2. **Setup Production Environment** - Configure Redis, Google Cloud, Fal.ai
3. **Test Integration** - Verify end-to-end functionality
4. **Monitor Performance** - Use PM2 monitoring in production
5. **Scale as Needed** - Adjust PM2 instances based on load

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add new feature'`
5. Push to branch: `git push origin feature/new-feature`
6. Create a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details.

---

**This project provides a comprehensive AI asset generation platform integrated with Slack, supporting multiple AI models and maintaining user sessions throughout the generation workflow.** 

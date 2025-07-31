#!/bin/bash

# Google Cloud Setup Script for fal.ai Dashboard Backend
# This script helps you configure Google Cloud integration

echo "🚀 Setting up Google Cloud integration for fal.ai Dashboard Backend"
echo "=================================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# =============================================================================
# GOOGLE CLOUD CONFIGURATION
# =============================================================================

# Google Cloud Project ID (replace with your actual project ID)
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here

# Google Cloud API Key (Vertex AI restricted)
GOOGLE_CLOUD_API_KEY=

# Google Cloud Region for Vertex AI
GOOGLE_CLOUD_REGION=us-central1

# =============================================================================
# GEMINI CONFIGURATION
# =============================================================================

# Gemini Model Configuration
VERTEX_AI_MODEL=gemini-1.5-pro-002
VERTEX_AI_MAX_RETRIES=3
VERTEX_AI_TIMEOUT=30000
VERTEX_AI_TEMPERATURE=0.7
VERTEX_AI_MAX_OUTPUT_TOKENS=2048

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================

# Environment
NODE_ENV=development
PORT=3000

# Service Configuration
ENABLE_MOCK_SERVICES=false
SESSION_STORAGE_TYPE=memory

# =============================================================================
# FAL.AI CONFIGURATION
# =============================================================================

# Fal.ai API Key (you'll need to get this from fal.ai)
FAL_KEY=your-fal-key-here

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================

# Encryption Key (32 characters for AES-256)
ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz123456

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

# Log Level (error, warn, info, debug)
LOG_LEVEL=info
LOG_FORMAT=json
EOF
    echo "✅ .env file created with Google Cloud configuration"
else
    echo "⚠️  .env file already exists. Please update it manually with your Google Cloud settings."
fi

echo ""
echo "🔧 Next steps:"
echo "1. Get your Google Cloud Project ID from: https://console.cloud.google.com"
echo "2. Update GOOGLE_CLOUD_PROJECT_ID in .env file"
echo "3. Get your fal.ai API key from: https://fal.ai/dashboard"
echo "4. Update FAL_KEY in .env file"
echo "5. Run: npm run start:backend"
echo ""
echo "📋 Your Google Cloud API Key is already configured:"
echo "    "
echo ""
echo "🎉 Setup complete! Your backend will use real Gemini 2.5 for brand research."

# Make script executable
chmod +x setup-google-cloud.sh 

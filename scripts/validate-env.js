#!/usr/bin/env node

/**
 * Environment Validation Script
 * Checks if all required environment variables are set
 */

const fs = require('fs');
const path = require('path');

// Required environment variables for each service
const requiredVars = {
  backend: [
    'FAL_KEY',
    'JWT_SECRET',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_PROJECT_ID'
  ],
  slack: [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'SLACK_APP_TOKEN',
    'FAL_KEY',
    'JWT_SECRET',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_PROJECT_ID'
  ]
};

// Optional environment variables with defaults
const optionalVars = {
  backend: {
    'PORT': '3000',
    'LOG_LEVEL': 'info',
    'FAL_AI_TIMEOUT': '30000',
    'FAL_AI_MAX_RETRIES': '3',
    'RATE_LIMIT_WINDOW': '900000',
    'RATE_LIMIT_MAX_REQUESTS': '100',
    'API_REQUEST_TIMEOUT': '30000',
    'API_MAX_RETRIES': '3',
    'MOCK_DRIVE_UPLOADS': 'false'
  },
  slack: {
    'SLACK_PORT': '3001',
    'BACKEND_API_URL': 'http://localhost:30001',
    'LOG_LEVEL': 'info',
    'FAL_AI_TIMEOUT': '30000',
    'FAL_AI_MAX_RETRIES': '3',
    'RATE_LIMIT_WINDOW': '900000',
    'RATE_LIMIT_MAX_REQUESTS': '100',
    'API_REQUEST_TIMEOUT': '30000',
    'API_MAX_RETRIES': '3'
  }
};

function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');
  
  let hasErrors = false;
  const results = {
    backend: { missing: [], optional: [] },
    slack: { missing: [], optional: [] }
  };

  // Check required variables
  for (const [service, vars] of Object.entries(requiredVars)) {
    console.log(`📋 Checking ${service} service required variables:`);
    
    for (const varName of vars) {
      const value = process.env[varName];
      if (!value) {
        results[service].missing.push(varName);
        console.log(`  ❌ ${varName} - MISSING`);
        hasErrors = true;
      } else {
        console.log(`  ✅ ${varName} - SET`);
      }
    }
    console.log('');
  }

  // Check optional variables
  for (const [service, vars] of Object.entries(optionalVars)) {
    console.log(`📋 Checking ${service} service optional variables:`);
    
    for (const [varName, defaultValue] of Object.entries(vars)) {
      const value = process.env[varName];
      if (!value) {
        results[service].optional.push(varName);
        console.log(`  ⚠️  ${varName} - NOT SET (will use default: ${defaultValue})`);
      } else {
        console.log(`  ✅ ${varName} - SET`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('📊 SUMMARY:');
  console.log('===========');
  
  for (const [service, result] of Object.entries(results)) {
    console.log(`\n${service.toUpperCase()} SERVICE:`);
    
    if (result.missing.length > 0) {
      console.log(`  ❌ Missing required variables:`);
      result.missing.forEach(varName => {
        console.log(`    - ${varName}`);
      });
    } else {
      console.log(`  ✅ All required variables are set`);
    }
    
    if (result.optional.length > 0) {
      console.log(`  ⚠️  Optional variables not set (will use defaults):`);
      result.optional.forEach(varName => {
        console.log(`    - ${varName}`);
      });
    }
  }

  // Recommendations
  if (hasErrors) {
    console.log('\n🚨 RECOMMENDATIONS:');
    console.log('==================');
    console.log('1. Copy config/env.example to .env');
    console.log('2. Fill in the missing required variables');
    console.log('3. Set optional variables as needed');
    console.log('4. Restart your services after updating .env');
    console.log('\n❌ Environment validation failed!');
    process.exit(1);
  } else {
    console.log('\n✅ Environment validation passed!');
    console.log('🚀 Ready to start services');
  }
}

// Check if .env file exists
function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  No .env file found');
    console.log('📝 Creating .env from template...');
    
    const examplePath = path.join(process.cwd(), 'config', 'env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log('✅ Created .env file from template');
      console.log('📝 Please edit .env with your actual values');
      console.log('');
    } else {
      console.log('❌ config/env.example not found');
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  checkEnvFile();
  validateEnvironment();
}

module.exports = { validateEnvironment, checkEnvFile }; 
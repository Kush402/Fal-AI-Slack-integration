/**
 * @fileoverview Centralized configuration module for the Slack AI Asset Generator
 * @description Loads and validates environment variables and provides typed configuration
 */

require('dotenv').config();
const Joi = require('joi');

// Configuration schema for validation
const configSchema = Joi.object({
    // Application settings
    app: Joi.object({
        name: Joi.string().default('slack-ai-asset-generator'),
        port: Joi.number().port().default(3000),
        env: Joi.string().valid('development', 'production', 'test').default('development'),
        logLevel: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
        debugMode: Joi.boolean().default(false)
    }),

    // Slack configuration
    slack: Joi.object({
        botToken: Joi.string().required(),
        signingSecret: Joi.string().required(),
        appToken: Joi.string().required(),
        socketMode: Joi.boolean().default(true)
    }),

    // Google Cloud configuration (optional for small deployments)
    google: Joi.object({
        projectId: Joi.string().optional(),
        region: Joi.string().default('us-central1'),
        credentialsPath: Joi.string().optional(),
        apiKey: Joi.string().optional(), // Made optional for small deployments
        drive: Joi.object({
            parentFolderId: Joi.string().optional(),
            serviceAccountEmail: Joi.string().email().optional()
        }).optional()
    }).optional(),

    // Vertex AI configuration (optional for small deployments)
    vertexAI: Joi.object({
        projectId: Joi.string().optional(),
        location: Joi.string().default('us-central1'),
        modelName: Joi.string().default('gemini-1.5-pro-002'),
        maxRetries: Joi.number().default(3),
        timeout: Joi.number().default(30000)
    }).optional(),

    // Fal.ai configuration
    falai: Joi.object({
        apiKey: Joi.string().required(),
        baseUrl: Joi.string().uri().default('https://fal.run'),
        timeout: Joi.number().default(300000), // 5 minutes
        maxRetries: Joi.number().default(3),
        retryDelay: Joi.number().default(5000)
    }),

    // Redis configuration (flexible for small deployments)
    redis: Joi.object({
        host: Joi.string().default('localhost'),
        port: Joi.number().port().default(6379),
        password: Joi.string().allow('').optional(),
        db: Joi.number().default(0),
        keyPrefix: Joi.string().default('slack-ai-bot:'),
        maxRetries: Joi.number().default(3)
    }).optional(),

    // Session configuration (optimized for small team)
    session: Joi.object({
        timeout: Joi.number().default(7200000), // 2 hours
        cleanupInterval: Joi.number().default(3600000), // 1 hour
        maxConcurrentSessions: Joi.number().default(50), // Reduced for small team
        storageType: Joi.string().valid('redis', 'memory').default('redis')
    }),

    // Rate limiting configuration (optimized for small team)
    rateLimit: Joi.object({
        windowMs: Joi.number().default(900000), // 15 minutes
        maxRequests: Joi.number().default(100), // Increased for small team
        skipSuccessful: Joi.boolean().default(true)
    }),

    // Security configuration
    security: Joi.object({
        jwtSecret: Joi.string().optional(), // Made optional for development
        encryptionKey: Joi.string().length(32).optional(), // Made optional for development
        allowedOrigins: Joi.array().items(Joi.string().uri()).default([])
    }).optional(),

    // Job queue configuration
    jobQueue: Joi.object({
        redis: Joi.object({
            host: Joi.string().default('localhost'),
            port: Joi.number().port().default(6379),
            password: Joi.string().allow('').optional(),
            db: Joi.number().default(1)
        }),
        attempts: Joi.number().default(3),
        backoffDelay: Joi.number().default(30000)
    }),

    // Asset configuration
    assets: Joi.object({
        maxSizeMB: Joi.number().default(100),
        allowedTypes: Joi.array().items(Joi.string()).default([
            'image/jpeg', 'image/png', 'image/gif',
            'video/mp4', 'audio/mpeg', 'audio/wav'
        ]),
        cleanupAfterDays: Joi.number().default(30)
    }),

    // API configuration
    api: Joi.object({
        requestTimeout: Joi.number().default(30000),
        maxRetries: Joi.number().default(3),
        retryDelay: Joi.number().default(1000)
    }),

    // Feature flags
    features: Joi.object({
        regeneration: Joi.boolean().default(true),
        assetEditing: Joi.boolean().default(true),
        assetUpscaling: Joi.boolean().default(true),
        batchProcessing: Joi.boolean().default(false),
        webhookNotifications: Joi.boolean().default(true),
        mockServices: Joi.boolean().default(false)
    }),

    // Monitoring configuration
    monitoring: Joi.object({
        enabled: Joi.boolean().default(true),
        metricsPort: Joi.number().port().default(9090),
        logFilePath: Joi.string().default('./logs/app.log'),
        logFileMaxSize: Joi.number().default(10485760), // 10MB
        logFileMaxFiles: Joi.number().default(5)
    })
}).required();

// Raw configuration from environment variables
const rawConfig = {
    app: {
        name: process.env.APP_NAME,
        port: parseInt(process.env.PORT, 10),
        env: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL,
        debugMode: process.env.DEBUG_MODE === 'true'
    },

    slack: {
        botToken: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        appToken: process.env.SLACK_APP_TOKEN,
        socketMode: process.env.SLACK_SOCKET_MODE !== 'false'
    },

    google: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        region: process.env.GOOGLE_CLOUD_REGION,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY, // Support both GEMINI_API_KEY and GOOGLE_API_KEY
        drive: {
            parentFolderId: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
            serviceAccountEmail: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
        }
    },

    vertexAI: {
        projectId: process.env.VERTEX_AI_PROJECT_ID,
        location: process.env.VERTEX_AI_LOCATION,
        modelName: process.env.GEMINI_MODEL_NAME,
        maxRetries: parseInt(process.env.VERTEX_AI_MAX_RETRIES, 10),
        timeout: parseInt(process.env.VERTEX_AI_TIMEOUT, 10)
    },

    falai: {
        apiKey: process.env.FAL_KEY,
        baseUrl: process.env.FAL_AI_BASE_URL,
        timeout: parseInt(process.env.FAL_AI_TIMEOUT, 10),
        maxRetries: parseInt(process.env.FAL_AI_MAX_RETRIES, 10),
        retryDelay: parseInt(process.env.FAL_AI_RETRY_DELAY, 10)
    },

    redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB, 10),
        keyPrefix: process.env.REDIS_KEY_PREFIX,
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES, 10)
    },

    session: {
        timeout: parseInt(process.env.SESSION_TIMEOUT, 10),
        cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL, 10),
        maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS, 10),
        storageType: process.env.SESSION_STORAGE_TYPE
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10),
        skipSuccessful: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true'
    },

    security: {
        jwtSecret: process.env.JWT_SECRET,
        encryptionKey: process.env.ENCRYPTION_KEY,
        allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []
    },

    jobQueue: {
        redis: {
            host: process.env.BULL_REDIS_HOST,
            port: parseInt(process.env.BULL_REDIS_PORT, 10),
            password: process.env.BULL_REDIS_PASSWORD,
            db: parseInt(process.env.BULL_REDIS_DB, 10)
        },
        attempts: parseInt(process.env.JOB_ATTEMPTS, 10),
        backoffDelay: parseInt(process.env.JOB_BACKOFF_DELAY, 10)
    },

    assets: {
        maxSizeMB: parseInt(process.env.MAX_ASSET_SIZE_MB, 10),
        allowedTypes: process.env.ALLOWED_ASSET_TYPES ? process.env.ALLOWED_ASSET_TYPES.split(',') : undefined,
        cleanupAfterDays: parseInt(process.env.ASSET_CLEANUP_AFTER_DAYS, 10)
    },

    api: {
        requestTimeout: parseInt(process.env.API_REQUEST_TIMEOUT, 10),
        maxRetries: parseInt(process.env.API_MAX_RETRIES, 10),
        retryDelay: parseInt(process.env.API_RETRY_DELAY, 10)
    },

    features: {
        regeneration: process.env.ENABLE_REGENERATION === 'true',
        assetEditing: process.env.ENABLE_ASSET_EDITING === 'true',
        assetUpscaling: process.env.ENABLE_ASSET_UPSCALING === 'true',
        batchProcessing: process.env.ENABLE_BATCH_PROCESSING === 'true',
        webhookNotifications: process.env.ENABLE_WEBHOOK_NOTIFICATIONS === 'true',
        mockServices: process.env.ENABLE_MOCK_SERVICES === 'true'
    },

    monitoring: {
        enabled: process.env.ENABLE_METRICS === 'true',
        metricsPort: parseInt(process.env.METRICS_PORT, 10),
        logFilePath: process.env.LOG_FILE_PATH,
        logFileMaxSize: parseInt(process.env.LOG_FILE_MAX_SIZE, 10),
        logFileMaxFiles: parseInt(process.env.LOG_FILE_MAX_FILES, 10)
    }
};

// Validate configuration
const { error, value: config } = configSchema.validate(rawConfig, { 
    allowUnknown: false,
    abortEarly: false,
    stripUnknown: true
});

if (error) {
    console.error('Configuration validation failed:');
    error.details.forEach(detail => {
        console.error(`  - ${detail.path.join('.')}: ${detail.message}`);
    });
    process.exit(1);
}

// Validate security configuration
try {
    if (!config.security.jwtSecret) {
        throw new Error('JWT_SECRET environment variable is required for security');
    }
    if (config.security.jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }
} catch (securityError) {
    console.error('Security configuration validation failed:');
    console.error(`  - ${securityError.message}`);
    process.exit(1);
}

// Export validated configuration
module.exports = config; 
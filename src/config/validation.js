const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Configuration validation schema
 */
const configSchema = Joi.object({
  // App configuration
  app: Joi.object({
    name: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    env: Joi.string().valid('development', 'production', 'test').required()
  }).required(),

  // Fal.ai configuration
  falai: Joi.object({
    apiKey: Joi.string().min(1).required(),
    baseUrl: Joi.string().uri().required(),
    timeout: Joi.number().integer().min(1000).max(300000).default(30000),
    maxRetries: Joi.number().integer().min(1).max(10).default(3),
    retryDelay: Joi.number().integer().min(100).max(10000).default(1000)
  }).required(),

  // Google AI configuration (optional for small deployments)
  google: Joi.object({
    apiKey: Joi.string().min(1).optional(),
    model: Joi.string().default('gemini-2.5-pro')
  }).optional(),

  // Slack configuration
  slack: Joi.object({
    botToken: Joi.string().min(1).required(),
    signingSecret: Joi.string().min(1).required(),
    appToken: Joi.string().min(1).optional()
  }).required(),

  // Redis configuration (flexible for small deployments)
  redis: Joi.object({
    host: Joi.string().default('localhost'),
    port: Joi.number().integer().min(1).max(65535).default(6379),
    password: Joi.string().allow('').optional(),
    db: Joi.number().integer().min(0).max(15).default(0),
    keyPrefix: Joi.string().default('slack-ai-bot:'),
    maxRetries: Joi.number().integer().min(1).max(10).default(3)
  }).optional(),

  // Session configuration
  session: Joi.object({
    timeout: Joi.number().integer().min(300000).max(7200000).default(7200000), // 5min to 2hrs
    cleanupInterval: Joi.number().integer().min(300000).max(3600000).default(3600000), // 5min to 1hr
    maxConcurrentSessions: Joi.number().integer().min(10).max(1000).default(50), // Reduced for small team
    storageType: Joi.string().valid('redis', 'memory').default('redis')
  }).default({
    timeout: 7200000,
    cleanupInterval: 3600000,
    maxConcurrentSessions: 50,
    storageType: 'redis'
  }),

  // Rate limiting (optimized for small team)
  rateLimit: Joi.object({
    windowMs: Joi.number().integer().min(60000).max(3600000).default(900000), // 1min to 1hr
    maxRequests: Joi.number().integer().min(10).max(200).default(100), // Increased for small team
    skipSuccessful: Joi.boolean().default(true)
  }).default({
    windowMs: 900000,
    maxRequests: 100,
    skipSuccessful: true
  }),

  // Logging configuration
  logging: Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    format: Joi.string().valid('json', 'simple').default('json'),
    file: Joi.string().optional()
  }).default({
    level: 'info',
    format: 'json'
  })
});

/**
 * Validate configuration
 */
function validateConfig(config) {
  try {
    const { error, value } = configSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const details = error.details.map(detail => ({
        path: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.error('Configuration validation failed', { details });
      throw new Error(`Configuration validation failed: ${JSON.stringify(details)}`);
    }

    logger.info('Configuration validated successfully');
    return value;
  } catch (error) {
    logger.error('Configuration validation error', { error: error.message });
    throw error;
  }
}

/**
 * Check required environment variables
 */
function checkRequiredEnvVars() {
  const requiredVars = [
    'FAL_KEY',
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(error);
    throw new Error(error);
  }

  // Check optional but recommended vars
  const recommendedVars = ['GOOGLE_API_KEY', 'REDIS_HOST', 'REDIS_PASSWORD'];
  const missingRecommended = recommendedVars.filter(varName => !process.env[varName]);
  
  if (missingRecommended.length > 0) {
    logger.warn(`Missing recommended environment variables: ${missingRecommended.join(', ')}`);
  }

  logger.info('All required environment variables are present');
}

/**
 * Validate environment-specific configuration
 */
function validateEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    // Production checks for small team deployment
    if (!process.env.REDIS_HOST) {
      logger.warn('Redis not configured for production - sessions will not persist across restarts');
    }
    
    if (process.env.LOG_LEVEL === 'debug') {
      logger.warn('Debug logging enabled in production - consider using info level');
    }

    // Check for basic security
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      logger.warn('JWT_SECRET should be at least 32 characters for production');
    }
  }
  
  logger.info(`Environment configuration validated for: ${env}`);
}

module.exports = {
  validateConfig,
  checkRequiredEnvVars,
  validateEnvironmentConfig
}; 
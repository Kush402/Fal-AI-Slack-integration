/**
 * @fileoverview MCP Session Manager - Core component for managing user sessions and context
 * @description This module handles session lifecycle, context storage, and workflow state tracking
 * for the Slack AI Asset Generator. Each session is isolated by user and thread ID.
 */

const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const config = require('../config');

class MCPSessionManager {
    constructor() {
        // Force Redis in production
        this.storageType = process.env.NODE_ENV === 'production' ? 'redis' : (config.session.storageType || 'redis');
        this.sessionTimeout = config.session.timeout || 7200000; // 2 hours
        this.maxConcurrentSessions = config.session.maxConcurrentSessions || 100;
        this.lockTimeout = 30000; // 30 seconds lock timeout
        this.lockRetryDelay = 100; // 100ms between lock retries
        this.maxLockRetries = 50; // Maximum retries for acquiring lock
        
        // Initialize storage based on type
        if (this.storageType === 'memory') {
            this.memoryStore = new Map();
            this.userSessionIndex = new Map();
            logger.info('MCP Session Manager: Using memory storage');
        } else {
            this.redis = new Redis({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                db: config.redis.db,
                keyPrefix: config.redis.keyPrefix,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true
            });
        }
        
        // Session state constants
        this.SESSION_STATES = {
            INITIALIZING: 'initializing',
            WAITING_FOR_CAMPAIGN: 'waiting_for_campaign',
            ENHANCING_CAMPAIGN: 'enhancing_campaign',
            SELECTING_OPERATION: 'selecting_operation',
            SELECTING_MODEL: 'selecting_model',
            CONFIGURING_PARAMETERS: 'configuring_parameters',
            GENERATING_ASSET: 'generating_asset',
            UPLOADING_ASSET: 'uploading_asset',
            COMPLETED: 'completed',
            ERROR: 'error'
        };

        // Initialize storage connection
        if (this.storageType === 'redis') {
            this.initializeRedis();
        }
        
        // Start session cleanup job
        this.startCleanupJob();
    }

    /**
     * Start periodic session cleanup job
     */
    startCleanupJob() {
        const cleanupInterval = config.session.cleanupInterval || 3600000; // 1 hour default
        
        this.cleanupInterval = setInterval(async () => {
            try {
                const cleanedCount = await this.cleanupExpiredSessions();
                if (cleanedCount > 0) {
                    logger.info(`Session cleanup: removed ${cleanedCount} expired sessions`);
                }
            } catch (error) {
                logger.error('Session cleanup job failed', error);
            }
        }, cleanupInterval);
        
        logger.info('Session cleanup job started', {
            interval: cleanupInterval,
            timeout: this.sessionTimeout
        });
    }

    /**
     * Stop cleanup job to prevent memory leaks
     */
    stopCleanupJob() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger.info('Session cleanup job stopped');
        }
    }

    /**
     * Cleanup expired sessions
     */
    async cleanupExpiredSessions() {
        const now = Date.now();
        let cleanedCount = 0;
        
        if (this.storageType === 'memory') {
            // Memory storage cleanup
            for (const [key, sessionData] of this.memoryStore) {
                try {
                    const session = JSON.parse(sessionData);
                    const lastActivity = new Date(session.lastActivity).getTime();
                    
                    if (now - lastActivity > this.sessionTimeout) {
                        this.memoryStore.delete(key);
                        
                        // Remove from user index
                        const userKey = `user:${session.userId}:sessions`;
                        if (this.userSessionIndex.has(userKey)) {
                            this.userSessionIndex.get(userKey).delete(key);
                        }
                        
                        cleanedCount++;
                        logger.debug('Cleaned up expired session', {
                            sessionId: session.sessionId,
                            userId: session.userId,
                            lastActivity: session.lastActivity
                        });
                    }
                } catch (error) {
                    logger.error('Error cleaning up session', { key, error: error.message });
                }
            }
        } else {
            // Redis storage cleanup
            try {
                // Get all session keys
                const keys = await this.redis.keys(`${config.redis.keyPrefix}session:*`);
                
                for (const key of keys) {
                    // Skip lock keys
                    if (key.includes(':lock:')) continue;
                    
                    const sessionData = await this.redis.get(key);
                    if (!sessionData) continue;
                    
                    try {
                        const session = JSON.parse(sessionData);
                        const lastActivity = new Date(session.lastActivity).getTime();
                        
                        if (now - lastActivity > this.sessionTimeout) {
                            // Use pipeline for atomic operations
                            const pipeline = this.redis.pipeline();
                            
                            // Delete session
                            pipeline.del(key);
                            
                            // Remove from user index
                            const userKey = `${config.redis.keyPrefix}user:${session.userId}:sessions`;
                            pipeline.srem(userKey, key);
                            
                            await pipeline.exec();
                            
                            cleanedCount++;
                            logger.debug('Cleaned up expired session', {
                                sessionId: session.sessionId,
                                userId: session.userId,
                                lastActivity: session.lastActivity
                            });
                        }
                    } catch (error) {
                        logger.error('Error parsing session data', { key, error: error.message });
                    }
                }
            } catch (error) {
                logger.error('Redis cleanup error', error);
                throw error;
            }
        }
        
        return cleanedCount;
    }

    /**
     * Check if session is expired
     */
    isSessionExpired(session) {
        if (!session || !session.lastActivity) return true;
        
        const lastActivity = new Date(session.lastActivity).getTime();
        const now = Date.now();
        
        return now - lastActivity > this.sessionTimeout;
    }

    /**
     * Acquire distributed lock for session operations
     * Prevents race conditions when multiple requests modify the same session
     */
    async acquireLock(userId, threadId, operation = 'update') {
        const lockKey = `lock:session:${userId}:${threadId}`;
        const lockValue = `${operation}-${uuidv4()}-${Date.now()}`;
        
        if (this.storageType === 'memory') {
            // For memory storage, use a simple in-memory lock
            const lockId = `${userId}:${threadId}`;
            if (this.memoryLocks && this.memoryLocks.has(lockId)) {
                return null; // Lock already held
            }
            
            if (!this.memoryLocks) this.memoryLocks = new Map();
            this.memoryLocks.set(lockId, { value: lockValue, timestamp: Date.now() });
            
            // Auto-release lock after timeout
            setTimeout(() => {
                if (this.memoryLocks && this.memoryLocks.get(lockId)?.value === lockValue) {
                    this.memoryLocks.delete(lockId);
                }
            }, this.lockTimeout);
            
            return lockValue;
        }
        
        // Redis distributed lock with retry logic
        for (let attempt = 0; attempt < this.maxLockRetries; attempt++) {
            try {
                const result = await this.redis.set(
                    lockKey, 
                    lockValue, 
                    'PX', this.lockTimeout, // Expire in milliseconds
                    'NX' // Only set if not exists
                );
                
                if (result === 'OK') {
                    logger.debug('Lock acquired', {
                        lockKey,
                        lockValue,
                        operation,
                        attempt: attempt + 1
                    });
                    
                    return lockValue;
                }
                
                // Wait before retrying
                if (attempt < this.maxLockRetries - 1) {
                    await this.delay(this.lockRetryDelay * (attempt + 1)); // Exponential backoff
                }
                
            } catch (error) {
                logger.error('Lock acquisition error', {
                    error: error.message,
                    lockKey,
                    operation,
                    attempt: attempt + 1
                });
                
                if (attempt === this.maxLockRetries - 1) {
                    throw new Error(`Failed to acquire lock after ${this.maxLockRetries} attempts`);
                }
            }
        }
        
        throw new Error('Lock acquisition timeout');
    }

    /**
     * Release distributed lock
     */
    async releaseLock(userId, threadId, lockValue) {
        const lockKey = `lock:session:${userId}:${threadId}`;
        
        if (this.storageType === 'memory') {
            const lockId = `${userId}:${threadId}`;
            if (this.memoryLocks && this.memoryLocks.get(lockId)?.value === lockValue) {
                this.memoryLocks.delete(lockId);
                return true;
            }
            return false;
        }
        
        // Redis lua script for atomic lock release
        const luaScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        
        try {
            const result = await this.redis.eval(luaScript, 1, lockKey, lockValue);
            
            logger.debug('Lock released', {
                lockKey,
                lockValue,
                result: result === 1 ? 'success' : 'failed'
            });
            
            return result === 1;
            
        } catch (error) {
            logger.error('Lock release error', {
                error: error.message,
                lockKey,
                lockValue
            });
            return false;
        }
    }

    /**
     * Execute operation with automatic lock acquisition and release
     */
    async withLock(userId, threadId, operation, callback) {
        const lockValue = await this.acquireLock(userId, threadId, operation);
        
        if (!lockValue) {
            throw new Error(`Session is locked by another operation`);
        }
        
        try {
            const result = await callback();
            return result;
            
        } finally {
            await this.releaseLock(userId, threadId, lockValue);
        }
    }

    /**
     * Delay utility for lock retries
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Initialize Redis connection and handle connection events
     */
    async initializeRedis() {
        try {
            await this.redis.connect();
            logger.info('MCP Session Manager: Redis connected successfully');
        } catch (error) {
            logger.error('MCP Session Manager: Redis connection failed', error);
            throw error;
        }

        this.redis.on('error', (error) => {
            logger.error('MCP Session Manager: Redis error', error);
        });

        this.redis.on('reconnecting', () => {
            logger.info('MCP Session Manager: Redis reconnecting...');
        });
    }

    /**
     * Get storage key for session
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @returns {string} Storage key
     */
    getStorageKey(userId, threadId) {
        return `user:${userId}:thread:${threadId}:session`;
    }

    /**
     * Get data from storage (Redis or memory)
     * @param {string} key - Storage key
     * @returns {Promise<string|null>} Stored data
     */
    async getFromStorage(key) {
        if (this.storageType === 'memory') {
            return this.memoryStore.get(key) || null;
        } else {
            return await this.redis.get(key);
        }
    }

    /**
     * Set data in storage (Redis or memory)
     * @param {string} key - Storage key
     * @param {string} value - Data to store
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<void>}
     */
    async setInStorage(key, value, ttl) {
        if (this.storageType === 'memory') {
            this.memoryStore.set(key, value);
            // Set timeout for memory storage
            if (ttl) {
                setTimeout(() => {
                    this.memoryStore.delete(key);
                }, ttl * 1000);
            }
        } else {
            await this.redis.setex(key, ttl, value);
        }
    }

    /**
     * Delete from storage (Redis or memory)
     * @param {string} key - Storage key
     * @returns {Promise<void>}
     */
    async deleteFromStorage(key) {
        if (this.storageType === 'memory') {
            this.memoryStore.delete(key);
        } else {
            await this.redis.del(key);
        }
    }

    /**
     * Add to set in storage (Redis or memory)
     * @param {string} key - Set key
     * @param {string} value - Value to add
     * @returns {Promise<void>}
     */
    async addToSet(key, value) {
        if (this.storageType === 'memory') {
            if (!this.userSessionIndex.has(key)) {
                this.userSessionIndex.set(key, new Set());
            }
            this.userSessionIndex.get(key).add(value);
        } else {
            await this.redis.sadd(key, value);
        }
    }

    /**
     * Remove from set in storage (Redis or memory)
     * @param {string} key - Set key
     * @param {string} value - Value to remove
     * @returns {Promise<void>}
     */
    async removeFromSet(key, value) {
        if (this.storageType === 'memory') {
            if (this.userSessionIndex.has(key)) {
                this.userSessionIndex.get(key).delete(value);
            }
        } else {
            await this.redis.srem(key, value);
        }
    }

    /**
     * Get set size in storage (Redis or memory)
     * @param {string} key - Set key
     * @returns {Promise<number>} Set size
     */
    async getSetSize(key) {
        if (this.storageType === 'memory') {
            return this.userSessionIndex.has(key) ? this.userSessionIndex.get(key).size : 0;
        } else {
            return await this.redis.scard(key);
        }
    }

    /**
     * Create a new session for a user
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @param {string} channelId - Slack channel ID
     * @param {Object} campaignData - Campaign information
     * @returns {Promise<Object>} Session object
     */
    async createSession(userId, threadId, channelId, campaignData = {}) {
        try {
            const sessionId = uuidv4();
            const sessionKey = this.getStorageKey(userId, threadId);
            
            // Check if session already exists
            const existingSession = await this.getFromStorage(sessionKey);
            if (existingSession) {
                logger.info(`MCP Session Manager: Session already exists for user ${userId} in thread ${threadId}`);
                return JSON.parse(existingSession);
            }

            // Check concurrent session limit
            const userSessionCount = await this.getUserSessionCount(userId);
            if (userSessionCount >= this.maxConcurrentSessions) {
                throw new Error(`User ${userId} has reached maximum concurrent sessions limit`);
            }

            const session = {
                sessionId,
                userId,
                threadId,
                channelId,
                // Store campaign data at top level for easy access
                clientName: campaignData.clientName || null,
                campaignIdea: campaignData.campaignIdea || null,
                creativeDirections: campaignData.creativeDirections || null,
                visualDirections: campaignData.visualDirections || null,
                state: this.SESSION_STATES.INITIALIZING,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                context: {
                    // Workflow data
                    enhancedPrompt: null,
                    selectedOperation: null,
                    selectedModel: null,
                    modelParameters: {},
                    generationHistory: [],
                    currentJob: null,
                    generatedAssets: [],
                    driveFolder: null
                },
                metadata: {
                    userAgent: null,
                    ipAddress: null,
                    sessionStartTime: Date.now(),
                    totalInteractions: 0,
                    errors: []
                }
            };

            // Store session with TTL
            await this.setInStorage(sessionKey, JSON.stringify(session), Math.ceil(this.sessionTimeout / 1000));
            
            // Add to user session index
            await this.addToUserSessionIndex(userId, sessionId);

            logger.info(`MCP Session Manager: Created new session ${sessionId} for user ${userId}`);
            return session;
        } catch (error) {
            logger.error('MCP Session Manager: Failed to create session', error);
            throw error;
        }
    }

    /**
     * Get existing session by user and thread ID
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @returns {Promise<Object|null>} Session object or null if not found
     */
    async getSession(userId, threadId) {
        try {
            const sessionKey = this.getStorageKey(userId, threadId);
            const sessionData = await this.getFromStorage(sessionKey);
            
            if (!sessionData) {
                logger.debug(`MCP Session Manager: No session found for user ${userId} in thread ${threadId}`);
                return null;
            }

            const session = JSON.parse(sessionData);
            
            // Check if session is expired
            if (this.isSessionExpired(session)) {
                logger.info(`MCP Session Manager: Session expired for user ${userId} in thread ${threadId}`, {
                    sessionId: session.sessionId,
                    lastActivity: session.lastActivity,
                    timeout: this.sessionTimeout
                });
                
                // Clean up expired session
                await this.deleteSession(userId, threadId);
                return null;
            }
            
            // Update last activity (but don't increment interactions for every getSession call)
            session.lastActivity = new Date().toISOString();
            
            await this.updateSession(session);
            
            return session;
        } catch (error) {
            logger.error('MCP Session Manager: Failed to get session', error);
            return null;
        }
    }

    /**
     * Track a user interaction (call this for actual user actions)
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @param {string} interactionType - Type of interaction (e.g., 'operation_selected', 'model_selected')
     * @returns {Promise<boolean>} Success status
     */
    async trackUserInteraction(userId, threadId, interactionType) {
        try {
            const session = await this.getSession(userId, threadId);
            if (!session) {
                logger.warn(`MCP Session Manager: Cannot track interaction - session not found for user ${userId}`);
                return false;
            }

            // Increment total interactions for actual user actions
            session.metadata.totalInteractions++;
            session.lastActivity = new Date().toISOString();

            // Log the interaction
            logger.info(`MCP Session Manager: User interaction tracked`, {
                sessionId: session.sessionId,
                userId,
                threadId,
                interactionType,
                totalInteractions: session.metadata.totalInteractions
            });

            await this.updateSession(session);
            return true;
        } catch (error) {
            logger.error('MCP Session Manager: Failed to track user interaction', error);
            return false;
        }
    }

    /**
     * Update session data
     * @param {Object} session - Session object to update
     * @returns {Promise<boolean>} Success status
     */
    async updateSession(session) {
        try {
            const sessionKey = this.getStorageKey(session.userId, session.threadId);
            session.lastActivity = new Date().toISOString();
            
            await this.setInStorage(sessionKey, JSON.stringify(session), Math.ceil(this.sessionTimeout / 1000));
            
            logger.debug(`MCP Session Manager: Updated session ${session.sessionId}`);
            return true;
        } catch (error) {
            logger.error('MCP Session Manager: Failed to update session', error);
            return false;
        }
    }

    /**
     * Update session state with distributed locking
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @param {string} newState - New session state
     * @returns {Promise<boolean>} Success status
     */
    async updateSessionState(userId, threadId, newState) {
        return await this.withLock(userId, threadId, 'state_update', async () => {
        try {
            const session = await this.getSession(userId, threadId);
            if (!session) {
                logger.warn(`MCP Session Manager: Cannot update state - session not found for user ${userId}`);
                return false;
            }

            const previousState = session.state;
            session.state = newState;
            session.lastActivity = new Date().toISOString();

            await this.updateSession(session);
            
            logger.info(`MCP Session Manager: Updated session ${session.sessionId} state: ${previousState} → ${newState}`);
            return true;
        } catch (error) {
            logger.error('MCP Session Manager: Failed to update session state', error);
            return false;
        }
        });
    }

    /**
     * Update session context
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @param {Object} contextUpdates - Context updates to apply
     * @returns {Promise<boolean>} Success status
     */
    async updateSessionContext(userId, threadId, contextUpdates) {
        return await this.withLock(userId, threadId, 'context_update', async () => {
        try {
            const session = await this.getSession(userId, threadId);
            if (!session) {
                logger.warn(`MCP Session Manager: Cannot update context - session not found for user ${userId}`);
                return false;
            }

            // Merge context updates with special handling for arrays
            const mergedContext = { ...session.context };
            
            for (const [key, value] of Object.entries(contextUpdates)) {
                if (key === 'generatedAssets' && Array.isArray(value)) {
                    // For generatedAssets, ensure we have an array and merge
                    const existingAssets = Array.isArray(mergedContext[key]) ? mergedContext[key] : [];
                    mergedContext[key] = [...existingAssets, ...value];
                } else {
                    // For other properties, use the new value
                    mergedContext[key] = value;
                }
            }
            
            session.context = mergedContext;
            session.lastActivity = new Date().toISOString();

            await this.updateSession(session);
            
            logger.debug(`MCP Session Manager: Updated context for session ${session.sessionId}`, contextUpdates);
            return true;
        } catch (error) {
            logger.error('MCP Session Manager: Failed to update session context', error);
            return false;
        }
        });
    }

    /**
     * Add error to session metadata
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @param {Object} error - Error object
     * @returns {Promise<boolean>} Success status
     */
    async addSessionError(userId, threadId, error) {
        try {
            const session = await this.getSession(userId, threadId);
            if (!session) {
                return false;
            }

            const errorEntry = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack,
                code: error.code || 'UNKNOWN_ERROR'
            };

            session.metadata.errors.push(errorEntry);
            session.state = this.SESSION_STATES.ERROR;
            
            await this.updateSession(session);
            
            logger.error(`MCP Session Manager: Added error to session ${session.sessionId}`, errorEntry);
            return true;
        } catch (err) {
            logger.error('MCP Session Manager: Failed to add session error', err);
            return false;
        }
    }

    /**
     * Delete session
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteSession(userId, threadId) {
        try {
            const session = await this.getSession(userId, threadId);
            if (!session) {
                return false;
            }

            const sessionKey = this.getStorageKey(userId, threadId);
            await this.deleteFromStorage(sessionKey);
            
            // Remove from user session index
            await this.removeFromUserSessionIndex(userId, session.sessionId);
            
            logger.info(`MCP Session Manager: Deleted session ${session.sessionId} for user ${userId}`);
            return true;
        } catch (error) {
            logger.error('MCP Session Manager: Failed to delete session', error);
            return false;
        }
    }

    /**
     * End session gracefully
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @returns {Promise<boolean>} Success status
     */
    async endSession(userId, threadId) {
        return await this.withLock(userId, threadId, 'session_end', async () => {
            try {
                const session = await this.getSession(userId, threadId);
                if (!session) {
                    logger.warn(`MCP Session Manager: Cannot end session - session not found for user ${userId}`);
                    return false;
                }

                // Update session state to completed
                session.state = this.SESSION_STATES.COMPLETED;
                session.lastActivity = new Date().toISOString();
                
                // Add completion metadata
                session.metadata.sessionEndTime = Date.now();
                session.metadata.sessionDuration = session.metadata.sessionEndTime - session.metadata.sessionStartTime;
                session.metadata.completedAt = new Date().toISOString();

                // Store final session state
                await this.updateSession(session);
                
                logger.info(`MCP Session Manager: Session ended successfully`, {
                    sessionId: session.sessionId,
                    userId: session.userId,
                    duration: session.metadata.sessionDuration,
                    totalInteractions: session.metadata.totalInteractions,
                    generatedAssets: session.context.generatedAssets.length,
                    clientName: session.context.clientName
                });

                // Clean up session after a delay to allow for final operations
                setTimeout(async () => {
                    await this.deleteSession(userId, threadId);
                }, 5000); // 5 second delay

                return true;
            } catch (error) {
                logger.error('MCP Session Manager: Failed to end session', error);
                return false;
            }
        });
    }

    /**
     * Get session summary for completion
     * @param {string} userId - Slack user ID
     * @param {string} threadId - Slack thread ID
     * @returns {Promise<Object|null>} Session summary
     */
    async getSessionSummary(userId, threadId) {
        try {
            const session = await this.getSession(userId, threadId);
            if (!session) {
                return null;
            }

            // Extract all unique operations and models used during the session
            const operationsUsed = new Set();
            const modelsUsed = new Set();
            
            // Add current operation and model
            if (session.context.selectedOperation) {
                operationsUsed.add(session.context.selectedOperation);
            }
            if (session.context.selectedModel) {
                modelsUsed.add(session.context.selectedModel);
            }
            
            // Extract operations and models from generated assets
            if (session.context.generatedAssets && Array.isArray(session.context.generatedAssets)) {
                session.context.generatedAssets.forEach(asset => {
                    if (asset.operation) {
                        operationsUsed.add(asset.operation);
                    }
                    if (asset.modelId) {
                        modelsUsed.add(asset.modelId);
                    }
                });
            }
            
            // Convert to arrays and format for display
            const operationsList = Array.from(operationsUsed);
            const modelsList = Array.from(modelsUsed);
            
            // Create formatted strings for display
            const operationsText = operationsList.length > 0 
                ? operationsList.map(op => op.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')
                : 'N/A';
            
            const modelsText = modelsList.length > 0 
                ? modelsList.map(model => {
                    // Extract model name from ID
                    const modelName = model.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return modelName;
                }).join(', ')
                : 'N/A';

            return {
                sessionId: session.sessionId,
                clientName: session.clientName || null,
                campaignIdea: session.campaignIdea || null,
                selectedOperation: session.context.selectedOperation,
                selectedModel: session.context.selectedModel,
                operationsUsed: operationsList,
                modelsUsed: modelsList,
                operationsText: operationsText,
                modelsText: modelsText,
                generatedAssets: session.context.generatedAssets.length,
                totalInteractions: session.metadata.totalInteractions,
                sessionDuration: Date.now() - session.metadata.sessionStartTime,
                state: session.state,
                driveFolder: session.context.driveFolder || null,
                driveAssets: session.context.generatedAssets.filter(asset => asset.driveUpload).length
            };
        } catch (error) {
            logger.error('MCP Session Manager: Failed to get session summary', error);
            return null;
        }
    }

    /**
     * Get all sessions for a user
     * @param {string} userId - Slack user ID
     * @returns {Promise<Array>} Array of session objects
     */
    async getUserSessions(userId) {
        try {
            const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
            const sessions = [];
            
            for (const sessionId of sessionIds) {
                const sessionKeys = await this.redis.keys(`*:${sessionId}:*`);
                for (const key of sessionKeys) {
                    const sessionData = await this.redis.get(key);
                    if (sessionData) {
                        sessions.push(JSON.parse(sessionData));
                    }
                }
            }
            
            return sessions;
        } catch (error) {
            logger.error('MCP Session Manager: Failed to get user sessions', error);
            return [];
        }
    }

    /**
     * Get session statistics
     * @returns {Promise<Object>} Session statistics
     */
    async getSessionStats() {
        try {
            if (this.storageType === 'memory') {
                const stats = {
                    totalSessions: 0,
                    stateDistribution: {},
                    avgSessionDuration: 0,
                    activeUsers: new Set()
                };

                for (const [key, sessionData] of this.memoryStore) {
                    if (key.includes(':session')) {
                        try {
                            const session = JSON.parse(sessionData);
                            stats.totalSessions++;
                            stats.stateDistribution[session.state] = (stats.stateDistribution[session.state] || 0) + 1;
                            stats.activeUsers.add(session.userId);
                        } catch (parseError) {
                            logger.error('Error parsing session data', { key, error: parseError.message });
                        }
                    }
                }

                stats.uniqueUsers = stats.activeUsers.size;
                delete stats.activeUsers;
                
                return stats;
            } else {
                // Redis storage
                if (!this.redis) {
                    logger.error('MCP Session Manager: Redis not initialized');
                    return {
                        totalSessions: 0,
                        stateDistribution: {},
                        avgSessionDuration: 0,
                        uniqueUsers: 0
                    };
                }

                const allKeys = await this.redis.keys('*:session:*');
                const stats = {
                    totalSessions: 0,
                    stateDistribution: {},
                    avgSessionDuration: 0,
                    activeUsers: new Set()
                };

                for (const key of allKeys) {
                    const sessionData = await this.redis.get(key);
                    if (sessionData) {
                        try {
                            const session = JSON.parse(sessionData);
                            stats.totalSessions++;
                            stats.stateDistribution[session.state] = (stats.stateDistribution[session.state] || 0) + 1;
                            stats.activeUsers.add(session.userId);
                        } catch (parseError) {
                            logger.error('Error parsing session data', { key, error: parseError.message });
                        }
                    }
                }

                stats.uniqueUsers = stats.activeUsers.size;
                delete stats.activeUsers;
                
                return stats;
            }
        } catch (error) {
            logger.error('MCP Session Manager: Failed to get session stats', error);
            return {
                totalSessions: 0,
                stateDistribution: {},
                avgSessionDuration: 0,
                uniqueUsers: 0
            };
        }
    }



    /**
     * Get session count for a user
     * @param {string} userId - Slack user ID
     * @returns {Promise<number>} Session count
     */
    async getUserSessionCount(userId) {
        try {
            return await this.getSetSize(`user:${userId}:sessions`);
        } catch (error) {
            logger.error('MCP Session Manager: Failed to get user session count', error);
            return 0;
        }
    }

    /**
     * Add session to user index
     * @param {string} userId - Slack user ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<void>}
     */
    async addToUserSessionIndex(userId, sessionId) {
        try {
            await this.addToSet(`user:${userId}:sessions`, sessionId);
        } catch (error) {
            logger.error('MCP Session Manager: Failed to add to user session index', error);
        }
    }

    /**
     * Remove session from user index
     * @param {string} userId - Slack user ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<void>}
     */
    async removeFromUserSessionIndex(userId, sessionId) {
        try {
            await this.removeFromSet(`user:${userId}:sessions`, sessionId);
        } catch (error) {
            logger.error('MCP Session Manager: Failed to remove from user session index', error);
        }
    }

    /**
     * Health check for Redis
     */
    async checkRedisHealth() {
        if (this.storageType !== 'redis') return { healthy: true, message: 'Not using Redis' };
        try {
            const pong = await this.redis.ping();
            return { healthy: pong === 'PONG', message: pong };
        } catch (err) {
            logger.error('Redis health check failed', err);
            return { healthy: false, message: err.message };
        }
    }

    /**
     * Close storage connection
     * @returns {Promise<void>}
     */
    async close() {
        try {
            // Stop cleanup job to prevent memory leaks
            this.stopCleanupJob();
            
            if (this.storageType === 'redis') {
                await this.redis.disconnect();
                logger.info('MCP Session Manager: Redis connection closed');
            } else {
                this.memoryStore.clear();
                this.userSessionIndex.clear();
                if (this.memoryLocks) {
                    this.memoryLocks.clear();
                }
                logger.info('MCP Session Manager: Memory storage cleared');
            }
            
            logger.info('MCP Session Manager: Cleanup completed');
        } catch (error) {
            logger.error('MCP Session Manager: Failed to close storage connection', error);
        }
    }
}

module.exports = MCPSessionManager; 
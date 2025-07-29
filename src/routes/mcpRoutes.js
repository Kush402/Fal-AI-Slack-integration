/**
 * @fileoverview MCP Routes - Express routes for handling MCP operations and Slack bot interactions
 * @description This module provides REST API endpoints for managing user sessions, workflow state,
 * and coordinating between Slack inputs and internal service calls.
 */

const express = require('express');
const { body } = require('express-validator'); // Keep body for now, though not used in new code
const MCPSessionManager = require('../utils/mcpSessionManager');
const CursorRulesEngine = require('../utils/cursorRulesEngine');
const { 
    validateSessionCreation, 
    validateAssetGeneration,
    validateRateLimit 
} = require('../middleware/validation');
const { timeoutMiddleware, withFalaiTimeout, operationMonitor } = require('../middleware/timeout');
const { authorizeSlackUser, validateSession } = require('../middleware/security');
// Import service factory for consistent service management
const { serviceFactory } = require('../services/ServiceFactory');
const logger = require('../utils/logger');
const config = require('../config');
const { uploadAssetToDrive, driveService } = require('../services/drive/driveUploadHelper');
const ResponseFormatter = require('../utils/responseFormatter');

// Import validation middleware
// Old validators removed - using new validation middleware directly on routes
const { asyncErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Initialize services
const sessionManager = new MCPSessionManager();
const rulesEngine = new CursorRulesEngine();

// Initialize ServiceFactory
        serviceFactory.initializeServices();

// Session management routes

/**
 * POST /session/create
 * Create a new MCP session
 */
router.post('/session/create', validateRateLimit, validateSessionCreation,
    asyncErrorHandler(async (req, res) => {
        const { userId, threadId, channelId, clientName, campaignIdea, creativeDirections, visualDirections } = req.body;
        logger.mcp(null, 'create_session', `Creating session for user ${userId}`, { userId, threadId, channelId, clientName, campaignIdea, creativeDirections, visualDirections });
        
        // Prepare campaign data
        const campaignData = {
            clientName,
            campaignIdea,
            creativeDirections,
            visualDirections
        };
        
        // Create session with campaign data
        const session = await sessionManager.createSession(userId, threadId, channelId || threadId, campaignData);
        
        // Create Google Drive folder for this session
        let driveFolder = null;
        try {
            driveFolder = await driveService.createSessionFolder(
                session.sessionId, 
                userId, 
                clientName || 'Campaign'
            );
            logger.drive('Session Drive folder created', {
                sessionId: session.sessionId,
                folderId: driveFolder.folderId,
                folderName: driveFolder.folderName
            });
        } catch (error) {
            logger.error('Failed to create Drive folder for session', {
                sessionId: session.sessionId,
                error: error.message
            });
            // Continue without Drive folder - session can still work
        }
        
        // Update session context with Drive folder info
        if (driveFolder) {
            await sessionManager.updateSessionContext(userId, threadId, {
                driveFolder: {
                    folderId: driveFolder.folderId,
                    folderName: driveFolder.folderName,
                    webViewLink: driveFolder.webViewLink
                }
            });
        }
        
        // Get available operations dynamically from cursor rules engine
        const operations = rulesEngine.getAvailableOperations();
        const availableOperations = Object.keys(operations).map(operationId => ({
            id: operationId,
            label: operations[operationId].name
        }));
        
        res.json(ResponseFormatter.success({
            session: {
                sessionId: session.sessionId,
                state: session.state,
                progress: rulesEngine.getWorkflowProgress(session.state),
                nextStep: rulesEngine.getNextStep(session.state, session.context),
                clientName,
                campaignIdea,
                creativeDirections,
                visualDirections,
                driveFolder: driveFolder ? {
                    folderId: driveFolder.folderId,
                    folderName: driveFolder.folderName,
                    webViewLink: driveFolder.webViewLink
                } : null
            },
            availableOperations
        }, {
            message: 'Session created successfully',
            sessionId: session.sessionId
        }));
    })
);

// Move the end session route here
router.post('/session/:userId/:threadId/end',
    asyncErrorHandler(async (req, res) => {
        const { userId, threadId } = req.params;
        
        const session = await sessionManager.getSession(userId, threadId);
        if (!session) {
            return res.status(404).json(ResponseFormatter.error('Session not found', {
                statusCode: 404,
                code: 'SESSION_NOT_FOUND'
            }));
        }
        // Get session summary before ending
        const summary = await sessionManager.getSessionSummary(userId, threadId);
        const success = await sessionManager.endSession(userId, threadId);
        if (success) {
            res.json(ResponseFormatter.success({
                sessionId: session.sessionId,
                summary: summary,
                message: 'Session ended successfully'
            }, {
                message: 'Session ended successfully',
                sessionId: session.sessionId,
                clientName: summary?.clientName,
                generatedAssets: summary?.generatedAssets || 0
            }));
        } else {
            res.status(500).json(ResponseFormatter.error('Failed to end session', {
                statusCode: 500,
                code: 'SESSION_END_FAILED',
                metadata: {
                    sessionId: session.sessionId
                }
            }));
        }
    })
);

/**
 * POST /session/:userId/:threadId/select-operation
 * Track operation selection
 */
router.post('/session/:userId/:threadId/select-operation',
    asyncErrorHandler(async (req, res) => {
        const { userId, threadId } = req.params;
        const { operation } = req.body;
        
        const session = await sessionManager.getSession(userId, threadId);
        if (!session) {
            return res.status(404).json(ResponseFormatter.error('Session not found', {
                statusCode: 404,
                code: 'SESSION_NOT_FOUND'
            }));
        }

        // Track the user interaction
        await sessionManager.trackUserInteraction(userId, threadId, 'operation_selected');
        
        // Update session context with selected operation
        const success = await sessionManager.updateSessionContext(userId, threadId, {
            selectedOperation: operation
        });

        if (success) {
            res.json(ResponseFormatter.success({
                operation,
                message: 'Operation selected successfully'
            }, {
                message: 'Operation selected successfully',
                sessionId: session.sessionId,
                operation
            }));
        } else {
            res.status(500).json(ResponseFormatter.error('Failed to select operation', {
                statusCode: 500,
                code: 'OPERATION_SELECTION_FAILED'
            }));
        }
    })
);

/**
 * POST /session/:userId/:threadId/select-model
 * Track model selection
 */
router.post('/session/:userId/:threadId/select-model',
    asyncErrorHandler(async (req, res) => {
        const { userId, threadId } = req.params;
        const { modelId, operation } = req.body;
        
        const session = await sessionManager.getSession(userId, threadId);
        if (!session) {
            return res.status(404).json(ResponseFormatter.error('Session not found', {
                statusCode: 404,
                code: 'SESSION_NOT_FOUND'
            }));
        }

        // Track the user interaction
        await sessionManager.trackUserInteraction(userId, threadId, 'model_selected');
        
        // Update session context with selected model
        const success = await sessionManager.updateSessionContext(userId, threadId, {
            selectedModel: modelId,
            selectedOperation: operation || session.context.selectedOperation
        });

        if (success) {
            res.json(ResponseFormatter.success({
                modelId,
                operation,
                message: 'Model selected successfully'
            }, {
                message: 'Model selected successfully',
                sessionId: session.sessionId,
                modelId,
                operation
            }));
        } else {
            res.status(500).json(ResponseFormatter.error('Failed to select model', {
                statusCode: 500,
                code: 'MODEL_SELECTION_FAILED'
            }));
        }
    })
);

/**
 * GET /session/:userId/:threadId
 * Get existing session
 */
router.get('/session/:userId/:threadId',
    asyncErrorHandler(async (req, res) => {
        const { userId, threadId } = req.params;
        
        const session = await sessionManager.getSession(userId, threadId);
        
        if (!session) {
            return res.status(404).json(ResponseFormatter.error('Session not found', {
                statusCode: 404,
                code: 'SESSION_NOT_FOUND'
            }));
        }
        
        res.json(ResponseFormatter.success({
            session: {
                sessionId: session.sessionId,
                state: session.state,
                progress: rulesEngine.getWorkflowProgress(session.state),
                context: session.context,
                nextStep: rulesEngine.getNextStep(session.state, session.context),
                // Include campaign data
                clientName: session.clientName,
                campaignIdea: session.campaignIdea,
                creativeDirections: session.creativeDirections,
                visualDirections: session.visualDirections
            }
        }, {
            message: 'Session retrieved successfully',
            sessionId: session.sessionId
        }));
    })
);

/**
 * PUT /session/:userId/:threadId/state
 * Update session state
 */
router.put('/session/:userId/:threadId/state',
    asyncErrorHandler(async (req, res) => {
        const { userId, threadId } = req.params;
        const { state } = req.body;
        
        const session = await sessionManager.getSession(userId, threadId);
        if (!session) {
            return res.status(404).json(ResponseFormatter.error('Session not found', {
                statusCode: 404,
                code: 'SESSION_NOT_FOUND'
            }));
        }
        
        // Validate state transition
        if (!rulesEngine.validateTransition(session.state, state, session.context)) {
            return res.status(400).json(ResponseFormatter.error(
                `Invalid state transition: ${session.state} → ${state}`, {
                    statusCode: 400,
                    code: 'INVALID_STATE_TRANSITION',
                    metadata: {
                        currentState: session.state,
                        targetState: state
                    }
                }
            ));
        }
        
        const success = await sessionManager.updateSessionState(userId, threadId, state);
        
        if (success) {
            res.json(ResponseFormatter.success({
                state,
                progress: rulesEngine.getWorkflowProgress(state),
                nextStep: rulesEngine.getNextStep(state, session.context)
            }, {
                message: 'Session state updated successfully',
                sessionId: session.sessionId,
                stateTransition: `${session.state} → ${state}`
            }));
        } else {
res.status(500).json(ResponseFormatter.error('Failed to update session state', {
                statusCode: 500,
                code: 'SESSION_UPDATE_FAILED',
                metadata: {
                    sessionId: session?.sessionId,
                    targetState: state
                }
            }));
        }
    })
);

/**
 * PUT /session/:userId/:threadId/context
 * Update session context
 */
router.put('/session/:userId/:threadId/context', 
    [
    ],
    asyncErrorHandler(async (req, res) => {
        const { userId, threadId } = req.params;
        const { context } = req.body;
        
        const session = await sessionManager.getSession(userId, threadId);
        if (!session) {
            return res.status(404).json(ResponseFormatter.error('Session not found', {
                statusCode: 404,
                code: 'SESSION_NOT_FOUND'
            }));
        }
        
        const success = await sessionManager.updateSessionContext(userId, threadId, context);
        
        if (success) {
            res.json(ResponseFormatter.success({
                context: session.context
            }, {
                message: 'Session context updated successfully',
                sessionId: session.sessionId
            }));
        } else {
            res.status(500).json(ResponseFormatter.error('Failed to update session context', {
                statusCode: 500,
                code: 'CONTEXT_UPDATE_FAILED',
                metadata: {
                    sessionId: session.sessionId
                }
            }));
        }
    })
);

/**
 * DELETE /session/:userId/:threadId
 * Delete session
 */
router.delete('/session/:userId/:threadId', 
    asyncErrorHandler(async (req, res) => {
        const { userId, threadId } = req.params;
        
        const success = await sessionManager.deleteSession(userId, threadId);
        
        if (success) {
            res.json(ResponseFormatter.success(null, {
                message: 'Session deleted successfully',
                code: 'SESSION_DELETED',
                metadata: { userId, threadId }
            }));
        } else {
            res.status(404).json(ResponseFormatter.error('Session not found', {
                statusCode: 404,
                code: 'SESSION_NOT_FOUND',
                metadata: { userId, threadId }
            }));
    }
    })
);

// Operations and models routes

/**
 * GET /operations
 * Get available operations
 */
router.get('/operations', asyncErrorHandler(async (req, res) => {
        const operations = rulesEngine.getAvailableOperations();
        
        res.json(ResponseFormatter.success({
            operations
        }, {
            message: 'Successfully retrieved available operations',
            code: 'OPERATIONS_RETRIEVED',
            count: operations.length
        }));
}));

/**
 * GET /models/:operationId
 * Get models for a specific operation
 */
router.get('/models/:operationId', 
    asyncErrorHandler(async (req, res) => {
        const { operationId } = req.params;
        
        const models = rulesEngine.getModelsForOperation(operationId);
        
        if (!models) {
            return res.status(404).json(ResponseFormatter.error('Operation not found', {
                statusCode: 404,
                code: 'OPERATION_NOT_FOUND',
                metadata: { operationId }
            }));
        }
        
        res.json(ResponseFormatter.success({
            operationId,
            models
        }, {
            message: `Successfully retrieved models for operation: ${operationId}`,
            code: 'MODELS_RETRIEVED',
            operationId,
            count: models.length
        }));
    })
);

/**
 * GET /model/:operationId/:modelId
 * Get specific model details
 */
router.get('/model/:operationId/:modelId', 
    asyncErrorHandler(async (req, res) => {
        const { operationId, modelId } = req.params;
        
        const model = rulesEngine.getModelDetails(operationId, modelId);
        
        if (!model) {
            return res.status(404).json(ResponseFormatter.error('Model not found', {
                statusCode: 404,
                code: 'MODEL_NOT_FOUND',
                metadata: { operationId, modelId }
            }));
        }
        
        res.json(ResponseFormatter.success({
            operationId,
            model
        }, {
            message: `Successfully retrieved model details: ${modelId}`,
            code: 'MODEL_DETAILS_RETRIEVED',
            operationId,
            modelId
        }));
    })
);

// Asset generation routes (text-to-image only)
router.post('/generate-asset', validateRateLimit, validateAssetGeneration, timeoutMiddleware,
    asyncErrorHandler(async (req, res) => {
        console.log('[DEBUG][route] Entered POST /api/generate-asset');
        const { userId, threadId, generationId, parameters } = req.body;
        console.log('[DEBUG][route] Request body:', JSON.stringify(req.body, null, 2));
        logger.mcp(userId, 'generate_asset', `Generating asset for user ${userId}`, { generationId, parameters });

        try {
        const session = await sessionManager.getSession(userId, threadId);
            console.log('[DEBUG][route] Loaded session:', JSON.stringify(session, null, 2));
        if (!session) {
                console.warn('[WARN][route] No session found for user/thread', { userId, threadId });
                return res.status(404).json(ResponseFormatter.error('Session not found', { statusCode: 404 }));
        }
        await sessionManager.updateSessionState(userId, threadId, 'generating_asset');
            await sessionManager.updateSessionContext(userId, threadId, { currentGeneration: { generationId, parameters, timestamp: new Date().toISOString() } });
            console.log('[DEBUG][route] Updated session state/context');

            // Support text-to-image and text-to-video
            let result, assetUrl;
            if (parameters.operation === 'text-to-audio') {
                console.log('[DEBUG][route] Routing to textToAudioService', { modelId: parameters.modelId, parameters });
                const textToAudioService = serviceFactory.getService('textToAudio');
                result = await textToAudioService.generateContent(parameters.modelId, parameters, { jobId: generationId });
                assetUrl = result.audioUrl;
            } else if (parameters.operation === 'text-to-speech') {
                console.log('[DEBUG][route] Routing to textToSpeechService', { modelId: parameters.modelId, parameters });
                const textToSpeechService = serviceFactory.getService('textToSpeech');
                result = await textToSpeechService.generateContent({ modelId: parameters.modelId, params: parameters }, { jobId: generationId });
                assetUrl = result.audio;
            } else if (parameters.operation === 'image-to-image') {
                console.log('[DEBUG][route] Routing to imageToImageService', { modelId: parameters.modelId, parameters });
                const imageToImageService = serviceFactory.getService('imageToImage');
                result = await imageToImageService.generateContent({ modelId: parameters.modelId, params: parameters }, { jobId: generationId });
                assetUrl = result.imageUrl;
            } else if (parameters.operation === 'text-to-video') {
                if (!parameters.prompt) {
                    console.warn('[WARN][route] Missing required field: prompt for text-to-video');
                    return res.status(400).json(ResponseFormatter.error('Missing required field: prompt', {
                        statusCode: 400,
                        code: 'MISSING_INPUT'
                    }));
                }
                    // text-to-video
                console.log('[DEBUG][route] Routing to textToVideoService', { modelId: parameters.modelId, parameters });
                    const textToVideoService = serviceFactory.getService('textToVideo');
                    result = await textToVideoService.generateContent(parameters.modelId || 'fal-ai/kling-video/v2/master/text-to-video', parameters, { jobId: generationId });
                    assetUrl = result.videoUrl;
                } else if (parameters.operation === 'image-to-video') {
                if (!parameters.prompt) {
                    console.warn('[WARN][route] Missing required field: prompt for image-to-video');
                    return res.status(400).json(ResponseFormatter.error('Missing required field: prompt', {
                        statusCode: 400,
                        code: 'MISSING_INPUT'
                    }));
                }
                    // image-to-video
                console.log('[DEBUG][route] Routing to imageToVideoService', { modelId: parameters.modelId, parameters });
                    const imageToVideoService = serviceFactory.getService('imageToVideo');
                    result = await imageToVideoService.generateContent(parameters.modelId, parameters, { jobId: generationId });
                    assetUrl = result.videoUrl;
            } else if (parameters.operation === 'video-to-video') {
                console.log('[DEBUG][route] Routing to videoToVideoService', { modelId: parameters.modelId, parameters });
                const videoToVideoService = serviceFactory.getService('videoToVideo');
                result = await videoToVideoService.generateContent({ modelId: parameters.modelId, params: parameters }, { jobId: generationId });
                assetUrl = result.videoUrl;
            } else if (parameters.operation === 'video-to-video' && parameters.modelId) {
                console.log('[DEBUG][route] Routing to videoToVideoService (fallback)', { modelId: parameters.modelId, parameters });
                const videoToVideoService = serviceFactory.getService('videoToVideo');
                result = await videoToVideoService.generateContent({ modelId: parameters.modelId, params: parameters }, { jobId: generationId });
                assetUrl = result.videoUrl;
            } else if (parameters.prompt) {
                // text-to-image (and any other prompt-based operation)
                console.log('[DEBUG][route] Routing to textToImageService', { parameters });
                    result = await serviceFactory.getService('textToImage').generate(parameters.prompt, parameters, session.sessionId);
                    assetUrl = result.assetUrl;
            } else if (parameters.operation === 'image-to-3d') {
                console.log('[DEBUG][route] Routing to imageTo3DService', { modelId: parameters.modelId, parameters });
                const imageTo3DService = serviceFactory.getService('imageTo3D');
                result = await imageTo3DService.generateContent({ modelId: parameters.modelId, params: parameters });
                
                // Determine primary asset URL based on available URLs
                let assetUrl = result.modelMeshUrl || result.modelGlbUrl || result.modelGlbPbrUrl || result.pbrModelUrl || result.baseModelUrl || result.remeshingDirUrl;
                let previewImageUrl = result.renderedImageUrl;
                
                // Always return all URLs for image-to-3d operations
                res.json({ 
                    success: true, 
                    data: { 
                        assetUrl, 
                        previewImageUrl, 
                        result 
                    } 
                });
                return;
            } else {
                console.warn('[WARN][route] Missing required field: prompt (fallback)');
                return res.status(400).json(ResponseFormatter.error('Missing required field: prompt', {
                    statusCode: 400,
                    code: 'MISSING_INPUT'
                }));
            }
            console.log('[DEBUG][route] Service result:', JSON.stringify(result, null, 2));
            await sessionManager.updateSessionState(userId, threadId, 'asset_generation_complete');
            
            // Upload asset to Google Drive if session has a Drive folder
            let driveUpload = null;
            if (assetUrl && session.context.driveFolder) {
                try {
                    console.log('[DEBUG][route] Starting Drive upload for asset:', assetUrl);
                    
                    // Generate filename based on operation and timestamp
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const operation = parameters.operation || 'unknown';
                    const modelId = parameters.modelId || 'unknown';
                    
                    // Determine correct file extension based on asset URL and operation type
                    let fileExtension = '.jpg'; // default
                    if (assetUrl) {
                        const urlLower = assetUrl.toLowerCase();
                        if (urlLower.includes('.png')) {
                            fileExtension = '.png';
                        } else if (urlLower.includes('.mp4') || urlLower.includes('.mov') || urlLower.includes('.avi') || urlLower.includes('video')) {
                            fileExtension = '.mp4';
                        } else if (urlLower.includes('.wav') || urlLower.includes('.mp3') || urlLower.includes('.ogg') || urlLower.includes('audio')) {
                            fileExtension = '.wav';
                        } else if (urlLower.includes('.glb') || urlLower.includes('.obj') || urlLower.includes('3d')) {
                            fileExtension = '.glb';
                        } else if (urlLower.includes('.webp')) {
                            fileExtension = '.webp';
                        } else if (urlLower.includes('.gif')) {
                            fileExtension = '.gif';
                        }
                    }
                    
                    // Override based on operation type for better accuracy
                    if (parameters.operation === 'image-to-video' || parameters.operation === 'text-to-video' || parameters.operation === 'video-to-video') {
                        fileExtension = '.mp4';
                    } else if (parameters.operation === 'text-to-audio' || parameters.operation === 'text-to-speech') {
                        fileExtension = '.wav';
                    } else if (parameters.operation === 'image-to-3d') {
                        fileExtension = '.glb';
                    }
                    
                    const fileName = `${operation}_${modelId.replace(/[\/\-]/g, '_')}_${timestamp}${fileExtension}`;
                    
                    // Upload to Drive
                    driveUpload = await uploadAssetToDrive(
                        session.context.driveFolder.folderId,
                        assetUrl,
                        fileName,
                        parameters.operation || 'image',
                        {
                            sessionId: session.sessionId,
                            userId: userId,
                            modelId: parameters.modelId,
                            operation: parameters.operation,
                            generationId: generationId,
                            prompt: parameters.prompt,
                            originalUrl: assetUrl
                        }
                    );
                    
                    console.log('[DEBUG][route] Drive upload successful:', {
                        fileId: driveUpload.fileId,
                        webViewLink: driveUpload.webViewLink,
                        fileName: driveUpload.fileName
                    });
                    
                    logger.drive('Asset uploaded to Drive successfully', {
                        sessionId: session.sessionId,
                        fileId: driveUpload.fileId,
                        fileName: driveUpload.fileName,
                        webViewLink: driveUpload.webViewLink,
                        modelId: parameters.modelId,
                        operation: parameters.operation
                    });
                    
                } catch (driveError) {
                    console.error('[ERROR][route] Drive upload failed:', driveError);
                    logger.error('Drive upload failed', {
                        sessionId: session.sessionId,
                        assetUrl: assetUrl,
                        error: driveError.message,
                        modelId: parameters.modelId,
                        operation: parameters.operation
                    });
                    // Continue without Drive upload - asset generation was successful
                }
            } else if (!session.context.driveFolder) {
                console.log('[DEBUG][route] No Drive folder found for session, skipping upload');
            }
            
            // Create the new asset object with Drive info
            const newAsset = {
                generationId,
                assetUrl,
                timestamp: new Date().toISOString(),
                operation: parameters.operation,
                modelId: parameters.modelId,
                driveUpload: driveUpload ? {
                    fileId: driveUpload.fileId,
                    fileName: driveUpload.fileName,
                    webViewLink: driveUpload.webViewLink,
                    webContentLink: driveUpload.webContentLink
                } : null
            };
            console.log('[DEBUG][route] New asset to add:', JSON.stringify(newAsset, null, 2));
            
            const contextUpdate = { 
                lastGeneration: { 
                    generationId, 
                    assetUrl, 
                    timestamp: new Date().toISOString(),
                    driveUpload: driveUpload ? {
                        fileId: driveUpload.fileId,
                        fileName: driveUpload.fileName,
                        webViewLink: driveUpload.webViewLink
                    } : null
                },
                generatedAssets: [newAsset] // Pass as array for merging
            };
            console.log('[DEBUG][route] Context update to apply:', JSON.stringify(contextUpdate, null, 2));
            
            const updateResult = await sessionManager.updateSessionContext(userId, threadId, contextUpdate);
            console.log('[DEBUG][route] Session context update result:', updateResult);
            
            console.log('[DEBUG][route] Updated session state/context after generation');
            
            // Return both fal.ai URL and Drive upload info
            return res.json({ 
                success: true, 
                data: { 
                    assetUrl, 
                    driveUpload: driveUpload ? {
                        fileId: driveUpload.fileId,
                        fileName: driveUpload.fileName,
                        webViewLink: driveUpload.webViewLink,
                        webContentLink: driveUpload.webContentLink,
                        folderId: session.context.driveFolder?.folderId,
                        folderName: session.context.driveFolder?.folderName
                    } : null,
                    result 
                } 
            });
        } catch (err) {
            logger.error('[MCP:generate_asset] Error generating asset', err);
            console.error('[ERROR][route] Error details:', err && err.stack ? err.stack : err);
            return res.status(500).json(ResponseFormatter.error('Asset generation failed', { statusCode: 500, code: 'GENERATION_FAILED' }));
    }
    })
);

// Session statistics routes

/**
 * GET /stats
 * Get session statistics
 */
router.get('/stats', asyncErrorHandler(async (req, res) => {
        const stats = await sessionManager.getSessionStats();
        const workflowSummary = rulesEngine.getWorkflowSummary();
        
        res.json(ResponseFormatter.success({
            stats: {
                ...stats,
                ...workflowSummary
            }
        }, {
            message: 'Session statistics retrieved successfully',
            code: 'STATS_RETRIEVED',
            statsType: 'session_summary'
        }));
}));

/**
 * GET /user/:userId/sessions
 * Get all sessions for a user
 */
router.get('/user/:userId/sessions', 
    asyncErrorHandler(async (req, res) => {
        const { userId } = req.params;
        
        const sessions = await sessionManager.getUserSessions(userId);
        
        res.json(ResponseFormatter.success({
            sessions: sessions.map(session => ({
                sessionId: session.sessionId,
                threadId: session.threadId,
                channelId: session.channelId,
                state: session.state,
                progress: rulesEngine.getWorkflowProgress(session.state),
                createdAt: session.createdAt,
                lastActivity: session.lastActivity
            }))
        }, {
            message: `Retrieved ${sessions.length} sessions for user`,
            code: 'USER_SESSIONS_RETRIEVED',
            userId: req.params.userId,
            count: sessions.length
        }));
    })
);

// Health check and utility routes

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', asyncErrorHandler(async (req, res) => {
    try {
        // Check Redis connection
        const redisStats = await sessionManager.getSessionStats();
        
        res.json(ResponseFormatter.success({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                redis: redisStats ? 'connected' : 'disconnected',
                gemini: 'available',
                rulesEngine: 'loaded'
            }
        }, {
            message: 'Service health check completed',
            code: 'HEALTH_CHECK_COMPLETE',
            status: 'healthy'
        }));
    } catch (error) {
        logger.error('MCP Routes: Health check failed', error);
        res.status(500).json({
            success: false,
            health: {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            }
        });
    }
}));

// Redis health check endpoint
router.get('/redis-health', asyncErrorHandler(async (req, res) => {
    const health = await sessionManager.checkRedisHealth();
    if (health.healthy) {
        res.json(ResponseFormatter.success({
            status: 'healthy',
            message: health.message
        }, {
            code: 'REDIS_HEALTHY',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.status(500).json(ResponseFormatter.error(health.message, {
            statusCode: 500,
            code: 'REDIS_UNHEALTHY',
            timestamp: new Date().toISOString()
        }));
    }
}));

// Error handling middleware
router.use((error, req, res, next) => {
    logger.error('MCP Routes: Unhandled error', error);
    res.status(500).json(ResponseFormatter.error('Internal server error', {
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    }));
});

// 404 handler should be last
router.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

module.exports = router; 
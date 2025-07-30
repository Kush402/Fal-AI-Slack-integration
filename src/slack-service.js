/**
 * @fileoverview Standalone Slack Bot Service - Communicates with Backend API
 * @description Slack bot service that handles Slack interactions and calls the backend API
 */

// Global error handlers
process.on('uncaughtException', (error) => {
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    process.exit(1);
});

process.on('warning', (warning) => {
    // Warning handling - no console output in production
});

const { App } = require('@slack/bolt');
const axios = require('axios');

// Import configuration and utilities with error handling
let config, logger;

try {
    config = require('./config');
} catch (error) {
    process.exit(1);
}

try {
    logger = require('./utils/logger');
} catch (error) {
    process.exit(1);
}

// Import utilities
const logManager = require('./utils/logManager');
const portManager = require('./utils/portManager');

// Add import at the top
const textToVideoModalParams = require('./services/falai/textToVideoService/textToVideoModalParams');
const imageToVideoModalParams = require('./services/falai/imageToVideoService/imageToVideoModalParams');
const textToAudioModalParams = require('./services/falai/textToAudioService/textToAudioModalParams');
const textToSpeechModalParams = require('./services/falai/textToSpeechService/textToSpeechModalParams');
const imageToImageModalParams = require('./services/falai/imageToImageService/imageToImageModalParams');
const videoToVideoModalParams = require('./services/falai/videoToVideoService/videoToVideoModalParams');

// Helper for boolean (checkboxes) block with debug logs
function buildCheckboxBlock(paramName, paramConfig, blockId, actionId) {
  const options = [
    {
      text: {
        type: 'plain_text',
        text: `Enable ${paramName}`
      },
      value: 'true'
    }
  ];
  
  // Create label with optional indicator
  const labelText = paramName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const isRequired = paramConfig.required === true;
  const displayLabel = isRequired ? labelText : `${labelText} (Optional)`;
  
  // Use section block with accessory to avoid validation
  const block = {
    type: 'section',
    block_id: blockId,
    text: {
      type: 'mrkdwn',
      text: `*${displayLabel}*${isRequired ? ' (Required)' : ' (Optional)'}`
    },
    accessory: {
      type: 'checkboxes',
      action_id: actionId,
      options
    }
  };
  
  // Only add initial_options if default is true
  if (paramConfig.default === true) {
    block.accessory.initial_options = [options[0]];
  }
  
  // Debug log
  console.log(`[DEBUG][Modal] Checkbox field '${paramName}' options:`, JSON.stringify(options, null, 2));
  console.log(`[DEBUG][Modal] Checkbox field '${paramName}' initial_options:`, JSON.stringify(block.accessory.initial_options || [], null, 2));
  
  return block;
}

// Helper for static_select block with debug logs
function buildStaticSelectBlock(paramName, paramConfig, blockId, actionId) {
  const options = (paramConfig.options || []).map(opt => ({
    text: { type: 'plain_text', text: opt },
    value: opt
  }));
  
  // Create label with optional indicator
  const labelText = paramName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const isRequired = paramConfig.required === true;
  const displayLabel = isRequired ? labelText : `${labelText} (Optional)`;
  
  const block = {
    type: 'section',
    block_id: blockId,
    text: {
      type: 'mrkdwn',
      text: `*${displayLabel}*${isRequired ? ' (Required)' : ' (Optional)'}`
    },
    accessory: {
      type: 'static_select',
      action_id: actionId,
      options,
      placeholder: {
        type: 'plain_text',
        text: `Select ${paramName}...`
      }
    }
  };
  
  // Only add initial_option if there's a default value
  if (paramConfig.default !== undefined) {
    const initial_option = options.find(opt => opt.value === paramConfig.default);
    if (initial_option) {
      block.accessory.initial_option = initial_option;
    }
  }
  
  // Debug log
  console.log(`[DEBUG][Modal] Select field '${paramName}' options:`, JSON.stringify(options, null, 2));
  console.log(`[DEBUG][Modal] Select field '${paramName}' initial_option:`, JSON.stringify(block.accessory.initial_option || 'undefined', null, 2));
  
  return block;
}

// Unified parameter modal builder for all operations
function buildParameterBlocksFromModelConfig(modelConfig) {
  const blocks = [];
  if (!modelConfig || !modelConfig.parameters) return blocks;
  
  console.log('[DEBUG][Modal] Building parameter blocks from modelConfig:', JSON.stringify(modelConfig.parameters, null, 2));
  
  Object.entries(modelConfig.parameters).forEach(([paramName, paramConfig], idx) => {
    const blockId = `${paramName}_block`;
    const actionId = paramName;
    
    console.log(`[DEBUG][Modal] Processing param '${paramName}':`, JSON.stringify(paramConfig, null, 2));
    
    // Create label with optional indicator
    const labelText = paramName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const isRequired = paramConfig.required === true;
    const displayLabel = isRequired ? labelText : `${labelText} (Optional)`;
    
    try {
      if (paramConfig.type === 'array' && paramName === 'image_urls') {
        // Special handling for image_urls: multi-line input
        blocks.push({
          type: 'input',
          block_id: blockId,
          optional: false, // First image URL is required
          label: {
            type: 'plain_text',
            text: 'Image URLs (first required, others optional)'
          },
          element: {
            type: 'plain_text_input',
            action_id: actionId,
            placeholder: {
              type: 'plain_text',
              text: 'Paste the required first image URL on the first line. Add more URLs (optional) on new lines or separated by commas.'
            },
            multiline: true
          }
        });
      } else if (paramConfig.type === 'boolean') {
        console.log(`[DEBUG][Modal] Building checkbox for '${paramName}'`);
        const options = [
          {
            text: {
              type: 'plain_text',
              text: `Enable ${paramName}`
            },
            value: 'true'
          }
        ];
        
        const block = {
          type: 'input',
          block_id: blockId,
          optional: !isRequired, // true for optional, false for required
          label: {
            type: 'plain_text',
            text: displayLabel
          },
          element: {
            type: 'checkboxes',
            action_id: actionId,
            options
          }
        };
        
        if (paramConfig.default === true) {
          block.element.initial_options = [options[0]];
        }
        
        blocks.push(block);
      } else if (paramConfig.type === 'string' && paramConfig.options) {
        console.log(`[DEBUG][Modal] Building static_select for '${paramName}'`);
        const options = (paramConfig.options || []).map(opt => ({
          text: { type: 'plain_text', text: opt },
          value: opt
        }));
        
        const block = {
          type: 'input',
          block_id: blockId,
          optional: !isRequired, // true for optional, false for required
          label: {
            type: 'plain_text',
            text: displayLabel
          },
          element: {
            type: 'static_select',
            action_id: actionId,
            options,
            placeholder: {
              type: 'plain_text',
              text: `Select ${paramName}...`
            }
          }
        };
        
        if (paramConfig.default !== undefined) {
          const initial_option = options.find(opt => opt.value === paramConfig.default);
          if (initial_option) {
            block.element.initial_option = initial_option;
          }
        }
        
        blocks.push(block);
      } else if (paramConfig.type === 'number') {
        console.log(`[DEBUG][Modal] Building number_input for '${paramName}'`);
        blocks.push({
          type: 'input',
          block_id: blockId,
          optional: !isRequired, // true for optional, false for required
          label: {
            type: 'plain_text',
            text: displayLabel
          },
          element: {
            type: 'number_input',
            action_id: actionId,
            placeholder: {
              type: 'plain_text',
              text: `Enter ${paramName}...`
            },
            is_decimal_allowed: true
          }
        });
      } else {
        console.log(`[DEBUG][Modal] Building plain_text_input for '${paramName}'`);
        
        blocks.push({
          type: 'input',
          block_id: blockId,
          optional: !isRequired, // true for optional, false for required
          label: {
            type: 'plain_text',
            text: displayLabel
          },
          element: {
            type: 'plain_text_input',
            action_id: actionId,
            placeholder: {
              type: 'plain_text',
              text: `Enter ${paramName}...`
            },
            multiline: false
          }
        });
      }
    } catch (err) {
      console.error(`[ERROR][Modal] Failed to build block for param '${paramName}':`, err);
    }
  });
  
  console.log(`[DEBUG][Modal] Built ${blocks.length} parameter blocks`);
  return blocks;
}

// Defensive assertion before modal submission
function assertReferentialEquality(blocks) {
  for (const block of blocks) {
    // Handle input blocks (all fields now use input blocks)
    if (block.element?.type === 'checkboxes' && block.element.initial_options) {
      block.element.initial_options.forEach(init => {
        const match = block.element.options.find(o => o.value === init.value);
        if (!match || match.text.text !== init.text.text || match !== init) {
          throw new Error(`Invalid checkbox initial_option in block ${block.block_id}`);
        }
      });
    }
    if (block.element?.type === 'static_select' && block.element.initial_option) {
      const match = block.element.options.find(o => o.value === block.element.initial_option.value);
      if (!match || match.text.text !== block.element.initial_option.text.text || match !== block.element.initial_option) {
        throw new Error(`Invalid static_select initial_option in block ${block.block_id}`);
      }
    }
  }
}

// Unified parameter extraction from modal values using modelConfig
function extractParametersFromModal(values, modelConfig) {
  const parameters = {};
  if (!modelConfig || !modelConfig.parameters) return parameters;
  
  console.log('[DEBUG][extractParametersFromModal] values:', JSON.stringify(values, null, 2));
  console.log('[DEBUG][extractParametersFromModal] modelConfig:', JSON.stringify(modelConfig, null, 2));
  
  Object.entries(modelConfig.parameters).forEach(([paramName, paramConfig]) => {
    const blockId = `${paramName}_block`;
    const blockValue = values[blockId];
    let extractedValue = undefined;

    // --- Normalization for Slack modal field types ---
    let type = paramConfig.type;
    if (type === 'plain_text_input') type = 'string';
    if (type === 'static_select') type = 'string';
    if (type === 'number_input') type = 'number';
    if (type === 'checkbox') type = 'boolean';
    // -------------------------------------------------
    
    if (!blockValue || !blockValue[paramName]) {
      if (paramConfig.required) {
        console.warn(`[WARN][extractParametersFromModal] Missing required field: ${paramName} (blockId: ${blockId})`);
      }
      if (!paramConfig.required && paramConfig.default !== undefined) {
        parameters[paramName] = paramConfig.default;
      }
      return;
    }
    const inputValue = blockValue[paramName];
    console.log(`[DEBUG][extractParametersFromModal] Extracting param: ${paramName}, inputValue:`, JSON.stringify(inputValue, null, 2));

    // Special handling for array fields (like ref_image_urls, images, videos, motions)
    if (type === 'array' && paramName === 'image_urls') {
      const raw = inputValue.value || '';
      extractedValue = raw
        .split(/\n|,/) // split by newline or comma
        .map(s => s.trim())
        .filter(Boolean);
      if (!extractedValue[0]) {
        throw new Error('The first image URL is required for image_urls.');
      }
      parameters[paramName] = extractedValue;
    } else if (type === 'array' || paramName === 'ref_image_urls' || paramName === 'images' || paramName === 'videos' || paramName === 'motions') {
      const raw = inputValue.value || '';
      extractedValue = raw
        .split(/,/) // split by comma
        .map(s => s.trim())
        .filter(Boolean);
      if (extractedValue.length > 0) {
        parameters[paramName] = extractedValue;
      }
    } else if (type === 'string' && paramConfig.options) {
      extractedValue = inputValue.selected_option?.value;
    } else if (type === 'string') {
      extractedValue = inputValue.value?.trim();
    } else if (type === 'number') {
      extractedValue = inputValue.value !== undefined && inputValue.value !== '' ? parseFloat(inputValue.value) : undefined;
      if ((extractedValue === undefined || isNaN(extractedValue)) && !paramConfig.required && paramConfig.default !== undefined) {
        extractedValue = paramConfig.default;
      }
    } else if (type === 'boolean') {
      extractedValue = inputValue.selected_options && inputValue.selected_options.length > 0;
    }
    if (extractedValue !== undefined && extractedValue !== null && extractedValue !== '') {
      parameters[paramName] = extractedValue;
      console.log(`[DEBUG][extractParametersFromModal] Set param: ${paramName} =`, extractedValue);
    } else if (!paramConfig.required && paramConfig.default !== undefined) {
      parameters[paramName] = paramConfig.default;
      console.log(`[DEBUG][extractParametersFromModal] Set param: ${paramName} (default) =`, paramConfig.default);
    }
  });
  console.log('[DEBUG][extractParametersFromModal] Final parameters:', JSON.stringify(parameters, null, 2));
  return parameters;
}

class SlackBotService {
    constructor() {
        logger.info('Initializing Slack Bot Service');
        
        // Backend API configuration
        this.backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
        this.apiTimeout = 30000; // 30 seconds
        
        // Store trigger ID for modal interactions
        this.lastTriggerId = null;
        
        // Cache for model configurations
        this.modelCache = {};
        
        // Store user session data for modal interactions
        this.userSessions = new Map();
        
        // Prevent duplicate operation processing
        this.processingOperations = new Set();
        
        logger.info('Backend API URL configured', { backendUrl: this.backendUrl });
        
        try {
            this.app = new App({
                token: config.slack.botToken,
                signingSecret: config.slack.signingSecret,
                socketMode: config.slack.socketMode,
                appToken: config.slack.appToken,
                port: process.env.SLACK_PORT || 3001
            });
            logger.info('Slack App instance created successfully');
        } catch (error) {
            logger.error('Failed to create Slack App instance', error);
            throw error;
        }

        try {
            this.setupSlackHandlers();
            logger.info('Slack handlers setup complete');
        } catch (error) {
            logger.error('Failed to setup Slack handlers', error);
            throw error;
        }

        // Setup axios instance for API calls
        this.apiClient = axios.create({
            baseURL: this.backendUrl,
            timeout: 1200000, // increased timeout to 20 minutes for long-running asset generation
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'slack-bot-service/1.0.0'
            }
        });

        // Setup axios interceptors
        this.setupApiInterceptors();

        logger.info('Slack Bot Service initialization complete');
    }

    /**
     * Setup axios interceptors for API communication
     */
    setupApiInterceptors() {
        // Request interceptor
        this.apiClient.interceptors.request.use(
            (config) => {
                logger.http('Backend API Request', {
                    method: config.method?.toUpperCase(),
                    url: config.url,
                    data: config.data ? Object.keys(config.data) : null
                });
                return config;
            },
            (error) => {
                logger.error('Backend API Request Error', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.apiClient.interceptors.response.use(
            (response) => {
                logger.http('Backend API Response', {
                    status: response.status,
                    url: response.config.url,
                    duration: response.headers['x-response-time']
                });
                return response;
            },
            (error) => {
                logger.error('Backend API Response Error', {
                    status: error.response?.status,
                    url: error.config?.url,
                    message: error.message
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Setup Slack command and interaction handlers
     */
    setupSlackHandlers() {
        // Handle campaign collection modal submission
        this.app.view('campaign_collection_modal', async ({ ack, body, view, client }) => {
            try {
                await ack();
                
                const userId = body.user.id;
                const channelId = body.view.private_metadata || this.userSessions.get(userId)?.channelId;
                const values = view.state.values;
                
                // Extract and validate form data
                const clientName = values.client_name_block?.client_name_input?.value?.trim();
                const campaignIdea = values.campaign_idea_block?.campaign_idea_input?.value?.trim() || '';
                const creativeDirections = values.creative_directions_block?.creative_directions_input?.value?.trim() || '';
                const visualDirections = values.visual_directions_block?.visual_directions_input?.value?.trim() || '';
                
                // Validate required fields
                if (!clientName || clientName.length === 0) {
                    logger.error('Campaign modal submission failed: Missing client name', {
                        userId,
                        channelId,
                        hasClientName: !!clientName,
                        clientNameLength: clientName ? clientName.length : 0
                    });
                    
                    // Send error message to user
                    if (channelId) {
                        await client.chat.postMessage({
                            channel: channelId,
                            text: `❌ *Validation Error*\nClient name is required. Please try again with a valid client name.`
                        });
                    }
                    return;
                }
                
                // Sanitize and prepare campaign data
                const campaignData = {
                    clientName: clientName,
                    campaignIdea: campaignIdea,
                    creativeDirections: creativeDirections,
                    visualDirections: visualDirections
                };

                logger.slack(userId, 'Campaign data collected and validated', {
                    clientName: campaignData.clientName,
                    hasCampaignIdea: !!campaignData.campaignIdea,
                    hasCreativeDirections: !!campaignData.creativeDirections,
                    hasVisualDirections: !!campaignData.visualDirections
                });

                // Update user session with channel ID if not already stored
                if (channelId && !this.userSessions.get(userId)) {
                    this.userSessions.set(userId, {
                        channelId,
                        timestamp: Date.now()
                    });
                    logger.slack(userId, 'Channel ID stored in user session from modal', {
                        channelId,
                        sessionData: this.userSessions.get(userId)
                    });
                }

                // Create session via backend API
                await this.createSession(userId, channelId, campaignData, client);

            } catch (error) {
                logger.error('Campaign modal submission failed', error);
                
                // Send error message to user if channel is available
                const channelId = body.view.private_metadata || this.userSessions.get(body.user.id)?.channelId;
                if (channelId) {
                    try {
                        await client.chat.postMessage({
                            channel: channelId,
                            text: `❌ *Error*\nSorry, there was an issue processing your request. Please try again.`
                        });
                    } catch (postError) {
                        logger.error('Failed to send error message to user', postError);
                    }
                }
            }
        });

        // Handle operation confirmation
        this.app.action('confirm_operation', async ({ ack, body, client }) => {
            try {
                await ack();
                
                const userId = body.user.id;
                const selectedOperation = this.pendingOperations?.[userId];
                
                if (!selectedOperation) {
                    await client.chat.postEphemeral({
                        channel: body.channel.id,
                        user: userId,
                        text: '❌ Please select an operation first.'
                    });
                    return;
                }
                
                await this.selectOperation(userId, body.channel.id, selectedOperation, client);
                
                // Clear the pending operation
                delete this.pendingOperations[userId];

            } catch (error) {
                logger.error('Operation confirmation failed', error);
            }
        });

        // Model selection handlers
        this.app.action('select_model', async ({ ack, body, client }) => {
            console.log('[DEBUG][handler] Entered select_model action handler');
            try {
                await ack();
                
                const userId = body.user.id;
                const channelId = body.channel.id;
                const modelId = body.actions[0].selected_option.value;
                
                logger.slack(userId, 'Model selected', {
                    modelId,
                    channelId
                });

                // Store trigger ID for modal opening
                this.lastTriggerId = body.trigger_id;
                
                await this.selectModel(userId, channelId, modelId, client);

            } catch (error) {
                logger.error('Model selection failed', error);
            }
        });

        // Operation selection handlers
        this.app.action(/select_operation_(.+)/, async ({ ack, body, client }) => {
            let processingKey = null;
            try {
                await ack();
                
                const userId = body.user.id;
                const channelId = body.channel.id;
                const operation = body.actions[0].value;
                
                // Prevent duplicate processing
                processingKey = `${userId}-${channelId}-${operation}`;
                if (this.processingOperations && this.processingOperations.has(processingKey)) {
                    logger.debug('Operation already being processed, skipping', { userId, operation });
                    return;
                }
                
                if (!this.processingOperations) this.processingOperations = new Set();
                this.processingOperations.add(processingKey);
                
                logger.slack(userId, 'Operation selected', {
                    operation,
                    channelId
                });
                
                await this.selectOperation(userId, channelId, operation, client);
                
                // Remove from processing set after completion
                this.processingOperations.delete(processingKey);

            } catch (error) {
                logger.error('Operation selection failed', error);
                // Remove from processing set on error
                if (this.processingOperations && processingKey) {
                    this.processingOperations.delete(processingKey);
                }
            }
        });

        // Handle parameter configuration modal submission
        this.app.view('parameter_configuration_modal', async ({ ack, body, view, client }) => {
            console.log('[DEBUG][handler] Entered parameter_configuration_modal view handler');
            await ack();
            
            const userId = body.user.id;
            const values = view.state.values;
            console.log('[DEBUG][parameter_configuration_modal] Modal submission values:', JSON.stringify(values, null, 2));
            
            // Get channel ID from stored user session
            const userSession = this.userSessions.get(userId);
            let channelId = null;
            
            try {
                
                if (userSession && userSession.channelId) {
                    channelId = userSession.channelId;
                    logger.slack(userId, 'Retrieved channel ID from user session', {
                        channelId,
                        sessionAge: Date.now() - userSession.timestamp
                    });
                } else {
                    // Fallback to private_metadata if session not available
                    channelId = body.private_metadata || view.private_metadata;
                    logger.warn('No user session found, using private_metadata fallback', {
                        userId,
                        hasUserSession: !!userSession,
                        privateMetadata: body.private_metadata || view.private_metadata
                    });
                }
                
                logger.slack(userId, 'Parameter modal submitted', {
                    channelId,
                    hasValues: !!values,
                    valueKeys: values ? Object.keys(values) : [],
                    hasUserSession: !!userSession
                });
                
                // Validate channel ID
                if (!channelId) {
                    logger.error('No channel ID available for parameter submission', {
                        userId,
                        hasUserSession: !!userSession,
                        privateMetadata: body.private_metadata || view.private_metadata
                    });
                    throw new Error('No channel ID available for parameter submission');
                }
                
                let modelConfigForExtraction = userSession && userSession.modelConfig;
                if (!modelConfigForExtraction) {
                    logger.error('No modelConfig found in user session for parameter extraction', { userId, userSession });
                    throw new Error('No modelConfig found for parameter extraction');
                }
                const parameters = extractParametersFromModal(values, modelConfigForExtraction);
                
                logger.slack(userId, 'Parameters extracted', {
                    parameterCount: Object.keys(parameters).length,
                    parameters: parameters
                });
                
                // Post parameter summary to chat
                await this.postParameterSummaryToChat(userId, channelId, parameters, client);
                
                // Submit generation request
                await this.submitGeneration(userId, channelId, parameters, client);
                
                // Keep user session alive for continued operations
                // Session will be cleaned up when user types /end or session times out
                logger.slack(userId, 'Generation completed, session kept alive for continued operations');

            } catch (error) {
                logger.error('Parameter modal submission failed', error);
                
                // Send error message to user if channel is available
                if (channelId) {
                    try {
                        await client.chat.postMessage({
                            channel: channelId,
                            text: '❌ Failed to process parameters. Please try again.'
                        });
                    } catch (postError) {
                        logger.error('Failed to post error message', postError);
                    }
                }
                
                // Clean up user session on error as well
                this.userSessions.delete(userId);
            }
        });

        // Handle session end command
        this.app.message(/^end$/i, async ({ message, say, client }) => {
            try {
                const userId = message.user;
                const channelId = message.channel;
                
                logger.slack(userId, 'Session end command received', {
                    channelId,
                    messageText: message.text
                });

                // Call backend API to end session
                try {
                    const response = await this.apiClient.post(`/api/session/${userId}/${channelId}/end`);
                    
                    if (response.data?.success) {
                        const summary = response.data?.data?.summary;
                        
                        // Create summary message
                        let summaryText = '🎉 *Session Ended Successfully!*\n\n';
                        
                        if (summary) {
                            summaryText += `*Client:* ${summary.clientName || 'Unknown'}\n`;
                            summaryText += `*Campaign:* ${summary.campaignIdea || 'N/A'}\n`;
                            summaryText += `*Operations Used:* ${summary.operationsText || 'N/A'}\n`;
                            summaryText += `*Models Used:* ${summary.modelsText || 'N/A'}\n`;
                            summaryText += `*Assets Generated:* ${summary.generatedAssets || 0}\n`;
                            summaryText += `*Session Duration:* ${Math.round((summary.sessionDuration || 0) / 1000 / 60)} minutes\n`;
                            summaryText += `*Total Interactions:* ${summary.totalInteractions || 0}\n`;
                        }
                        
                        summaryText += '\n*Session Summary:*\n';
                        summaryText += '✅ Campaign data collected\n';
                        summaryText += '✅ Operation selected\n';
                        summaryText += '✅ Model configured\n';
                        summaryText += '✅ Assets generated\n';
                        summaryText += '✅ Session completed\n\n';
                        summaryText += 'Type `/dashboard` to start a new session!';
                        
                        await say({
                            text: summaryText
                        });
                        
                        // Clean up local user session
                        this.userSessions.delete(userId);
                        
                        logger.slack(userId, 'Session ended successfully', {
                            sessionId: response.data?.data?.sessionId,
                            summary: summary
                        });
                        
                    } else {
                        await say({
                            text: '❌ *Session End Failed*\n\nNo active session found or session could not be ended. Type `/dashboard` to start a new session.'
                        });
                    }
                    
                } catch (apiError) {
                    // Handle specific 404 error (session not found)
                    if (apiError.response && apiError.response.status === 404) {
                        logger.slack(userId, 'Session end attempted but no session found', {
                            channelId,
                            error: 'Session not found'
                        });
                        
                        await say({
                            text: 'ℹ️ *No Active Session*\n\nThere is no active session to end. Type `/dashboard` to start a new session!'
                        });
                    } else {
                        // Handle other API errors
                        logger.error('Session end command failed', apiError);
                        
                        await say({
                            text: '❌ *Error Ending Session*\n\nSorry, there was an error ending your session. Please try again or contact support.'
                        });
                    }
                }
                
            } catch (error) {
                logger.error('Session end command failed', error);
                
                await say({
                    text: '❌ *Error Ending Session*\n\nSorry, there was an error ending your session. Please try again or contact support.'
                });
            }
        });

        // Handle regeneration
        this.app.action('regenerate_asset', async ({ ack, body, client }) => {
            try {
                await ack();
                
                const userId = body.user.id;
                await this.regenerateAsset(userId, body.channel.id, client);

            } catch (error) {
                logger.error('Asset regeneration failed', error);
            }
        });

        // Remove legacy image-to-video action handler and modal logic
        // Remove this.app.action('select_image_to_video_operation', ...) and related code
        // Remove this.app.action('select_image_to_video_model', ...) and related code
        // Remove this.app.view('submit_image_to_video_parameters', ...) and related code
        // Only keep the unified operation selection handler:
        this.app.action(/select_operation_(.+)/, async ({ ack, body, client }) => {
            let processingKey = null;
            try {
                await ack();
                const userId = body.user.id;
                const channelId = body.channel.id;
                const operation = body.actions[0].value;
                processingKey = `${userId}-${channelId}-${operation}`;
                if (this.processingOperations && this.processingOperations.has(processingKey)) {
                    logger.debug('Operation already being processed, skipping', { userId, operation });
                    return;
                }
                if (!this.processingOperations) this.processingOperations = new Set();
                this.processingOperations.add(processingKey);
                logger.slack(userId, 'Operation selected', {
                    operation,
                    channelId
                });
                await this.selectOperation(userId, channelId, operation, client);
                this.processingOperations.delete(processingKey);
            } catch (error) {
                logger.error('Operation selection failed', error);
                if (this.processingOperations && processingKey) {
                    this.processingOperations.delete(processingKey);
                }
            }
        });

        // Main slash command handler for /dashboard
        this.app.command('/dashboard', async ({ command, ack, respond, client }) => {
            console.log('[DEBUG][handler] Entered /dashboard command handler');
            try {
                await ack();
                const userId = command.user_id;
                const channelId = command.channel_id;
                const triggerId = command.trigger_id;
                // Show campaign collection modal as the main entry point
                await this.showCampaignCollectionModal(userId, channelId, triggerId, client);
            } catch (error) {
                logger.error('Dashboard command failed', error);
                await respond({
                    text: '❌ Sorry, something went wrong. Please try again.',
                    response_type: 'ephemeral'
                });
            }
        });
    }

    /**
     * Show campaign collection modal
     */
    async showCampaignCollectionModal(userId, channelId, triggerId, client) {
        const modal = {
            type: 'modal',
            callback_id: 'campaign_collection_modal',
            private_metadata: channelId,
            title: {
                type: 'plain_text',
                text: '�� AI Asset Generator'
            },
            submit: {
                type: 'plain_text',
                text: 'Start Creating'
            },
            close: {
                type: 'plain_text',
                text: 'Cancel'
            },
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: 'Campaign Information'
                    }
                },
                {
                    type: 'input',
                    block_id: 'client_name_block',
                    element: {
                        type: 'plain_text_input',
                        action_id: 'client_name_input',
                        placeholder: {
                            type: 'plain_text',
                            text: 'Enter client name'
                        }
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Client Name'
                    }
                },
                {
                    type: 'input',
                    block_id: 'campaign_idea_block',
                    element: {
                        type: 'plain_text_input',
                        action_id: 'campaign_idea_input',
                        multiline: true,
                        placeholder: {
                            type: 'plain_text',
                            text: 'Describe your campaign idea...'
                        }
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Campaign Idea'
                    }
                },
                {
                    type: 'input',
                    block_id: 'creative_directions_block',
                    element: {
                        type: 'plain_text_input',
                        action_id: 'creative_directions_input',
                        multiline: true,
                        placeholder: {
                            type: 'plain_text',
                            text: 'Creative directions and messaging...'
                        }
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Creative Directions'
                    }
                },
                {
                    type: 'input',
                    block_id: 'visual_directions_block',
                    element: {
                        type: 'plain_text_input',
                        action_id: 'visual_directions_input',
                        multiline: true,
                        placeholder: {
                            type: 'plain_text',
                            text: 'Visual style and directions...'
                        }
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Visual Directions'
                    }
                }
            ]
        };

        logger.slack(userId, 'Attempting to open modal', {
            triggerId,
            modalType: 'campaign_collection_modal'
        });

        await client.views.open({
            trigger_id: triggerId,
            view: modal
        });
        
        logger.slack(userId, 'Modal opened successfully');
    }

    /**
     * Create session via backend API
     */
    async createSession(userId, channelId, campaignData, client) {
        console.log('[DEBUG][createSession] Called with:', { userId, channelId, campaignData });
        try {
            const clientName = campaignData.clientName || campaignData.brandName || 'Unknown Client';
            const campaignIdea = campaignData.campaignIdea || '';
            const creativeDirections = campaignData.creativeDirections || '';
            const visualDirections = campaignData.visualDirections || '';
            const response = await this.apiClient.post('/api/session/create', {
                userId,
                threadId: channelId,
                clientName,
                campaignIdea,
                creativeDirections,
                visualDirections
            });
            const sessionData = response.data?.data?.session || {};
            let availableOperations = response.data?.data?.availableOperations || [];

            // Print campaign data in the channel
            await client.chat.postMessage({
                channel: channelId,
                text: `*Campaign Created!*\n*Client Name:* ${clientName}\n*Campaign Idea:* ${campaignIdea}\n*Creative Directions:* ${creativeDirections}\n*Visual Directions:* ${visualDirections}`
            });

            // Fallback to default operations if none returned
            if (!Array.isArray(availableOperations) || availableOperations.length === 0) {
                availableOperations = [
                    { id: 'text-to-image', label: 'Text to Image' },
                    { id: 'text-to-video', label: 'Text to Video' },
                    { id: 'image-to-video', label: 'Image to Video' },
                    { id: 'text-to-audio', label: 'Text to Audio' }
                ];
                logger.warn('No availableOperations returned from backend, using default list', { channelId });
            }

            // Show available operations
            const blocks = [
                {
                    type: 'header',
                    text: { type: 'plain_text', text: 'Select the type of asset you want to generate:' }
                },
                {
                    type: 'actions',
                    elements: availableOperations.map(op => ({
                        type: 'button',
                        text: { type: 'plain_text', text: op.label },
                        action_id: `select_operation_${op.id.replace(/-/g, '_')}`,
                        value: op.id
                    }))
                }
            ];
            await client.chat.postMessage({
                channel: channelId,
                blocks,
                text: 'Select the type of asset you want to generate:'
            });

            logger.slack(userId, 'Session created successfully', {
                sessionId: sessionData.sessionId
            });
        } catch (error) {
            logger.error('Failed to create session via API', error);
            throw error;
        }
    }

    /**
     * Show operation selection
     */
    async showOperationSelection(userId, channelId, brandResearch) {
        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: 'Select the type of asset you want to generate:'
                }
            }
        ];

        // Add operation selection instructions
        blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*Select the type of asset you want to generate:*'
            }
        });
        
        // Add button grid for operations
        blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '🎬 Text to Video'
                    },
                    action_id: 'select_operation_text_to_video',
                    value: 'text-to-video',
                    style: 'primary'
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '🖼️ Text to Image'
                    },
                    action_id: 'select_operation_text_to_image',
                    value: 'text-to-image'
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '🎥 Image to Video'
                    },
                    action_id: 'select_operation_image_to_video',
                    value: 'image-to-video'
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '🎵 Text to Audio'
                    },
                    action_id: 'select_operation_text_to_audio',
                    value: 'text-to-audio'
                }
            ]
        });
        
        // Send the operation selection message
        await this.app.client.chat.postMessage({
            channel: channelId,
            blocks: blocks,
            text: 'Campaign analysis complete! Select your asset type.'
        });
    }

    /**
     * Select operation via backend API
     */
    async selectOperation(userId, channelId, operation, client) {
        console.log('[DEBUG][selectOperation] Called with:', { userId, channelId, operation });
        try {
            // Track operation selection in session
            await this.apiClient.post(`/api/session/${userId}/${channelId}/select-operation`, {
                operation
            });

            // Get available models for the operation
            const modelsResponse = await this.apiClient.get(`/api/models/${operation}`);
            const models = modelsResponse.data?.data?.models || modelsResponse.data?.models || modelsResponse.data;
            
            if (!models || !Array.isArray(models)) {
                throw new Error('Invalid models response from API');
            }

            // Store models in memory for later config lookup
            if (!this.modelCache) this.modelCache = {};
            this.modelCache[operation] = models;
            
            // Store operation in user session for future reference
            const userSession = this.userSessions.get(userId) || {};
            userSession.operation = operation;
            userSession.channelId = channelId;
            userSession.timestamp = Date.now();
            this.userSessions.set(userId, userSession);
            
            logger.slack(userId, 'Operation selected and stored in session', {
                operation,
                modelCount: models.length
            });

            await this.showModelSelection(userId, channelId, operation, models, client);

        } catch (error) {
            logger.error('Failed to select operation via API', error);
            await client.chat.postEphemeral({
                channel: channelId,
                user: userId,
                text: '❌ Failed to load models. Please try again.'
            });
        }
    }

    /**
     * Show model selection
     */
    async showModelSelection(userId, channelId, operation, models, client) {
        console.log('[DEBUG][showModelSelection] Called with:', { userId, channelId, operation, models });
        const options = models.map(model => {
            // Ensure model.name and model.description exist
            let modelName = model.name || model.id || 'Unknown Model';
            // If this is the Lyria2 model for text-to-audio, override the display name
            if (operation === 'text-to-audio' && model.id === 'fal-ai/lyria2') {
                modelName = 'Lyria 2';
            }
            
            // Add pricing information to display text
            let displayText = modelName;
            if (model.pricing && model.pricing.price) {
                const tierEmoji = {
                    'budget': '💰',
                    'fast': '⚡',
                    'standard': '📊',
                    'premium': '💎'
                };
                const emoji = tierEmoji[model.pricing.tier] || '💵';
                displayText = `${emoji} ${modelName} (${model.pricing.price})`;
            }
            
            // Truncate if needed
            if (displayText.length > 60) {
                displayText = displayText.substring(0, 57) + '...';
            }
            
            logger.debug('Model option created', { 
                modelId: model.id, 
                originalName: model.name, 
                displayText: displayText, 
                length: displayText.length,
                pricing: model.pricing
            });
            return {
                text: {
                    type: 'plain_text',
                    text: displayText
                },
                value: model.id
            };
        });

        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Select a model for ${operation}:*`
                },
                accessory: {
                    type: 'static_select',
                    action_id: 'select_model',
                    placeholder: {
                        type: 'plain_text',
                        text: 'Choose model...'
                    },
                    options: options.slice(0, 100) // Slack limit
                }
            }
        ];

        await client.chat.postMessage({
            channel: channelId,
            blocks: blocks,
            text: `Select model for ${operation}`
        });
    }

    /**
     * Select model and show parameter configuration
     */
    async selectModel(userId, channelId, modelId, client) {
        console.log('[DEBUG][selectModel] Called with:', { userId, channelId, modelId });
        try {
            logger.slack(userId, 'Model selected', { modelId, channelId });

            console.log('[DEBUG][Modal] selectModel called with:', { userId, channelId, modelId });
            console.log('[DEBUG][Modal] modelCache keys:', Object.keys(this.modelCache || {}));
            console.log('[DEBUG][Modal] modelCache contents:', JSON.stringify(this.modelCache, null, 2));

            // Find the operation for this model (from last selection)
            let operation = Object.keys(this.modelCache || {}).find(op =>
                (this.modelCache[op] || []).some(m => m.id === modelId)
            );
            
            console.log('[DEBUG][Modal] Found operation:', operation);
            
            // If operation not found in cache, try to get it from the user session
            if (!operation) {
                const userSession = this.userSessions.get(userId);
                operation = userSession?.operation;
                console.log('[DEBUG][Modal] Operation from user session:', operation);
            }
            
            // If still no operation, try to determine from modelId
            if (!operation) {
                if (modelId.includes('tts') || modelId.includes('speech')) {
                    operation = 'text-to-speech';
                } else if (modelId.includes('image')) {
                    operation = 'text-to-image';
                } else if (modelId.includes('video')) {
                    operation = 'text-to-video';
                } else {
                    operation = 'text-to-image'; // fallback
                }
                console.log('[DEBUG][Modal] Operation determined from modelId:', operation);
            }
            
            // Track model selection in session
            await this.apiClient.post(`/api/session/${userId}/${channelId}/select-model`, {
                modelId,
                operation
            });
            
            // Find the models array and modelConfig first
            let models = this.modelCache?.[operation] || [];
            console.log('[DEBUG][Modal] Models for operation:', models.length);
            let modelConfig = models.find(m => m.id === modelId);
            
            // If modelConfig not found in cache, try to fetch it from API
            if (!modelConfig) {
                console.log('[DEBUG][Modal] Model config not found in cache, fetching from API');
                try {
                    const modelsResponse = await this.apiClient.get(`/api/models/${operation}`);
                    const apiModels = modelsResponse.data?.data?.models || modelsResponse.data?.models || modelsResponse.data;
                    
                    if (apiModels && Array.isArray(apiModels)) {
                        // Update cache
                        if (!this.modelCache) this.modelCache = {};
                        this.modelCache[operation] = apiModels;
                        
                        // Find modelConfig again
                        modelConfig = apiModels.find(m => m.id === modelId);
                        console.log('[DEBUG][Modal] Model config found after API fetch:', modelConfig ? 'yes' : 'no');
                    }
                } catch (apiError) {
                    console.log('[DEBUG][Modal] Failed to fetch models from API:', apiError.message);
                }
            }
            
            console.log('[DEBUG][Modal] Found modelConfig:', modelConfig ? 'yes' : 'no');
            if (!modelConfig) throw new Error('Model config not found');

            // Store user session data for modal interactions (now modelConfig is defined)
            this.userSessions.set(userId, {
                channelId,
                modelId,
                operation,
                modelConfig, // <-- store the full modelConfig for later extraction
                timestamp: Date.now()
            });
            
            // Also store the operation in the session for future reference
            logger.slack(userId, 'User session updated with model selection', {
                operation,
                modelId,
                hasModelConfig: !!modelConfig
            });

            console.log('[DEBUG][Modal] ModelConfig details:', {
                id: modelConfig.id,
                name: modelConfig.name,
                parametersCount: Object.keys(modelConfig.parameters || {}).length,
                parameters: Object.keys(modelConfig.parameters || {})
            });

            // Post model selection confirmation to chat
            let displayModelName = modelConfig.name;
            if (operation === 'text-to-audio' && modelConfig.id === 'fal-ai/lyria2') {
                displayModelName = 'Lyria 2';
            }
            // Build pricing information text
            let pricingText = '';
            if (modelConfig.pricing && modelConfig.pricing.price) {
                const tierEmoji = {
                    'budget': '💰',
                    'fast': '⚡',
                    'standard': '📊',
                    'premium': '💎'
                };
                const emoji = tierEmoji[modelConfig.pricing.tier] || '💵';
                pricingText = `\n\n${emoji} *Pricing:* ${modelConfig.pricing.price}\n📊 *Tier:* ${modelConfig.pricing.tier} • *Source:* ${modelConfig.pricing.source}`;
            }

            await client.chat.postMessage({
                channel: channelId,
                text: `✅ *Model Selected:* ${displayModelName}\n\n📝 *Description:* ${modelConfig.description}${pricingText}\n\n⚙️ *Parameters Available:* ${Object.keys(modelConfig.parameters).length} configurable options`,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `✅ *Model Selected:* ${displayModelName}\n\n📝 *Description:* ${modelConfig.description}${pricingText}`
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `⚙️ *Parameters Available:* ${Object.keys(modelConfig.parameters).length} configurable options\n\n🔧 *Next Step:* Configure parameters in the modal below`
                        }
                    }
                ]
            });

            // Show parameter configuration modal
            try {
                console.log('[DEBUG][Modal] About to call showParameterModal');
                await this.showParameterModal(userId, channelId, modelId, modelConfig, client);
            } catch (modalError) {
                logger.error('Failed to show parameter modal', modalError);
                // Fallback: show configuration in chat
                await this.showParameterConfigurationInChat(userId, channelId, modelConfig, client);
            }

        } catch (error) {
            logger.error('Failed to select model', error);
            await client.chat.postMessage({
                channel: channelId,
                text: `❌ Failed to load model configuration for *${modelId}*. Please try again.`
            });
        }
    }

    /**
     * Show parameter configuration modal
     */
    async showParameterModal(userId, channelId, modelId, modelConfig, client) {
        console.log('[DEBUG][showParameterModal] Called with:', { userId, channelId, modelId, modelConfig });
        try {
            console.log('[DEBUG][Modal] showParameterModal called with:', {
                userId,
                channelId,
                modelId,
                modelConfigKeys: modelConfig ? Object.keys(modelConfig) : 'null',
                modelConfigType: typeof modelConfig,
                modelConfigParameters: modelConfig?.parameters ? Object.keys(modelConfig.parameters) : 'no parameters'
            });

            // FIX: Define operation from user session or modelConfig
            let operation = modelConfig.operation;
            if (!operation && this.userSessions.has(userId)) {
                operation = this.userSessions.get(userId).operation;
            }

            // Create comprehensive modal view
            let parameterBlocks;
            if (operation === 'text-to-video' && textToVideoModalParams[modelId]) {
              // Build blocks from the schema array
              parameterBlocks = textToVideoModalParams[modelId].map((param) => {
                const block = {
                  type: 'input',
                  block_id: `${param.action_id}_block`,
                  optional: !param.required,
                  label: {
                    type: 'plain_text',
                    text: param.label + (param.required ? '' : ' (Optional)')
                  },
                  element: {
                    type: param.type,
                    action_id: param.action_id
                  }
                };
                if (param.type === 'plain_text_input' && param.placeholder) {
                  block.element.placeholder = { type: 'plain_text', text: param.placeholder };
                }
                if (param.type === 'static_select' && param.options) {
                  block.element.options = param.options.map(opt => ({
                    text: { type: 'plain_text', text: opt },
                    value: opt
                  }));
                  block.element.placeholder = { type: 'plain_text', text: `Select ${param.label.toLowerCase()}...` };
                  if (param.default !== undefined) {
                    const initial_option = block.element.options.find(o => o.value === param.default);
                    if (initial_option) block.element.initial_option = initial_option;
                  }
                }
                if (param.type === 'number_input') {
                  block.element.is_decimal_allowed = true;
                  if (param.placeholder) {
                    block.element.placeholder = { type: 'plain_text', text: param.placeholder };
                  }
                }
                if (param.type === 'checkbox') {
                  block.element = {
                    type: 'checkboxes',
                    action_id: param.action_id,
                    options: [
                      {
                        text: { type: 'plain_text', text: param.label },
                        value: 'true'
                      }
                    ]
                  };
                  if (param.default === true) {
                    block.element.initial_options = [block.element.options[0]];
                  }
                }
                return block;
              });
            } else if (operation === 'text-to-audio' && textToAudioModalParams[modelId]) {
              // Build blocks from the schema array
              parameterBlocks = textToAudioModalParams[modelId].map((param) => {
                const block = {
                  type: 'input',
                  block_id: `${param.action_id}_block`,
                  optional: !param.required,
                  label: {
                    type: 'plain_text',
                    text: param.label + (param.required ? '' : ' (Optional)')
                  },
                  element: {
                    type: param.type,
                    action_id: param.action_id
                  }
                };
                if (param.type === 'plain_text_input' && param.placeholder) {
                  block.element.placeholder = { type: 'plain_text', text: param.placeholder };
                }
                if (param.type === 'static_select' && param.options) {
                  block.element.options = param.options.map(opt => ({
                    text: { type: 'plain_text', text: opt },
                    value: opt
                  }));
                  block.element.placeholder = { type: 'plain_text', text: `Select ${param.label.toLowerCase()}...` };
                  if (param.default !== undefined) {
                    const initial_option = block.element.options.find(o => o.value === param.default);
                    if (initial_option) block.element.initial_option = initial_option;
                  }
                }
                if (param.type === 'number_input') {
                  block.element.is_decimal_allowed = true;
                  if (param.placeholder) {
                    block.element.placeholder = { type: 'plain_text', text: param.placeholder };
                  }
                }
                if (param.type === 'checkbox') {
                  block.element = {
                    type: 'checkboxes',
                    action_id: param.action_id,
                    options: [
                      {
                        text: { type: 'plain_text', text: param.label },
                        value: 'true'
                      }
                    ]
                  };
                  if (param.default === true) {
                    block.element.initial_options = [block.element.options[0]];
                  }
                }
                return block;
              });
            } else if (operation === 'text-to-speech' && textToSpeechModalParams[modelId]) {
                parameterBlocks = textToSpeechModalParams[modelId].map((param) => {
                    const block = {
                        type: 'input',
                        block_id: `${param.action_id}_block`,
                        optional: !param.required,
                        label: { type: 'plain_text', text: param.label },
                        element: {
                            type: param.type,
                            action_id: param.action_id,
                            placeholder: param.placeholder ? { type: 'plain_text', text: param.placeholder } : undefined
                        }
                    };
                    return block;
                });
            } else if (operation === 'image-to-image' && imageToImageModalParams[modelId]) {
                parameterBlocks = imageToImageModalParams[modelId].map((param) => {
                    const block = {
                        type: 'input',
                        block_id: `${param.action_id}_block`,
                        optional: !param.required,
                        label: { type: 'plain_text', text: param.label },
                        element: {
                            type: param.type,
                            action_id: param.action_id,
                            placeholder: param.placeholder ? { type: 'plain_text', text: param.placeholder } : undefined
                        }
                    };
                    
                    // Handle static_select type
                    if (param.type === 'static_select' && param.options) {
                        block.element.options = param.options;
                        if (param.default) {
                            block.element.initial_option = param.options.find(opt => opt.value === param.default);
                        }
                    }
                    
                    // Handle checkbox type
                    if (param.type === 'checkbox') {
                        block.element = {
                            type: 'checkboxes',
                            action_id: param.action_id,
                            options: [
                                {
                                    text: { type: 'plain_text', text: param.label },
                                    value: 'true'
                                }
                            ]
                        };
                        if (param.default === true) {
                            block.element.initial_options = [block.element.options[0]];
                        }
                    }
                    
                    return block;
                });
            } else if (operation === 'video-to-video' && videoToVideoModalParams[modelId]) {
                // Build blocks from the video-to-video schema array with custom UI
                parameterBlocks = videoToVideoModalParams[modelId].map((param) => {
                    const block = {
                        type: 'input',
                        block_id: `${param.action_id}_block`,
                        optional: !param.required,
                        label: {
                            type: 'plain_text',
                            text: param.label + (param.required ? '' : ' (Optional)')
                        },
                        element: {
                            type: param.type,
                            action_id: param.action_id
                        }
                    };
                    
                    // Add placeholder text
                    if (param.placeholder) {
                        block.element.placeholder = { type: 'plain_text', text: param.placeholder };
                    }
                    
                    // Handle static_select type with custom options
                    if (param.type === 'static_select' && param.options) {
                        block.element.options = param.options;
                        block.element.placeholder = { 
                            type: 'plain_text', 
                            text: `Select ${param.label.replace(/[🎬🎵🖼️💬🚫🎯🎞️⏱️📊🎛️🎲📺📐🎭🖼️📚🛡️📝🔧⚡🏃🔍🔄⏰▶️🎨🤖💪]/g, '').trim()}...` 
                        };
                        
                        // Set default option if specified
                        if (param.default !== undefined) {
                            const initial_option = param.options.find(opt => opt.value === param.default);
                            if (initial_option) {
                                block.element.initial_option = initial_option;
                            }
                        }
                    }
                    
                    // Handle number_input type
                    if (param.type === 'number_input') {
                        block.element.is_decimal_allowed = true;
                        if (param.placeholder) {
                            block.element.placeholder = { type: 'plain_text', text: param.placeholder };
                        }
                    }
                    
                    // Handle checkbox type with custom labels
                    if (param.type === 'checkbox') {
                        block.element = {
                            type: 'checkboxes',
                            action_id: param.action_id,
                            options: [
                                {
                                    text: { type: 'plain_text', text: `Enable ${param.label.replace(/[🎬🎵🖼️💬🚫🎯🎞️⏱️📊🎛️🎲📺📐🎭🖼️📚🛡️📝🔧⚡🏃🔍🔄⏰▶️🎨🤖💪]/g, '').trim()}` },
                                    value: 'true'
                                }
                            ]
                        };
                        
                        // Set default if specified
                        if (param.default === true) {
                            block.element.initial_options = [block.element.options[0]];
                        }
                    }
                    
                    return block;
                });
            }
            else {
              // Fallback to old logic
              parameterBlocks = buildParameterBlocksFromModelConfig(modelConfig);
            }

            // Assert referential equality before opening modal
            try {
                assertReferentialEquality(parameterBlocks);
                console.log('[DEBUG][Modal] Referential equality check passed');
            } catch (assertionError) {
                console.error('[ERROR][Modal] Referential equality check failed:', assertionError.message);
                throw assertionError;
            }

            // Log the final modal payload for debugging
            console.log('[DEBUG][Modal] Final modal payload:', JSON.stringify(parameterBlocks, null, 2));

            // Check if we have a valid trigger ID
            const triggerId = this.getCurrentTriggerId();
            if (!triggerId) {
                logger.warn(`[SLACK:${userId}] No trigger ID available, falling back to chat-based parameter configuration`, {
                    modelId,
                    channelId
                });
                
                // Fallback to chat-based parameter configuration
                await this.showParameterConfigurationInChat(userId, channelId, modelConfig, client);
                return;
            }

            // Open the modal
            await client.views.open({
                trigger_id: triggerId,
                view: {
                    type: 'modal',
                    callback_id: 'parameter_configuration_modal',
                    private_metadata: channelId,
                    title: {
                        type: 'plain_text',
                        text: 'Configure Model'
                    },
                    submit: {
                        type: 'plain_text',
                        text: '🚀 Generate Asset'
                    },
                    close: {
                        type: 'plain_text',
                        text: 'Cancel'
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*${modelConfig.name}*\n${modelConfig.description}`
                            }
                        },
                        // Add pricing information if available
                        ...(modelConfig.pricing && modelConfig.pricing.price ? [{
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*💵 Pricing:* ${modelConfig.pricing.price}\n*📊 Tier:* ${modelConfig.pricing.tier} • *Source:* ${modelConfig.pricing.source}`
                            }
                        }] : []),
                        { type: 'divider' },
                        ...parameterBlocks
                    ]
                }
            });

            logger.info(`[SLACK:${userId}] Parameter modal opened successfully`, {
                modelId,
                channelId,
                parameterCount: parameterBlocks.length
            });

        } catch (error) {
            logger.error(`[SLACK:${userId}] Modal opening failed`, error);
            
            // Fallback: show parameters in chat
            await this.showParameterConfigurationInChat(userId, channelId, modelConfig, client);
        }
    }

    /**
     * Show parameter configuration in chat as fallback
     */
    async showParameterConfigurationInChat(userId, channelId, modelConfig, client) {
        const parameterBlocks = [];
        
        if (modelConfig.parameters) {
            Object.entries(modelConfig.parameters).forEach(([paramName, paramConfig]) => {
                if (paramConfig.type === 'string' && paramConfig.required) {
                    parameterBlocks.push({
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*${paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/_/g, ' ')}* (Required)\nType: ${paramConfig.type}${paramConfig.default ? `\nDefault: ${paramConfig.default}` : ''}`
                        }
                    });
                } else if (paramConfig.type === 'string' && paramConfig.options) {
                    parameterBlocks.push({
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*${paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/_/g, ' ')}*\nType: ${paramConfig.type}\nOptions: ${paramConfig.options.join(', ')}${paramConfig.default ? `\nDefault: ${paramConfig.default}` : ''}`
                        }
                    });
                } else if (paramConfig.type === 'number') {
                    parameterBlocks.push({
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*${paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/_/g, ' ')}*\nType: ${paramConfig.type}${paramConfig.min ? `\nMin: ${paramConfig.min}` : ''}${paramConfig.max ? `\nMax: ${paramConfig.max}` : ''}${paramConfig.default ? `\nDefault: ${paramConfig.default}` : ''}`
                        }
                    });
                } else if (paramConfig.type === 'boolean') {
                    parameterBlocks.push({
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*${paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/_/g, ' ')}*\nType: ${paramConfig.type}${paramConfig.default ? `\nDefault: ${paramConfig.default}` : ''}`
                        }
                    });
                }
            });
        }

        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `🔧 *Parameter Configuration for ${modelConfig.name}*\n\nSince the modal couldn't be opened, here are the available parameters:`
                }
            },
            {
                type: 'divider'
            },
            ...parameterBlocks,
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `💡 *Next Steps:*\n• Use the modal above to configure parameters\n• Or reply with your prompt to use default settings`
                }
            }
        ];

        await client.chat.postMessage({
            channel: channelId,
            blocks: blocks,
            text: `Parameter configuration for ${modelConfig.name}`
        });
    }

    /**
     * Get current trigger ID (placeholder - in real implementation, this would be passed from the interaction)
     */
    getCurrentTriggerId() {
        // Use the stored trigger ID from the last interaction
        return this.lastTriggerId || null;
    }

    /**
     * Post parameter summary to chat
     */
    async postParameterSummaryToChat(userId, channelId, parameters, client) {
        logger.slack(userId, 'Posting parameter summary to chat', {
            channelId,
            parameterCount: Object.keys(parameters).length,
            hasChannelId: !!channelId
        });
        
        if (!channelId) {
            logger.error('No channel ID provided for parameter summary', {
                userId,
                parameters: Object.keys(parameters)
            });
            throw new Error('No channel ID available for posting parameter summary');
        }
        
        const parameterBlocks = [];
        
        Object.entries(parameters).forEach(([paramName, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                parameterBlocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/_/g, ' ')}:* ${value}`
                    }
                });
            }
        });

        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '✅ *Parameters Configured Successfully!*\n\nHere are your selected parameters:'
                }
            },
            {
                type: 'divider'
            },
            ...parameterBlocks,
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '🚀 *Starting Generation...*\n\nYour asset is being generated with these settings.'
                }
            }
        ];

        await client.chat.postMessage({
            channel: channelId,
            blocks: blocks,
            text: 'Parameters configured and generation started'
        });
    }

    /**
     * Submit generation request
     */
    async submitGeneration(userId, channelId, parameters, client) {
        console.log('[DEBUG][submitGeneration] Called with:', { userId, channelId, parameters });
        try {
            // Get user session to retrieve session details
            const userSession = this.userSessions.get(userId);
            if (!userSession) {
                throw new Error('No user session found for generation');
            }

            // Create a proper UUID for generation ID
            const generationId = require('crypto').randomUUID();

            // Build parameters object: model-specific params + modelId + operation
            const fullParams = {
                ...parameters,
                modelId: userSession.modelId,
                operation: userSession.operation
            };

            console.log('[DEBUG][submitGeneration] fullParams to backend:', JSON.stringify(fullParams, null, 2));

            const response = await this.apiClient.post('/api/generate-asset', {
                userId,
                threadId: channelId, // Use channelId as threadId
                generationId,
                parameters: fullParams
            });

            const result = response.data;
            logger.slack(userId, 'Generation completed', {
                generationId,
                success: result.success,
                hasData: !!result.data,
                assetUrl: result.data && result.data.assetUrl
            });

            // Extract asset information from the response
            let assetUrl = 'Processing...';
            let previewImageUrl = null;
            let additionalUrls = [];
            let driveUpload = null;
            
            if (result.success && result.data) {
                assetUrl = result.data.assetUrl || 'No asset URL returned.';
                previewImageUrl = result.data.previewImageUrl;
                driveUpload = result.data.driveUpload;
                
                // Handle additional URLs for 3D models
                if (result.data.result) {
                    const urls = result.data.result;
                    
                    // Collect all available URLs for 3D models
                    if (urls.modelMeshUrl) additionalUrls.push(`📦 *3D Model Mesh:* ${urls.modelMeshUrl}`);
                    if (urls.modelGlbUrl) additionalUrls.push(`📦 *3D Model GLB:* ${urls.modelGlbUrl}`);
                    if (urls.modelGlbPbrUrl) additionalUrls.push(`📦 *3D Model GLB PBR:* ${urls.modelGlbPbrUrl}`);
                    if (urls.pbrModelUrl) additionalUrls.push(`📦 *PBR Model:* ${urls.pbrModelUrl}`);
                    if (urls.baseModelUrl) additionalUrls.push(`📦 *Base Model:* ${urls.baseModelUrl}`);
                    if (urls.renderedImageUrl) additionalUrls.push(`🖼️ *Rendered Image:* ${urls.renderedImageUrl}`);
                    
                    // Handle textures array for Hyper3D
                    if (urls.textures && Array.isArray(urls.textures)) {
                        urls.textures.forEach((textureUrl, index) => {
                            additionalUrls.push(`🎨 *Texture ${index + 1}:* ${textureUrl}`);
                        });
                    }
                    
                    // Handle timings for Trellis and TripoSR
                    if (urls.timings) {
                        additionalUrls.push(`⏱️ *Processing Time:* ${JSON.stringify(urls.timings)}`);
                    }
                    
                    // Handle remeshing directory for TripoSR
                    if (urls.remeshingDirUrl) {
                        additionalUrls.push(`📁 *Remeshing Directory:* ${urls.remeshingDirUrl}`);
                    }
                }
            } else if (result.success) {
                assetUrl = 'No asset URL returned.';
            }

            console.log('[DEBUG][submitGeneration] Asset URL:', assetUrl);
            console.log('[DEBUG][submitGeneration] Preview Image URL:', previewImageUrl);
            console.log('[DEBUG][submitGeneration] Additional URLs:', additionalUrls.length);
            console.log('[DEBUG][submitGeneration] Drive Upload:', driveUpload);

            // Determine file type and appropriate emoji
            let fileType = 'file';
            let fileEmoji = '📁';
            
            if (assetUrl) {
                const urlLower = assetUrl.toLowerCase();
                if (urlLower.includes('.png') || urlLower.includes('png')) {
                    fileType = 'PNG Image';
                    fileEmoji = '🖼️';
                } else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || urlLower.includes('jpeg')) {
                    fileType = 'JPEG Image';
                    fileEmoji = '🖼️';
                } else if (urlLower.includes('.mp4') || urlLower.includes('.mov') || urlLower.includes('.avi')) {
                    fileType = 'Video';
                    fileEmoji = '🎬';
                } else if (urlLower.includes('.wav') || urlLower.includes('.mp3') || urlLower.includes('.ogg')) {
                    fileType = 'Audio';
                    fileEmoji = '🎵';
                } else if (urlLower.includes('.glb') || urlLower.includes('.obj') || urlLower.includes('3d')) {
                    fileType = '3D Model';
                    fileEmoji = '📦';
                }
            }

            // Post success message to chat
            let successMessage = `🎉 *Generation Complete!*\n\nYour asset has been generated successfully!\n\n${fileEmoji} *Primary Asset:* ${assetUrl}`;
            
            // Add Drive upload information if available
            if (driveUpload) {
                successMessage += `\n\n📂 *Google Drive Storage:*\n`;
                successMessage += `📁 *Folder:* ${driveUpload.folderName || 'Session Folder'}\n`;
                
                // Add session folder link if available
                if (driveUpload.folderId) {
                    const folderLink = `https://drive.google.com/drive/folders/${driveUpload.folderId}`;
                    successMessage += `📂 *Session Folder:* ${folderLink}\n`;
                }
                
                // Fix file name display to show correct extension
                const fileName = driveUpload.fileName || 'Generated Asset';
                successMessage += `📄 *File:* ${fileName}\n`;
                successMessage += `🔗 *View:* ${driveUpload.webViewLink}\n`;
                successMessage += `⬇️ *Download:* ${driveUpload.webContentLink}`;
            }
            
            // Add preview image URL if available
            if (previewImageUrl) {
                successMessage += `\n🖼️ *Preview Image:* ${previewImageUrl}`;
            }
            
            // Add all additional URLs
            if (additionalUrls.length > 0) {
                successMessage += '\n\n📋 *Additional Assets:*\n' + additionalUrls.join('\n');
            }

            await client.chat.postMessage({
                channel: channelId,
                text: successMessage
            });

            // Add helpful message about continuing or ending session
            await client.chat.postMessage({
                channel: channelId,
                text: '💡 *What\'s Next?*\n\n🎯 *Continue generating:* Select another operation above\n📝 *End session:* Type `/end` to finish and get a summary\n\nYour session is active and ready for more operations!'
            });

        } catch (error) {
            logger.error('Failed to submit generation via API', error);
            console.error('[ERROR][submitGeneration] Error details:', error && error.stack ? error.stack : error);
            
            // Determine specific error message
            let errorMessage = '❌ *Generation Failed*\n\nSorry, there was an error generating your asset.';
            
            if (error.response && error.response.data) {
                const responseData = error.response.data;
                if (responseData.details) {
                    // Check for specific error types and provide helpful messages
                    if (responseData.details.includes('too short')) {
                        errorMessage = `❌ *Generation Failed*\n\n💡 *Helpful Tip:* Your prompt is too short. Please enter at least 3 characters for better results.\n\n*Current prompt:* "${parameters.prompt || 'No prompt'}"`;
                    } else if (responseData.details.includes('not supported')) {
                        errorMessage = `❌ *Generation Failed*\n\n💡 *Helpful Tip:* The selected model is not currently supported. Please try a different model.`;
                    } else {
                        errorMessage = `❌ *Generation Failed*\n\nError: ${responseData.details}`;
                    }
                } else if (responseData.error) {
                    if (responseData.error.includes('length')) {
                        errorMessage = `❌ *Generation Failed*\n\n💡 *Technical Issue:* There was a problem with the image generation service. This is a temporary issue.\n\nPlease try again in a moment.`;
                    } else {
                        errorMessage = `❌ *Generation Failed*\n\nError: ${responseData.error}`;
                    }
                }
            } else if (error.message) {
                if (error.message.includes('too short')) {
                    errorMessage = `❌ *Generation Failed*\n\n💡 *Helpful Tip:* Your prompt is too short. Please enter at least 3 characters for better results.\n\n*Current prompt:* "${parameters.prompt || 'No prompt'}"`;
                } else {
                    errorMessage = `❌ *Generation Failed*\n\nError: ${error.message}`;
                }
            }
            
            // Post error message to chat
            await client.chat.postMessage({
                channel: channelId,
                text: `${errorMessage}\n\nPlease try again or contact support if the issue persists.`
            });

            // Clean up user session after error
            this.userSessions.delete(userId);
            logger.info(`[SLACK:${userId}] User session cleaned up after error`);
        }
    }

    /**
     * Show generation progress
     */
    async showGenerationProgress(userId, jobId, client) {
        // Called if generation takes longer than 2 minutes
        await client.chat.postMessage({
            channel: userId,
            text: ':hourglass_flowing_sand: Still generating your video, please wait...'
        });
    }

    /**
     * Handle campaign input directly
     */
    async handleCampaignInput(userId, channelId, threadId, text, respond) {
        try {
            await respond({
                text: `🎨 Processing your campaign idea: "${text.substring(0, 100)}..."\n⏳ Please wait while I analyze and enhance your concept...`,
                response_type: 'in_channel'
            });

            // Create session with the provided text
            await this.createSession(userId, channelId, {
                campaignIdea: text,
                clientName: 'Quick Campaign',
                creativeDirections: '',
                visualDirections: ''
            });

        } catch (error) {
            logger.error('Failed to handle campaign input', error);
            await respond({
                text: '❌ Sorry, I encountered an error processing your request. Please try again.',
                response_type: 'ephemeral'
            });
        }
    }

    /**
     * Start the Slack bot service
     */
    async start() {
        logger.info('Starting Slack Bot Service');
        
        try {
            // Initialize log management
            await logManager.initialize();
            
            // Try to discover backend URL if not already set
            if (!this.backendUrl || this.backendUrl === 'http://localhost:3000') {
                try {
                    this.backendUrl = await this.discoverBackendUrl();
                    // Update the API client base URL
                    this.apiClient.defaults.baseURL = this.backendUrl;
                    logger.info('Backend URL discovered and updated', {
                        discoveredUrl: this.backendUrl
                    });
                } catch (discoveryError) {
                    logger.warn('Failed to discover backend URL, using configured URL', {
                        configuredUrl: this.backendUrl,
                        discoveryError: discoveryError.message
                    });
                }
            }
            
            // Check backend API connectivity
            await this.checkBackendConnectivity();
            
            // Start the Slack app
            await this.app.start();
            
            logger.info('Slack Bot Service started successfully', {
                backendUrl: this.backendUrl,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Failed to start Slack Bot Service', {
                error: error.message,
                stack: error.stack,
                code: error.code,
                type: error.constructor.name
            });
            
            throw error;
        }
    }

    /**
     * Dynamically discover backend API URL
     */
    async discoverBackendUrl() {
        const commonPorts = [3000, 30001, 3001, 3002, 3003];
        const baseUrl = 'http://localhost';
        
        for (const port of commonPorts) {
            try {
                const testUrl = `${baseUrl}:${port}`;
                logger.info(`Trying to discover backend at ${testUrl}`);
                
                const response = await this.apiClient.get('/health', {
                    baseURL: testUrl,
                    timeout: 5000
                });
                
                if (response.status === 200) {
                    logger.info(`Backend discovered at ${testUrl}`, {
                        discoveredUrl: testUrl,
                        status: response.status
                    });
                    return testUrl;
                }
            } catch (error) {
                logger.debug(`Backend not found at port ${port}`, {
                    port,
                    error: error.message
                });
            }
        }
        
        throw new Error('Backend API not found on any common ports');
    }

    /**
     * Check backend API connectivity with retry logic
     */
    async checkBackendConnectivity() {
        const maxRetries = 5;
        const retryDelay = 2000; // 2 seconds
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`Backend connectivity check attempt ${attempt}/${maxRetries}`, {
                    backendUrl: this.backendUrl,
                    attempt
                });
                
                const response = await this.apiClient.get('/health', {
                    timeout: 10000 // 10 second timeout for health check
                });
            
            if (response.status === 200) {
                logger.info('Backend API connectivity verified', {
                    status: response.status,
                        backendUrl: this.backendUrl,
                        attempt
                });
                    return true;
            } else {
                throw new Error(`Backend API returned status ${response.status}`);
            }
        } catch (error) {
                logger.warn(`Backend API connectivity check failed (attempt ${attempt}/${maxRetries})`, {
                backendUrl: this.backendUrl,
                    error: error.message,
                    attempt,
                    maxRetries
                });
                
                if (attempt === maxRetries) {
                    logger.error('Backend API connectivity check failed after all retries', {
                        backendUrl: this.backendUrl,
                        error: error.message,
                        totalAttempts: maxRetries
                    });
                    throw new Error(`Cannot connect to backend API at ${this.backendUrl} after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        logger.info('Shutting down Slack Bot Service');
        
        try {
            await this.app.stop();
            logger.info('Slack Bot Service stopped');
            process.exit(0);
        } catch (error) {
            logger.error('Error during Slack Bot Service shutdown', error);
            process.exit(1);
        }
    }

    // Utility: Extract JSON from code block
    extractJsonFromCodeBlock(text) {
        if (typeof text !== 'string') return null;
        
        // Try to match JSON code block with various formats
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch) {
            try {
                const jsonContent = codeBlockMatch[1].trim();
                return JSON.parse(jsonContent);
            } catch (e) {
                logger.warn('Failed to parse JSON from code block', {
                    error: e.message,
                    contentPreview: codeBlockMatch[1].substring(0, 100)
                });
            }
        }
        
        // Try to parse as plain JSON if no code block found
        try {
            return JSON.parse(text);
        } catch (e) {
            logger.warn('Failed to parse text as JSON', {
                error: e.message,
                contentPreview: text.substring(0, 100)
            });
        }
        
        return null;
    }
}

// Start the service if this file is run directly
if (require.main === module) {
    try {
        const slackService = new SlackBotService();
        slackService.start().then(() => {
            logger.info('Slack Bot Service startup completed successfully');
        }).catch(error => {
            logger.error('Slack Bot Service startup failed', error);
            process.exit(1);
        });
        // Graceful shutdown handlers
        process.on('SIGTERM', () => {
            slackService.shutdown();
        });
        process.on('SIGINT', () => {
            slackService.shutdown();
        });
    } catch (error) {
        logger.error('Failed to create Slack Bot Service instance', error);
        process.exit(1);
    }
}

module.exports = SlackBotService; 
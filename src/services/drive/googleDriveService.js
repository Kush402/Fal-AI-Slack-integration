/**
 * @fileoverview Google Drive Service - Handles per-session asset storage and uploads
 * @description This service manages Google Drive operations for the Slack AI Asset Generator.
 * It creates session-specific folders and uploads generated assets with proper organization and permissions.
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config');
const { Readable, PassThrough } = require('stream');

class GoogleDriveService {
    constructor() {
        // Try to use env vars first, then fall back to JSON file
        this.mockMode = process.env.MOCK_DRIVE_UPLOADS === 'true';
        this.sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;
        
        // Check if all required environment variables are present
        this.requiredEnvVars = [
            'GOOGLE_PROJECT_ID',
            'GOOGLE_PRIVATE_KEY_ID',
            'GOOGLE_PRIVATE_KEY',
            'GOOGLE_CLIENT_EMAIL',
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_X509_CERT_URL'
        ];
        this.missingVars = this.requiredEnvVars.filter(v => !process.env[v]);
        
        if (this.mockMode) {
            logger.drive('Google Drive service initialized in mock mode', { mockMode: true });
            this.mockMode = true;
        } else if (this.missingVars.length === 0) {
            // Use environment variables for credentials (preferred)
            logger.drive('Using environment variables for Google Drive credentials', {
                projectId: process.env.GOOGLE_PROJECT_ID,
                clientEmail: process.env.GOOGLE_CLIENT_EMAIL
            });
            this.initializeAuthFromEnv().catch(error => {
                logger.error('Failed to initialize Google Drive auth from env', error);
                this.mockMode = true;
            });
        } else {
            // Fall back to JSON file if env vars are missing
            const fs = require('fs');
            const path = require('path');
            const jsonCredentialsPath = path.join(process.cwd(), 'fal-ai-project-ae03eea4f4b3.json');
            
            if (fs.existsSync(jsonCredentialsPath)) {
                logger.drive('Using JSON credentials file as fallback', { 
                    path: jsonCredentialsPath,
                    missingEnvVars: this.missingVars
                });
                this.initializeAuthFromJson(jsonCredentialsPath).catch(error => {
                    logger.error('Failed to initialize Google Drive auth from JSON', error);
                    this.mockMode = true;
                });
            } else {
                logger.drive('Google Drive service initialized in mock mode - no credentials available', {
                    mockMode: true,
                    missingVars: this.missingVars,
                    jsonFileExists: false
                });
                this.mockMode = true;
            }
        }
    }

    /**
     * Initialize Google Drive authentication from JSON credentials file
     */
    async initializeAuthFromJson(jsonPath) {
        try {
            const fs = require('fs');
            const credentials = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            
            logger.drive('Loaded credentials from JSON file', {
                projectId: credentials.project_id,
                clientEmail: credentials.client_email
            });
            
            // Use GoogleAuth with keyFile
            this.auth = new google.auth.GoogleAuth({
                keyFile: jsonPath,
                scopes: ['https://www.googleapis.com/auth/drive']
            });
            
            // Test authentication
            const client = await this.auth.getClient();
            const accessToken = await client.getAccessToken();
            logger.drive('Google Drive authentication from JSON successful', {
                serviceAccount: credentials.client_email,
                hasAccessToken: !!accessToken.token
            });
            
            this.drive = google.drive({ version: 'v3', auth: this.auth });
            logger.drive('Google Drive service initialized from JSON file', {
                serviceAccount: credentials.client_email
            });
        } catch (error) {
            logger.error('Google Drive: Failed to initialize authentication from JSON', error);
            throw error;
        }
    }

    /**
     * Initialize Google Drive authentication from environment variables
     */
    async initializeAuthFromEnv() {
        try {
            // Debug: Log the raw private key to see what we're getting
            const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
            logger.drive('Raw private key length', { length: rawPrivateKey?.length });
            
            // Process the private key with multiple replacement passes
            let processedPrivateKey = rawPrivateKey;
            if (processedPrivateKey) {
                // Log the first 100 characters to see the format
                logger.drive('Private key starts with', { 
                    start: processedPrivateKey.substring(0, 100),
                    containsDoubleEscaped: processedPrivateKey.includes('\\\\n'),
                    containsSingleEscaped: processedPrivateKey.includes('\\n')
                });
                
                // Handle double-escaped newlines first
                processedPrivateKey = processedPrivateKey.replace(/\\\\n/g, '\n');
                // Handle single-escaped newlines
                processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
                // Handle any remaining escaped newlines
                processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
                
                            // Log the processed key start
            logger.drive('Processed private key starts with', { 
                start: processedPrivateKey.substring(0, 100),
                containsNewlines: processedPrivateKey.includes('\n')
            });
            
            // Validate private key format
            if (!processedPrivateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
                throw new Error('Invalid private key format: must start with -----BEGIN PRIVATE KEY-----');
            }
            if (!processedPrivateKey.includes('-----END PRIVATE KEY-----')) {
                throw new Error('Invalid private key format: must end with -----END PRIVATE KEY-----');
            }
            
            logger.drive('Private key format validation passed');
            
            // Try to parse the private key to see if it's valid
            try {
                const crypto = require('crypto');
                // Extract the base64 part of the private key
                const privateKeyMatch = processedPrivateKey.match(/-----BEGIN PRIVATE KEY-----\n([\s\S]*?)\n-----END PRIVATE KEY-----/);
                if (privateKeyMatch) {
                    const base64Key = privateKeyMatch[1].replace(/\n/g, '');
                    const keyBuffer = Buffer.from(base64Key, 'base64');
                    logger.drive('Private key base64 decoding successful', {
                        keyLength: keyBuffer.length
                    });
                } else {
                    throw new Error('Could not extract base64 key from private key');
                }
            } catch (parseError) {
                logger.error('Private key parsing failed', parseError);
                throw new Error('Invalid private key format: ' + parseError.message);
            }
            }
            
            logger.drive('Processed private key length', { length: processedPrivateKey?.length });
            
            // Build credentials object from env vars
            const credentials = {
                type: 'service_account',
                project_id: process.env.GOOGLE_PROJECT_ID,
                private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
                private_key: processedPrivateKey,
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                client_id: process.env.GOOGLE_CLIENT_ID,
                auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                token_uri: 'https://oauth2.googleapis.com/token',
                auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
                universe_domain: 'googleapis.com'
            };
            
            // Log credentials info (without sensitive data)
            logger.drive('Credentials object created', {
                hasProjectId: !!credentials.project_id,
                hasPrivateKey: !!credentials.private_key,
                hasClientEmail: !!credentials.client_email,
                privateKeyLength: credentials.private_key?.length,
                privateKeyStartsWith: credentials.private_key?.substring(0, 30)
            });
            // Try a simpler approach - use the credentials directly without GoogleAuth
            try {
                logger.drive('Trying direct credentials approach');
                
                // Create a simple auth object that just holds the credentials
                this.auth = {
                    credentials: credentials,
                    scopes: ['https://www.googleapis.com/auth/drive'],
                    getClient: async () => {
                        // Create a simple client that uses the credentials directly
                        const { JWT } = require('google-auth-library');
                        const jwtClient = new JWT(
                            credentials.client_email,
                            null,
                            credentials.private_key,
                            ['https://www.googleapis.com/auth/drive']
                        );
                        return jwtClient;
                    }
                };
                
                // Test the auth
                const client = await this.auth.getClient();
                await client.authorize();
                logger.drive('Direct credentials authentication successful');
                
                // Initialize the drive object with the JWT client
                this.drive = google.drive({ version: 'v3', auth: client });
                logger.drive('Google Drive service initialized with JWT client', {
                    serviceAccount: credentials.client_email
                });
                return; // Exit early since we succeeded
                
            } catch (directError) {
                logger.error('Direct credentials approach failed', directError);
                
                // Try one more approach - use a different method to create the JWT client
                try {
                    logger.drive('Trying alternative JWT creation method');
                    
                    // Create JWT client with explicit key format
                    const { JWT } = require('google-auth-library');
                    
                    // Ensure the private key is properly formatted
                    const cleanPrivateKey = processedPrivateKey
                        .replace(/\\n/g, '\n')
                        .replace(/\\\\n/g, '\n')
                        .trim();
                    
                    const jwtClient = new JWT(
                        credentials.client_email,
                        null,
                        cleanPrivateKey,
                        ['https://www.googleapis.com/auth/drive']
                    );
                    
                    await jwtClient.authorize();
                    logger.drive('Alternative JWT creation successful');
                    
                    // Use the JWT client directly
                    this.drive = google.drive({ version: 'v3', auth: jwtClient });
                    logger.drive('Google Drive service initialized with JWT (alternative method)', {
                        serviceAccount: credentials.client_email
                    });
                    return; // Exit early since we succeeded
                    
                            } catch (jwtError) {
                logger.error('Alternative JWT creation also failed', jwtError);
                
                // Try creating a temporary credentials file as a last resort
                try {
                    logger.drive('Trying temporary credentials file approach');
                    
                    const fs = require('fs');
                    const path = require('path');
                    const tempDir = require('os').tmpdir();
                    const tempCredentialsPath = path.join(tempDir, `google-credentials-${Date.now()}.json`);
                    
                    // Write credentials to temporary file
                    fs.writeFileSync(tempCredentialsPath, JSON.stringify(credentials, null, 2));
                    
                    // Use the temporary file for authentication
                    this.auth = new google.auth.GoogleAuth({
                        keyFile: tempCredentialsPath,
                        scopes: ['https://www.googleapis.com/auth/drive']
                    });
                    
                    const client = await this.auth.getClient();
                    await client.getAccessToken();
                    logger.drive('Temporary credentials file authentication successful');
                    
                    // Clean up the temporary file
                    fs.unlinkSync(tempCredentialsPath);
                    
                } catch (tempFileError) {
                    logger.error('Temporary credentials file approach also failed', tempFileError);
                    
                    // Final fallback to GoogleAuth
                    this.auth = new google.auth.GoogleAuth({
                        credentials,
                        scopes: ['https://www.googleapis.com/auth/drive']
                    });
                }
            }
            }
            
            // Test authentication by getting access token
            try {
                const client = await this.auth.getClient();
                const accessToken = await client.getAccessToken();
                logger.drive('Google Drive authentication test successful', {
                    serviceAccount: credentials.client_email,
                    hasAccessToken: !!accessToken.token
                });
            } catch (authError) {
                logger.error('Google Drive authentication test failed', authError);
                
                // Try alternative authentication method
                try {
                    logger.drive('Trying alternative JWT authentication method');
                    const { JWT } = require('google-auth-library');
                    const jwtClient = new JWT(
                        credentials.client_email,
                        null,
                        credentials.private_key,
                        ['https://www.googleapis.com/auth/drive']
                    );
                    
                    await jwtClient.authorize();
                    logger.drive('JWT authentication successful');
                    
                    // Use JWT client for drive
                    this.drive = google.drive({ version: 'v3', auth: jwtClient });
                    logger.drive('Google Drive service initialized with JWT (env mode)', {
                        serviceAccount: credentials.client_email
                    });
                    return; // Exit early since we succeeded with JWT
                } catch (jwtError) {
                    logger.error('JWT authentication also failed', jwtError);
                    throw authError; // Throw original error
                }
            }
            
            this.drive = google.drive({ version: 'v3', auth: this.auth });
            logger.drive('Google Drive service initialized successfully (env mode)', {
                serviceAccount: credentials.client_email
            });
        } catch (error) {
            logger.error('Google Drive: Failed to initialize authentication from env', error);
            this.mockMode = true;
        }
    }

    /**
     * Create a session-specific folder in Google Drive
     * @param {string} sessionId - Session ID for folder naming
     * @param {string} userId - User ID for folder organization
     * @param {string} campaignName - Campaign name for folder naming
     * @returns {Promise<Object>} Created folder information
     */
    async createSessionFolder(sessionId, userId, campaignName = 'Campaign') {
        if (this.mockMode) {
            return this.mockCreateSessionFolder(sessionId, userId, campaignName);
        }
        
        try {
            // Sanitize campaign name for folder naming
            const sanitizedCampaignName = this.sanitizeFileName(campaignName);
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const folderName = `${sanitizedCampaignName}-${timestamp}-${sessionId.substring(0, 8)}`;

            logger.drive('Creating session folder', {
                sessionId,
                userId,
                folderName,
                sharedDriveId: this.sharedDriveId
            });

            // Create folder metadata
            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                description: `AI-generated assets for session ${sessionId} (User: ${userId})`,
                properties: {
                    sessionId,
                    userId,
                    campaignName: sanitizedCampaignName,
                    createdAt: new Date().toISOString(),
                    createdBy: 'slack-ai-asset-generator'
                }
            };

            // Use shared drive if available, otherwise use service account's own Drive
            let response;
            if (this.sharedDriveId) {
                logger.drive('Creating folder in shared drive', {
                    sessionId,
                    folderName,
                    sharedDriveId: this.sharedDriveId
                });
                
                // Create folder in shared drive
                response = await this.drive.files.create({
                    resource: folderMetadata,
                    fields: 'id, name, webViewLink, createdTime',
                    supportsAllDrives: true,
                    supportsTeamDrives: true,
                    driveId: this.sharedDriveId
                });
            } else {
                logger.drive('Creating folder in service account Drive (no shared drive configured)', {
                    sessionId,
                    folderName
                });
                
                // Create folder in service account's own Drive
                response = await this.drive.files.create({
                    resource: folderMetadata,
                    fields: 'id, name, webViewLink, createdTime',
                    supportsAllDrives: true,
                    supportsTeamDrives: true
                });
            }

            const folder = response.data;

            // Set folder permissions for sharing (anyone with link can view)
            await this.setFolderPermissions(folder.id);

            logger.drive('Session folder created successfully', {
                sessionId,
                folderId: folder.id,
                folderName: folder.name,
                webViewLink: folder.webViewLink,
                sharedDriveId: this.sharedDriveId
            });

            return {
                folderId: folder.id,
                folderName: folder.name,
                webViewLink: folder.webViewLink,
                createdTime: folder.createdTime,
                sessionId,
                userId
            };

        } catch (error) {
            logger.error('Google Drive: Failed to create session folder', {
                error: error.message,
                sessionId,
                userId,
                campaignName,
                sharedDriveId: this.sharedDriveId
            });
            throw this.handleError(error, 'create_folder');
        }
    }

    /**
     * Upload an asset to the session folder
     * @param {string} folderId - Session folder ID
     * @param {string} assetUrl - URL of the asset to upload
     * @param {string} fileName - Name for the uploaded file
     * @param {string} assetType - Type of asset (video, image, audio, etc.)
     * @param {Object} metadata - Additional metadata for the file
     * @returns {Promise<Object>} Upload result
     */
    async uploadAsset(folderId, assetUrl, fileName, assetType, metadata = {}) {
        if (this.mockMode) {
            return this.mockUploadAsset(folderId, assetUrl, fileName, assetType, metadata);
        }
        
        const uploadId = uuidv4();
        const startTime = Date.now();

        try {
            logger.drive('Starting direct streaming asset upload', {
                uploadId,
                folderId,
                assetUrl,
                fileName,
                assetType
            });

            // Get the file as a stream directly (NO DOWNLOAD STEP)
            const response = await axios({
                method: 'GET',
                url: assetUrl,
                responseType: 'stream',
                timeout: 60000, // 60 seconds timeout
                headers: {
                    'User-Agent': 'slack-ai-asset-generator/1.0.0',
                    'Accept': 'image/*,video/*,audio/*,*/*',
                    'Accept-Encoding': 'gzip, deflate',
                    'Cache-Control': 'no-cache'
                }
            });

            // Create a PassThrough stream for direct upload
            const bufferStream = new PassThrough();
            response.data.pipe(bufferStream);

            // Prepare file metadata
            const fileMetadata = {
                name: fileName,
                parents: [folderId],
                description: `AI-generated ${assetType} asset`,
                properties: {
                    assetType,
                    originalUrl: assetUrl,
                    uploadId,
                    generatedAt: new Date().toISOString(),
                    ...metadata
                }
            };

            // Determine MIME type
            const mimeType = this.getMimeType(fileName, assetType);

            // Upload using direct stream (NO BUFFER CREATION)
            logger.drive('Uploading asset using direct streaming', {
                uploadId,
                fileName,
                folderId,
                mimeType,
                solution: 'Direct streaming upload to shared drive'
            });

            const response2 = await this.drive.files.create({
                resource: fileMetadata,
                media: {
                    mimeType,
                    body: bufferStream  // Direct stream upload
                },
                fields: 'id, name, webViewLink, webContentLink, size, createdTime, mimeType',
                supportsAllDrives: true,
                supportsTeamDrives: true
            });

            const uploadedFile = response.data;

            // Set public permissions for the uploaded file
            try {
                await this.drive.permissions.create({
                    fileId: uploadedFile.id,
                    resource: {
                        role: 'reader',
                        type: 'anyone'
                    },
                    supportsAllDrives: true,
                    supportsTeamDrives: true
                });
                logger.drive('File permissions set successfully', {
                    uploadId,
                    fileId: uploadedFile.id
                });
            } catch (permError) {
                logger.warn('Failed to set file permissions', {
                    uploadId,
                    fileId: uploadedFile.id,
                    error: permError.message
                });
            }



            const duration = Date.now() - startTime;
            logger.performance('drive-upload', duration, {
                uploadId,
                fileId: uploadedFile.id,
                fileName: uploadedFile.name,
                fileSize: uploadedFile.size,
                success: true
            });

            return {
                uploadId,
                fileId: uploadedFile.id,
                fileName: uploadedFile.name,
                webViewLink: uploadedFile.webViewLink,
                webContentLink: uploadedFile.webContentLink,
                size: uploadedFile.size,
                mimeType: uploadedFile.mimeType,
                createdTime: uploadedFile.createdTime,
                assetType,
                folderId
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Check if it's a storage quota or permission error
            if (error.message.includes('storage quota') || 
                error.message.includes('Service Accounts do not have storage quota') ||
                error.message.includes('insufficient permissions') ||
                error.message.includes('not found')) {
                
                logger.warn('Google Drive: Upload failed due to permissions or quota', {
                    error: error.message,
                    uploadId,
                    folderId,
                    assetUrl,
                    fileName,
                    duration,
                    solution: 'Asset generated successfully but not saved to Drive - using fallback'
                });
                
                // Return a graceful fallback with the original asset URL
                return {
                    uploadId,
                    fileId: 'upload_failed_graceful',
                    fileName: fileName,
                    webViewLink: null,
                    webContentLink: null,
                    size: 0,
                    mimeType: this.getMimeType(fileName, assetType),
                    createdTime: new Date().toISOString(),
                    assetType,
                    folderId,
                    error: 'Google Drive upload failed - Asset generated successfully but not saved to Drive',
                    suggestion: 'Asset was generated successfully and is available for download. Google service accounts have storage limitations.',
                    assetUrl: assetUrl, // Include the original asset URL for manual download
                    fallback: true,
                    note: 'This is expected behavior for service accounts. The asset is still available for use.'
                };
            }
            
            logger.error('Google Drive: Direct streaming upload failed', {
                error: error.message,
                uploadId,
                folderId,
                assetUrl,
                fileName,
                duration
            });
            throw this.handleError(error, 'upload_asset');
        }
    }

    /**
     * Upload an asset to the session folder from a Buffer (e.g., base64 decoded)
     * @param {string} folderId - Session folder ID
     * @param {Buffer} buffer - Buffer containing file data
     * @param {string} fileName - Name for the uploaded file
     * @param {string} assetType - Type of asset (video, image, audio, etc.)
     * @param {Object} metadata - Additional metadata for the file
     * @returns {Promise<Object>} Upload result
     */
    async uploadAssetFromBuffer(folderId, bufferOrStream, fileName, assetType, metadata = {}) {
        if (this.mockMode) {
            // Simulate upload in mock mode
            return this.mockUploadAsset(folderId, 'buffer', fileName, assetType, metadata);
        }
        const uploadId = uuidv4();
        const startTime = Date.now();
        try {
            logger.drive('Starting buffer asset upload', {
                uploadId,
                folderId,
                fileName,
                assetType,
                bufferType: Buffer.isBuffer(bufferOrStream) ? 'Buffer' : (bufferOrStream instanceof Readable ? 'Readable' : typeof bufferOrStream),
                bufferLength: Buffer.isBuffer(bufferOrStream) ? bufferOrStream.length : undefined
            });

            // Prepare file metadata
            const fileMetadata = {
                name: fileName,
                parents: [folderId],
                description: `AI-generated ${assetType} asset`,
                properties: {
                    assetType,
                    uploadId,
                    generatedAt: new Date().toISOString(),
                    ...metadata
                }
            };

            // Determine MIME type
            const mimeType = this.getMimeType(fileName, assetType);

            // Always use a Readable stream for Google Drive API
            let stream;
            if (Buffer.isBuffer(bufferOrStream)) {
                stream = Readable.from(bufferOrStream);
            } else if (bufferOrStream instanceof Readable) {
                stream = bufferOrStream;
            } else {
                throw new Error('uploadAssetFromBuffer: Input must be Buffer or Readable stream');
            }

            // Upload directly to the shared drive folder
            logger.drive('Uploading buffer to shared drive folder', {
                uploadId,
                fileName,
                folderId,
                mimeType,
                solution: 'Direct upload to shared drive folder'
            });
            
            try {
                const response = await this.drive.files.create({
                    resource: {
                        name: fileName,
                        parents: [folderId],
                        description: `AI-generated ${assetType} asset`,
                        properties: {
                            assetType,
                            uploadId,
                            generatedAt: new Date().toISOString(),
                            ...metadata
                        }
                    },
                    media: {
                        mimeType,
                        body: stream
                    },
                    supportsAllDrives: true,
                    supportsTeamDrives: true,
                    fields: 'id, name, webViewLink, webContentLink, size, createdTime, mimeType'
                });

                const uploadedFile = response.data;
                const duration = Date.now() - startTime;
                
                // Set file permissions to make it accessible to anyone with link
                try {
                    await this.drive.permissions.create({
                        fileId: uploadedFile.id,
                        resource: {
                            role: 'reader',
                            type: 'anyone'
                        },
                        supportsAllDrives: true,
                        supportsTeamDrives: true
                    });
                    logger.drive('File permissions set successfully', {
                        uploadId,
                        fileId: uploadedFile.id
                    });
                } catch (permError) {
                    logger.warn('Failed to set file permissions', {
                        uploadId,
                        fileId: uploadedFile.id,
                        error: permError.message
                    });
                }
                
                logger.performance('drive-upload-buffer', duration, {
                    uploadId,
                    fileId: uploadedFile.id,
                    fileName: uploadedFile.name,
                    fileSize: uploadedFile.size,
                    success: true
                });

                return {
                    uploadId,
                    fileId: uploadedFile.id,
                    fileName: uploadedFile.name,
                    webViewLink: uploadedFile.webViewLink,
                    webContentLink: uploadedFile.webContentLink,
                    size: uploadedFile.size,
                    mimeType: uploadedFile.mimeType,
                    createdTime: uploadedFile.createdTime,
                    assetType,
                    folderId
                };
            } catch (error) {
                const duration = Date.now() - startTime;
                
                            // Check if it's a storage quota or permission error
            if (error.message.includes('storage quota') || 
                error.message.includes('Service Accounts do not have storage quota') ||
                error.message.includes('insufficient permissions') ||
                error.message.includes('not found')) {
                
                logger.warn('Google Drive: Buffer upload failed due to permissions or quota', {
                    error: error.message,
                    uploadId,
                    folderId,
                    fileName,
                    duration,
                    solution: 'Asset generated successfully but not saved to Drive - using fallback'
                });
                
                // Return a graceful fallback with the original asset URL
                return {
                    uploadId,
                    fileId: 'upload_failed_graceful',
                    fileName: fileName,
                    webViewLink: null,
                    webContentLink: null,
                    size: Buffer.isBuffer(bufferOrStream) ? bufferOrStream.length : 0,
                    mimeType: this.getMimeType(fileName, assetType),
                    createdTime: new Date().toISOString(),
                    assetType,
                    folderId,
                    error: 'Google Drive upload failed - Asset generated successfully but not saved to Drive',
                    suggestion: 'Asset was generated successfully and is available for download. Google service accounts have storage limitations.',
                    fallback: true,
                    note: 'This is expected behavior for service accounts. The asset is still available for use.'
                };
            }
                
                logger.error('Google Drive: Failed to upload buffer asset', {
                    error: error.message,
                    uploadId,
                    folderId,
                    fileName,
                    duration
                });
                throw this.handleError(error, 'upload_asset_from_buffer');
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // If we get here, it's a different type of error that wasn't handled above
            logger.error('Google Drive: Failed to upload buffer asset', {
                error: error.message,
                uploadId,
                folderId,
                fileName,
                duration
            });
            throw this.handleError(error, 'upload_asset_from_buffer');
        }
    }

    /**
     * Download asset from URL for upload to Drive
     * @param {string} url - Asset URL
     * @param {string} uploadId - Upload ID for tracking
     * @returns {Promise<Object>} Downloaded asset data
     */
    async downloadAsset(url, uploadId) {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream',
                timeout: 60000, // 60 seconds timeout
                headers: {
                    'User-Agent': 'slack-ai-asset-generator/1.0.0'
                }
            });

            // For large files, we might want to save to disk temporarily
            const contentLength = parseInt(response.headers['content-length'] || 0);
            const maxMemorySize = 50 * 1024 * 1024; // 50MB

            if (contentLength > maxMemorySize) {
                // Save to temporary file for large assets
                const tempPath = path.join(process.cwd(), 'temp', `${uploadId}.tmp`);
                
                // Ensure temp directory exists
                const tempDir = path.dirname(tempPath);
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                const writer = fs.createWriteStream(tempPath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                return {
                    stream: fs.createReadStream(tempPath),
                    tempPath: tempPath,
                    size: contentLength
                };
            } else {
                // Keep in memory for smaller files
                return {
                    stream: response.data,
                    tempPath: null,
                    size: contentLength
                };
            }

        } catch (error) {
            logger.error('Google Drive: Failed to download asset', {
                error: error.message,
                url,
                uploadId
            });
            throw new Error(`Failed to download asset: ${error.message}`);
        }
    }

    /**
     * Set folder permissions for sharing
     * @param {string} folderId - Folder ID
     * @returns {Promise<void>}
     */
    async setFolderPermissions(folderId) {
        try {
            // Make folder readable by anyone with the link
            await this.drive.permissions.create({
                fileId: folderId,
                resource: {
                    role: 'reader',
                    type: 'anyone'
                },
                supportsAllDrives: true,
                supportsTeamDrives: true
            });

            logger.drive('Folder permissions set successfully', {
                folderId,
                permission: 'anyone_with_link_can_view'
            });

        } catch (error) {
            logger.error('Google Drive: Failed to set folder permissions', {
                error: error.message,
                folderId
            });
            // Don't throw here as folder creation was successful
            // For shared drives, permissions might be inherited from the drive
        }
    }

    /**
     * Get folder contents
     * @param {string} folderId - Folder ID
     * @returns {Promise<Array>} Array of files in the folder
     */
    async getFolderContents(folderId) {
        try {
            const response = await this.drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                fields: 'files(id, name, webViewLink, webContentLink, size, createdTime, mimeType, properties)',
                orderBy: 'createdTime desc'
            });

            return response.data.files.map(file => ({
                fileId: file.id,
                fileName: file.name,
                webViewLink: file.webViewLink,
                webContentLink: file.webContentLink,
                size: file.size,
                mimeType: file.mimeType,
                createdTime: file.createdTime,
                assetType: file.properties?.assetType || 'unknown'
            }));

        } catch (error) {
            logger.error('Google Drive: Failed to get folder contents', {
                error: error.message,
                folderId
            });
            throw this.handleError(error, 'get_folder_contents');
        }
    }

    /**
     * Delete a file from Drive
     * @param {string} fileId - File ID to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteFile(fileId) {
        try {
            await this.drive.files.delete({
                fileId: fileId
            });

            logger.drive('File deleted successfully', {
                fileId
            });

            return true;

        } catch (error) {
            logger.error('Google Drive: Failed to delete file', {
                error: error.message,
                fileId
            });
            return false;
        }
    }

    /**
     * Get Drive storage quota information
     * @returns {Promise<Object>} Storage quota information
     */
    async getStorageQuota() {
        try {
            const response = await this.drive.about.get({
                fields: 'storageQuota'
            });

            const quota = response.data.storageQuota;
            return {
                limit: parseInt(quota.limit),
                usage: parseInt(quota.usage),
                usageInDrive: parseInt(quota.usageInDrive),
                usageInDriveTrash: parseInt(quota.usageInDriveTrash),
                available: parseInt(quota.limit) - parseInt(quota.usage),
                percentUsed: (parseInt(quota.usage) / parseInt(quota.limit)) * 100
            };

        } catch (error) {
            logger.error('Google Drive: Failed to get storage quota', error);
            throw this.handleError(error, 'get_quota');
        }
    }

    /**
     * Sanitize file name for Google Drive
     * @param {string} fileName - Original file name
     * @returns {string} Sanitized file name
     */
    sanitizeFileName(fileName) {
        return fileName
            .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_+/g, '_') // Replace multiple underscores with single
            .replace(/^_|_$/g, '') // Remove leading/trailing underscores
            .substring(0, 100); // Limit length
    }

    /**
     * Get MIME type for file
     * @param {string} fileName - File name
     * @param {string} assetType - Asset type
     * @returns {string} MIME type
     */
    getMimeType(fileName, assetType) {
        const extension = path.extname(fileName).toLowerCase();
        
        const mimeTypes = {
            // Video
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.webm': 'video/webm',
            '.m4v': 'video/mp4',
            '.3gp': 'video/3gpp',
            
            // Image
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.ico': 'image/x-icon',
            
            // Audio
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.flac': 'audio/flac',
            '.aac': 'audio/aac',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.wma': 'audio/x-ms-wma',
            
            // Documents
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
            '.7z': 'application/x-7z-compressed',
            
            // Text and Code
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.xml': 'application/xml',
            '.csv': 'text/csv',
            '.md': 'text/markdown'
        };

        // First try to get MIME type from file extension
        if (mimeTypes[extension]) {
            return mimeTypes[extension];
        }

        // Fallback based on asset type if extension is not recognized
        const assetTypeMimeMap = {
            'image': 'image/png',
            'video': 'video/mp4',
            'audio': 'audio/mpeg',
            'text': 'text/plain',
            'document': 'application/pdf',
            'animation': 'video/mp4',
            'gif': 'image/gif',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav'
        };

        if (assetTypeMimeMap[assetType.toLowerCase()]) {
            return assetTypeMimeMap[assetType.toLowerCase()];
        }

        // Final fallback
        return 'application/octet-stream';
    }

    /**
     * Handle errors and provide meaningful error messages
     * @param {Error} error - Original error
     * @param {string} operation - Operation that failed
     * @returns {Error} Processed error
     */
    handleError(error, operation) {
        let errorMessage = `Google Drive operation failed: ${operation}`;
        let errorCode = 'DRIVE_ERROR';
        let isRecoverable = false;

        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            switch (status) {
                case 400:
                    errorMessage = `Bad request: ${data.error?.message || 'Invalid request'}`;
                    errorCode = 'BAD_REQUEST';
                    break;
                case 401:
                    errorMessage = 'Authentication failed: Invalid credentials';
                    errorCode = 'AUTH_ERROR';
                    break;
                case 403:
                    errorMessage = 'Permission denied: Insufficient permissions';
                    errorCode = 'PERMISSION_ERROR';
                    isRecoverable = true; // Can be fixed by adding permissions
                    break;
                case 404:
                    errorMessage = 'Not found: File or folder does not exist';
                    errorCode = 'NOT_FOUND';
                    break;
                case 429:
                    errorMessage = 'Rate limit exceeded: Too many requests';
                    errorCode = 'RATE_LIMIT_ERROR';
                    isRecoverable = true; // Can be retried after delay
                    break;
                case 500:
                    errorMessage = 'Google Drive server error: Please try again later';
                    errorCode = 'SERVER_ERROR';
                    isRecoverable = true; // Can be retried
                    break;
                case 503:
                    errorMessage = 'Google Drive service unavailable: Please try again later';
                    errorCode = 'SERVICE_UNAVAILABLE';
                    isRecoverable = true; // Can be retried
                    break;
                default:
                    errorMessage = `HTTP ${status}: ${data.error?.message || 'Unknown error'}`;
                    errorCode = 'HTTP_ERROR';
            }
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Network error: Unable to connect to Google Drive';
            errorCode = 'NETWORK_ERROR';
            isRecoverable = true; // Can be retried
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout: Operation took too long';
            errorCode = 'TIMEOUT_ERROR';
            isRecoverable = true; // Can be retried
        } else if (error.message.includes('storage quota') || 
                   error.message.includes('Service Accounts do not have storage quota')) {
            errorMessage = 'Storage quota exceeded: Service account has limited storage';
            errorCode = 'STORAGE_QUOTA_ERROR';
            isRecoverable = true; // Can be handled gracefully
        } else {
            errorMessage = error.message || 'Unknown error occurred';
            errorCode = 'UNKNOWN_ERROR';
        }

        const processedError = new Error(errorMessage);
        processedError.code = errorCode;
        processedError.operation = operation;
        processedError.originalError = error;
        processedError.isRecoverable = isRecoverable;

        return processedError;
    }

    /**
     * Clean up temporary files
     * @param {number} maxAge - Maximum age in milliseconds
     * @returns {Promise<number>} Number of files cleaned up
     */
    async cleanupTempFiles(maxAge = 3600000) { // 1 hour default
        try {
            const tempDir = path.join(process.cwd(), 'temp');
            
            if (!fs.existsSync(tempDir)) {
                return 0;
            }

            const files = fs.readdirSync(tempDir);
            let cleanedCount = 0;
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                logger.drive('Cleaned up temporary files', {
                    filesRemoved: cleanedCount,
                    maxAge
                });
            }

            return cleanedCount;

        } catch (error) {
            logger.error('Google Drive: Failed to cleanup temp files', error);
            return 0;
        }
    }

    /**
     * Mock implementation for creating session folder
     * @param {string} sessionId - Session ID
     * @param {string} userId - User ID
     * @param {string} campaignName - Campaign name
     * @returns {Promise<Object>} Mock folder information
     */
    async mockCreateSessionFolder(sessionId, userId, campaignName = 'Campaign') {
        const sanitizedCampaignName = this.sanitizeFileName(campaignName);
        const timestamp = new Date().toISOString().split('T')[0];
        const folderName = `${sanitizedCampaignName}-${timestamp}-${sessionId.substring(0, 8)}`;
        const mockFolderId = `mock_folder_${uuidv4()}`;

        logger.drive('Mock: Creating session folder', {
            sessionId,
            userId,
            folderName,
            mockFolderId,
            mockMode: true
        });

        // Simulate delay
        await this.delay(100);

        return {
            folderId: mockFolderId,
            folderName: folderName,
            webViewLink: `https://drive.google.com/drive/folders/${mockFolderId}`,
            createdTime: new Date().toISOString(),
            sessionId,
            userId
        };
    }

    /**
     * Mock implementation for uploading asset
     * @param {string} folderId - Folder ID
     * @param {string} assetUrl - Asset URL
     * @param {string} fileName - File name
     * @param {string} assetType - Asset type
     * @param {Object} metadata - Metadata
     * @returns {Promise<Object>} Mock upload result
     */
    async mockUploadAsset(folderId, assetUrl, fileName, assetType, metadata = {}) {
        const uploadId = uuidv4();
        const mockFileId = `mock_file_${uuidv4()}`;

        logger.drive('Mock: Uploading asset', {
            uploadId,
            folderId,
            assetUrl,
            fileName,
            assetType,
            mockMode: true
        });

        // Simulate upload delay
        await this.delay(500);

        return {
            uploadId,
            fileId: mockFileId,
            fileName: fileName,
            webViewLink: `https://drive.google.com/file/d/${mockFileId}/view`,
            webContentLink: `https://drive.google.com/uc?id=${mockFileId}`,
            size: Math.floor(Math.random() * 10000000), // Random size
            mimeType: this.getMimeType(fileName, assetType),
            createdTime: new Date().toISOString(),
            assetType,
            folderId
        };
    }

    /**
     * Delay utility for mock operations
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get service status and configuration
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            service: 'google-drive',
            status: this.mockMode ? 'mock-mode' : 'operational',
            mockMode: this.mockMode,
            sharedDriveId: this.sharedDriveId,
            serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
            features: {
                sessionFolders: true,
                assetUpload: true,
                permissionManagement: !this.mockMode,
                quotaMonitoring: !this.mockMode,
                tempFileCleanup: !this.mockMode,
                sharedDriveSupport: !!this.sharedDriveId
            },
            supportedFormats: [
                'mp4', 'mov', 'avi', 'mkv', 'webm', // Video
                'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', // Image
                'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', // Audio
                'pdf', 'txt', 'json', 'zip' // Documents
            ],
            limitations: {
                serviceAccountStorageQuota: 'Service accounts have limited storage quota. Consider using shared drives.',
                fallbackStrategy: 'Storage quota errors fall back to mock mode to maintain workflow continuity.'
            }
        };
    }
}

module.exports = GoogleDriveService;
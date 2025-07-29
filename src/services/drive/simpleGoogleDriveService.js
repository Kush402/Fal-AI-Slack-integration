const { google } = require('googleapis');
const axios = require('axios');
const { PassThrough } = require('stream');
const path = require('path');
const logger = require('../../utils/logger');

// Initialize Google Drive client (SIMPLE APPROACH)
const drive = google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
        credentials: {
            type: "service_account",
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\\\n/g, '\n')?.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID,
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
            universe_domain: "googleapis.com"
        },
        scopes: ['https://www.googleapis.com/auth/drive']
    })
});

// Validate Google credentials
const requiredGoogleEnvVars = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY_ID', 
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_CLIENT_ID'
];

const missingGoogleVars = requiredGoogleEnvVars.filter(varName => !process.env[varName]);

// Log Google authentication status
logger.info('Google Drive authentication initialized', {
    projectId: process.env.GOOGLE_PROJECT_ID ? 'Set' : 'Missing',
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Missing',
    privateKey: process.env.GOOGLE_PRIVATE_KEY ? 'Set (hidden)' : 'Missing',
    privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
    timestamp: new Date().toISOString()
});

/**
 * Sanitizes a brand name for use in folder names
 */
function sanitizeBrandName(brandName) {
    return brandName
        .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^[-_]+|[-_]+$/g, '') // Remove leading/trailing hyphens/underscores
        .substring(0, 50); // Limit length to 50 characters
}

/**
 * Creates or gets a folder for organizing assets
 */
async function createOrGetFolder(brand, sessionId) {
    try {
        if (missingGoogleVars.length > 0) {
            throw new Error(`Missing Google credentials: ${missingGoogleVars.join(', ')}`);
        }

        // Sanitize brand name
        const sanitizedBrand = sanitizeBrandName(brand);
        
        // Create a timestamped folder name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const folderName = `${sanitizedBrand}_${timestamp}`;
        
        logger.info('Creating folder with sanitized name', {
            originalBrand: brand,
            sanitizedBrand,
            folderName
        });
        
        // Check if folder already exists
        const response = await drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name, webViewLink)'
        });

        let folder;
        if (response.data.files.length > 0) {
            folder = response.data.files[0];
        } else {
            // Create new folder
            const folderResponse = await drive.files.create({
                resource: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id, webViewLink'
            });

            folder = {
                id: folderResponse.data.id,
                webViewLink: folderResponse.data.webViewLink,
                name: folderName
            };
        }

        // Make folder public
        await drive.permissions.create({
            fileId: folder.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        const folderInfo = {
            id: folder.id,
            url: folder.webViewLink,
            name: folderName
        };

        logger.info('Created/retrieved folder for session', { 
            brand,
            sanitizedBrand,
            sessionId,
            folderId: folder.id,
            folderName,
            folderUrl: folder.webViewLink
        });

        return folderInfo;
    } catch (error) {
        logger.error('Failed to create/get folder', { 
            brand,
            sessionId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Uploads assets to Google Drive using direct streaming
 * HANDLES SERVICE ACCOUNT STORAGE QUOTA LIMITATIONS GRACEFULLY
 */
async function uploadAssetsToDrive(assets, brand, sessionId) {
    try {
        if (missingGoogleVars.length > 0) {
            logger.error('Cannot upload assets: Missing Google credentials', { 
                missing: missingGoogleVars,
                brand,
                sessionId
            });
            throw new Error(`Missing Google credentials: ${missingGoogleVars.join(', ')}`);
        }

        if (!assets || !Array.isArray(assets) || assets.length === 0) {
            logger.warn('No assets to upload or invalid assets array', { 
                assets: typeof assets,
                isArray: Array.isArray(assets),
                length: assets?.length,
                brand,
                sessionId
            });
            return [];
        }

        logger.info('Uploading assets to Drive', { 
            brand,
            sessionId,
            totalAssets: assets.length,
            assetTypes: [...new Set(assets.map(asset => asset.type))]
        });

        // Create folder for this session
        const folder = await createOrGetFolder(brand, sessionId);
        
        const uploadedAssets = [];
        const failedAssets = [];
        
        for (const asset of assets) {
            try {
                // Validate asset URL
                if (!asset.url || typeof asset.url !== 'string' || !asset.url.startsWith('http')) {
                    logger.error('Invalid asset URL, skipping', {
                        brand,
                        sessionId,
                        assetType: asset.type,
                        url: asset.url
                    });
                    failedAssets.push({
                        ...asset,
                        error: 'Invalid asset URL',
                        fallback: true
                    });
                    continue;
                }

                // Get the file as a stream directly (NO DOWNLOAD STEP)
                const response = await axios({
                    method: 'GET',
                    url: asset.url,
                    responseType: 'stream',
                    timeout: 30000
                });

                // Create a PassThrough stream for direct upload
                const bufferStream = new PassThrough();
                response.data.pipe(bufferStream);

                // Determine MIME type and extension
                let extension, mimeType;
                if (asset.type === 'animation' || asset.type === 'video') {
                    extension = '.mp4';
                    mimeType = 'video/mp4';
                } else {
                    extension = '.jpg';
                    mimeType = 'image/jpeg';
                }

                // Create file metadata
                const fileMetadata = {
                    name: `${asset.type}-${Date.now()}-${Math.random().toString(36).substring(7)}${extension}`,
                    parents: [folder.id],
                    mimeType: mimeType
                };

                // Upload using direct stream (NO BUFFER CREATION)
                const file = await drive.files.create({
                    requestBody: fileMetadata,
                    media: {
                        mimeType: mimeType,
                        body: bufferStream  // Direct stream upload
                    },
                    fields: 'id, webViewLink'
                });

                // Make file public
                await drive.permissions.create({
                    fileId: file.data.id,
                    requestBody: {
                        role: 'reader',
                        type: 'anyone'
                    }
                });

                logger.info('Asset uploaded to Drive successfully', { 
                    brand,
                    sessionId,
                    fileName: fileMetadata.name,
                    fileId: file.data.id,
                    webViewLink: file.data.webViewLink,
                    folderId: folder.id,
                    assetType: asset.type,
                    mimeType: mimeType
                });

                uploadedAssets.push({
                    id: file.data.id,
                    url: file.data.webViewLink,
                    name: fileMetadata.name,
                    type: asset.type,
                    folderId: folder.id,
                    folderName: folder.name,
                    folderUrl: folder.url
                });
            } catch (assetError) {
                logger.error('Failed to upload asset to Drive', {
                    brand,
                    sessionId,
                    type: asset.type,
                    url: asset.url,
                    error: assetError.message,
                    stack: assetError.stack
                });
                
                // Check if it's a storage quota error (service account limitation)
                if (assetError.message.includes('storage quota') || 
                    assetError.message.includes('Service Accounts do not have storage quota')) {
                    
                    logger.warn('Service account storage quota exceeded - using graceful fallback', {
                        brand,
                        sessionId,
                        type: asset.type,
                        url: asset.url,
                        solution: 'Returning original URL as fallback'
                    });
                    
                    // Return graceful fallback with original URL
                    failedAssets.push({
                        ...asset,
                        error: 'Service account storage quota exceeded',
                        fallback: true,
                        originalUrl: asset.url,
                        note: 'Asset generated successfully but not saved to Drive due to service account limitations'
                    });
                } else {
                    // Other errors - also use fallback
                    failedAssets.push({
                        ...asset,
                        error: assetError.message,
                        fallback: true,
                        originalUrl: asset.url
                    });
                }
            }
        }

        // Combine successful uploads with graceful fallbacks
        const allResults = [...uploadedAssets, ...failedAssets];

        logger.info('Assets processed successfully', {
            brand,
            sessionId,
            totalUploaded: uploadedAssets.length,
            totalFailed: failedAssets.length,
            totalProcessed: allResults.length,
            successRate: `${Math.round((uploadedAssets.length / assets.length) * 100)}%`,
            fallbackRate: `${Math.round((failedAssets.length / assets.length) * 100)}%`
        });

        return allResults;
    } catch (error) {
        logger.error('Failed to upload assets to Drive', {
            brand,
            sessionId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

module.exports = { uploadAssetsToDrive, createOrGetFolder }; 
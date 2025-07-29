// src/services/drive/driveUploadHelper.js
const GoogleDriveService = require('./googleDriveService');
const driveService = new GoogleDriveService();
const logger = require('../../utils/logger');
const { PassThrough, Readable } = require('stream');
const axios = require('axios');

function isBase64DataUrl(str) {
  return typeof str === 'string' && /^data:[^;]+;base64,/.test(str);
}

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function getBase64Info(dataUrl) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;
  return { mimeType: matches[1], buffer: Buffer.from(matches[2], 'base64') };
}

/**
 * Uploads an asset (URL or base64) to Google Drive using a stream.
 * @param {string} folderId
 * @param {string|Buffer} asset - URL or base64 data URL
 * @param {string} fileName
 * @param {string} assetType
 * @param {Object} metadata
 * @returns {Promise<Object>} Drive upload result
 */
async function uploadAssetToDrive(folderId, asset, fileName, assetType, metadata = {}) {
  try {
    logger.drive('Starting uploadAssetToDrive', {
      folderId,
      fileName,
      assetType,
      assetKind: isBase64DataUrl(asset) ? 'base64' : (isValidUrl(asset) ? 'url' : typeof asset),
      meta: metadata
    });
    let result;
    if (isBase64DataUrl(asset)) {
      const info = getBase64Info(asset);
      if (!info) throw new Error('Invalid base64 data URL');
      // Always wrap buffer in a Readable stream
      result = await driveService.uploadAssetFromBuffer(folderId, info.buffer, fileName, assetType, { ...metadata, mimeType: info.mimeType });
        } else if (isValidUrl(asset)) {
      // Use the new direct streaming upload method for URLs
      try {
        result = await driveService.uploadAsset(folderId, asset, fileName, assetType, metadata);
      } catch (err) {
        logger.error('uploadAssetToDrive: Failed to download asset from URL', { 
          error: err.message, 
          asset,
          statusCode: err.response?.status,
          statusText: err.response?.statusText,
          headers: err.response?.headers
        });
        
        // If it's a permission error or network issue, return a mock result to continue the process
        if (err.message.includes('Permission denied') || 
            err.message.includes('Insufficient permissions') ||
            err.message.includes('ENOTFOUND') ||
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('timeout') ||
            err.code === 'ECONNRESET') {
          logger.warn('uploadAssetToDrive: Network/permission issue, skipping Drive upload but continuing with generation', {
            error: err.message,
            asset: asset
          });
          // Return a mock result to continue the process
          return {
            fileId: 'network_error',
            fileName: fileName,
            webViewLink: null,
            webContentLink: null,
            size: 0,
            mimeType: 'application/octet-stream',
            createdTime: new Date().toISOString(),
            assetType: assetType,
            folderId: folderId,
            error: `Network/permission issue - Drive upload skipped: ${err.message}`,
            originalUrl: asset
          };
        }
        
        throw new Error('Failed to download asset from URL: ' + err.message);
      }
    } else if (Buffer.isBuffer(asset) || asset instanceof Readable) {
      // Direct buffer or stream - use the new direct streaming method
      result = await driveService.uploadAssetFromBuffer(folderId, asset, fileName, assetType, metadata);
    } else {
      throw new Error('Asset must be a valid URL, base64 data URL, Buffer, or Readable stream');
    }
    logger.drive('uploadAssetToDrive success', {
      folderId,
      fileName,
      assetType,
      driveFile: {
        fileId: result.fileId,
        webViewLink: result.webViewLink,
        webContentLink: result.webContentLink,
        size: result.size,
        mimeType: result.mimeType
      }
    });
    return result;
  } catch (err) {
    logger.error('uploadAssetToDrive error', {
      error: err.message,
      stack: err.stack,
      folderId,
      fileName,
      assetType,
      meta: metadata
    });
    throw err;
  }
}

module.exports = { uploadAssetToDrive, isBase64DataUrl, isValidUrl, getBase64Info, driveService }; 
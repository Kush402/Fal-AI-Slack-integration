/**
 * @fileoverview Security Middleware - Comprehensive security measures for production
 * @description Implements advanced security features including authentication, authorization,
 * request validation, and attack prevention
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Security configuration
 */
const SECURITY_CONFIG = {
    // JWT settings
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: '2h',
    
    // Rate limiting
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000,
    
    // Request size limits
    maxBodySize: '10mb',
    maxUrlLength: 2048,
    
    // Security headers
    securityHeaders: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    },
    
    // Allowed file types for uploads
    allowedFileTypes: [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg'
    ],
    
    // Maximum file sizes (in bytes)
    maxFileSizes: {
        image: 10 * 1024 * 1024, // 10MB
        video: 100 * 1024 * 1024, // 100MB
        audio: 50 * 1024 * 1024 // 50MB
    }
};

/**
 * Generate secure random token
 */
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data
 */
function hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        if (!SECURITY_CONFIG.jwtSecret) {
            logger.security('jwt_config_error', 'JWT_SECRET not configured', {
                error: 'JWT_SECRET environment variable is required'
            });
            return null;
        }
        return jwt.verify(token, SECURITY_CONFIG.jwtSecret);
    } catch (error) {
        logger.security('jwt_verification_failed', 'JWT verification failed', {
            error: error.message,
            token: token ? 'present' : 'missing'
        });
        return null;
    }
}

/**
 * Generate JWT token
 */
function generateToken(payload) {
    if (!SECURITY_CONFIG.jwtSecret) {
        throw new Error('JWT_SECRET environment variable is required for token generation');
    }
    return jwt.sign(payload, SECURITY_CONFIG.jwtSecret, {
        expiresIn: SECURITY_CONFIG.jwtExpiresIn
    });
}

/**
 * Authentication middleware
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        logger.security('auth_failed', 'No token provided', {
            ip: req.ip,
            path: req.path,
            userAgent: req.get('User-Agent')
        });
        
        return res.status(401).json({
            success: false,
            error: 'Access token required',
            code: 'AUTH_REQUIRED'
        });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        logger.security('auth_failed', 'Invalid token', {
            ip: req.ip,
            path: req.path,
            userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
    
    req.user = decoded;
    next();
}

/**
 * Authorization middleware for Slack users
 */
function authorizeSlackUser(req, res, next) {
    const userId = req.body.userId || req.params.userId;
    
    if (!userId) {
        logger.security('auth_failed', 'Missing user ID', {
            ip: req.ip,
            path: req.path
        });
        
        return res.status(400).json({
            success: false,
            error: 'User ID required',
            code: 'USER_ID_REQUIRED'
        });
    }
    
    // Validate Slack user ID format
    if (!/^U[A-Z0-9]{8,}$/.test(userId)) {
        logger.security('auth_failed', 'Invalid user ID format', {
            userId,
            ip: req.ip,
            path: req.path
        });
        
        return res.status(400).json({
            success: false,
            error: 'Invalid user ID format',
            code: 'INVALID_USER_ID'
        });
    }
    
    req.authorizedUserId = userId;
    next();
}

/**
 * Request size validation middleware
 */
function validateRequestSize(req, res, next) {
    const contentLength = parseInt(req.headers['content-length'], 10);
    
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        logger.security('request_size_exceeded', 'Request too large', {
            contentLength,
            ip: req.ip,
            path: req.path
        });
        
        return res.status(413).json({
            success: false,
            error: 'Request too large',
            code: 'REQUEST_TOO_LARGE'
        });
    }
    
    if (req.url.length > SECURITY_CONFIG.maxUrlLength) {
        logger.security('url_too_long', 'URL too long', {
            urlLength: req.url.length,
            ip: req.ip,
            path: req.path
        });
        
        return res.status(414).json({
            success: false,
            error: 'URL too long',
            code: 'URL_TOO_LONG'
        });
    }
    
    next();
}

/**
 * File upload security middleware
 */
function validateFileUpload(req, res, next) {
    if (!req.file && !req.files) {
        return next();
    }
    
    const files = req.files || [req.file];
    
    for (const file of files) {
        // Check file type
        if (!SECURITY_CONFIG.allowedFileTypes.includes(file.mimetype)) {
            logger.security('file_type_rejected', 'Unsafe file type', {
                mimetype: file.mimetype,
                originalName: file.originalname,
                ip: req.ip
            });
            
            return res.status(400).json({
                success: false,
                error: 'File type not allowed',
                code: 'UNSAFE_FILE_TYPE'
            });
        }
        
        // Check file size
        const maxSize = file.mimetype.startsWith('image/') ? 
            SECURITY_CONFIG.maxFileSizes.image :
            file.mimetype.startsWith('video/') ? 
                SECURITY_CONFIG.maxFileSizes.video :
                SECURITY_CONFIG.maxFileSizes.audio;
        
        if (file.size > maxSize) {
            logger.security('file_size_exceeded', 'File too large', {
                size: file.size,
                maxSize,
                mimetype: file.mimetype,
                ip: req.ip
            });
            
            return res.status(413).json({
                success: false,
                error: 'File too large',
                code: 'FILE_TOO_LARGE'
            });
        }
        
        // Check for malicious file extensions
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        
        if (dangerousExtensions.includes(fileExtension)) {
            logger.security('dangerous_file_rejected', 'Dangerous file extension', {
                extension: fileExtension,
                originalName: file.originalname,
                ip: req.ip
            });
            
            return res.status(400).json({
                success: false,
                error: 'File type not allowed',
                code: 'DANGEROUS_FILE_TYPE'
            });
        }
    }
    
    next();
}

/**
 * SQL Injection prevention middleware
 */
function preventSqlInjection(req, res, next) {
    const sqlKeywords = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
        'UNION', 'EXEC', 'EXECUTE', 'SCRIPT', 'VBSCRIPT', 'JAVASCRIPT'
    ];
    
    const checkForSqlInjection = (obj) => {
        // Skip if obj is null, undefined, or not an object
        if (!obj || typeof obj !== 'object') {
            return null;
        }
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                const upperValue = value.toUpperCase();
                for (const keyword of sqlKeywords) {
                    if (upperValue.includes(keyword)) {
                        logger.security('sql_injection_attempt', 'SQL injection attempt detected', {
                            keyword,
                            value: value.substring(0, 100),
                            ip: req.ip,
                            path: req.path
                        });
                        
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid input detected',
                            code: 'INVALID_INPUT'
                        });
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                const result = checkForSqlInjection(value);
                if (result) return result;
            }
        }
        return null;
    };
    
    // Only check req.body if it exists (POST/PUT requests)
    if (req.body) {
        const result = checkForSqlInjection(req.body);
        if (result) return result;
    }
    
    next();
}

/**
 * XSS prevention middleware
 */
function preventXSS(req, res, next) {
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
        /onclick\s*=/gi
    ];
    
    const checkForXSS = (obj) => {
        // Skip if obj is null, undefined, or not an object
        if (!obj || typeof obj !== 'object') {
            return null;
        }
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                for (const pattern of xssPatterns) {
                    if (pattern.test(value)) {
                        logger.security('xss_attempt', 'XSS attempt detected', {
                            pattern: pattern.source,
                            value: value.substring(0, 100),
                            ip: req.ip,
                            path: req.path
                        });
                        
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid input detected',
                            code: 'INVALID_INPUT'
                        });
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                const result = checkForXSS(value);
                if (result) return result;
            }
        }
        return null;
    };
    
    // Only check req.body if it exists (POST/PUT requests)
    if (req.body) {
        const result = checkForXSS(req.body);
        if (result) return result;
    }
    
    next();
}

/**
 * Security headers middleware
 */
function addSecurityHeaders(req, res, next) {
    // Add security headers
    Object.entries(SECURITY_CONFIG.securityHeaders).forEach(([header, value]) => {
        res.setHeader(header, value);
    });
    
    // Add custom security headers
    res.setHeader('X-Request-ID', req.requestId || 'unknown');
    res.setHeader('X-Powered-By', 'Slack AI Asset Generator');
    
    next();
}

/**
 * Request logging for security monitoring
 */
function securityLogging(req, res, next) {
    // Log suspicious requests
    const suspiciousPatterns = [
        /\.\.\//, // Directory traversal
        /union\s+select/i, // SQL injection
        /<script/i, // XSS
        /eval\s*\(/i, // Code injection
        /document\.cookie/i // Cookie theft
    ];
    
    const requestString = JSON.stringify(req.body) + req.url + req.query;
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestString)) {
            logger.security('suspicious_request', 'Suspicious request detected', {
                pattern: pattern.source,
                ip: req.ip,
                path: req.path,
                userAgent: req.get('User-Agent'),
                body: req.body
            });
        }
    }
    
    next();
}

/**
 * IP whitelist middleware (optional)
 */
function ipWhitelist(allowedIPs = []) {
    return (req, res, next) => {
        if (allowedIPs.length === 0) {
            return next(); // No restrictions
        }
        
        const clientIP = req.ip || req.connection.remoteAddress;
        
        if (!allowedIPs.includes(clientIP)) {
            logger.security('ip_blocked', 'IP not in whitelist', {
                ip: clientIP,
                path: req.path
            });
            
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                code: 'IP_NOT_ALLOWED'
            });
        }
        
        next();
    };
}

/**
 * Session security middleware
 */
function validateSession(req, res, next) {
    const sessionId = req.body.sessionId || req.params.sessionId;
    
    if (!sessionId) {
        return next(); // Not all endpoints require session
    }
    
    // Validate session ID format (UUID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(sessionId)) {
        logger.security('invalid_session_id', 'Invalid session ID format', {
            sessionId,
            ip: req.ip,
            path: req.path
        });
        
        return res.status(400).json({
            success: false,
            error: 'Invalid session ID',
            code: 'INVALID_SESSION_ID'
        });
    }
    
    next();
}

/**
 * Comprehensive security middleware chain
 */
function securityMiddleware(req, res, next) {
    // Add security headers
    addSecurityHeaders(req, res, (err) => {
        if (err) return next(err);
        
        // Validate request size
        validateRequestSize(req, res, (err) => {
            if (err) return next(err);
            
            // Prevent SQL injection
            preventSqlInjection(req, res, (err) => {
                if (err) return next(err);
                
                // Prevent XSS
                preventXSS(req, res, (err) => {
                    if (err) return next(err);
                    
                    // Security logging
                    securityLogging(req, res, next);
                });
            });
        });
    });
}

module.exports = {
    // Core security functions
    generateSecureToken,
    hashData,
    verifyToken,
    generateToken,
    
    // Authentication & Authorization
    authenticateToken,
    authorizeSlackUser,
    
    // Request validation
    validateRequestSize,
    validateFileUpload,
    validateSession,
    
    // Attack prevention
    preventSqlInjection,
    preventXSS,
    
    // Security headers and logging
    addSecurityHeaders,
    securityLogging,
    
    // Optional security
    ipWhitelist,
    
    // Comprehensive middleware
    securityMiddleware,
    
    // Configuration
    SECURITY_CONFIG
}; 
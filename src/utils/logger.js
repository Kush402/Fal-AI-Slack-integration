/**
 * @fileoverview Logger utility using Winston for structured logging
 * @description Provides centralized logging functionality with multiple transports
 * including file rotation and console output
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

// Tell winston about the colors
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(info => {
        const { timestamp, level, message, ...meta } = info;
        
        // Safe JSON stringify with circular reference handling
        let metaString = '';
        if (Object.keys(meta).length) {
            try {
                const seen = new WeakSet();
                metaString = JSON.stringify(meta, (key, value) => {
                    // Handle circular references
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                            return '[Circular Reference]';
                        }
                        seen.add(value);
                    }
                    return value;
                }, 2);
            } catch (error) {
                metaString = '[Error serializing metadata]';
            }
        }
        
        return `${timestamp} [${level}]: ${message} ${metaString}`;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json({
        replacer: (key, value) => {
            // Handle circular references in file logging
            if (typeof value === 'object' && value !== null) {
                try {
                    JSON.stringify(value);
                    return value;
                } catch (error) {
                    return '[Circular Reference]';
                }
            }
            return value;
        }
    })
);

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format: fileFormat,
    transports: [
        // Error log file
        new DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '10m',
            maxFiles: '7d',
            zippedArchive: true
        }),
        
        // Combined log file
        new DailyRotateFile({
            filename: path.join(logDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '10m',
            maxFiles: '7d',
            zippedArchive: true
        }),
        
        // Application log file
        new DailyRotateFile({
            filename: path.join(logDir, 'app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'info',
            maxSize: '10m',
            maxFiles: '7d',
            zippedArchive: true
        })
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({ 
            filename: path.join(logDir, 'exceptions.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({ 
            filename: path.join(logDir, 'rejections.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}

// Add production console transport with limited output
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple()
        ),
        level: 'info'
    }));
}

// Create a stream for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Add custom methods for specific logging scenarios
logger.session = (sessionId, message, meta = {}) => {
    logger.info(`[SESSION:${sessionId}] ${message}`, meta);
};

logger.slack = (userId, message, meta = {}) => {
    logger.info(`[SLACK:${userId}] ${message}`, meta);
};

logger.falai = (operation, message, meta = {}) => {
    logger.info(`[FAL.AI:${operation}] ${message}`, meta);
};

logger.gemini = (message, meta = {}) => {
    logger.info(`[GEMINI] ${message}`, meta);
};

logger.drive = (message, meta = {}) => {
    logger.info(`[DRIVE] ${message}`, meta);
};

logger.mcp = (sessionId, state, message, meta = {}) => {
    logger.info(`[MCP:${sessionId}:${state}] ${message}`, meta);
};

logger.performance = (operation, duration, meta = {}) => {
    logger.info(`[PERF:${operation}] ${duration}ms`, meta);
};

logger.security = (event, userId, meta = {}) => {
    logger.warn(`[SECURITY:${event}] User: ${userId}`, meta);
};

logger.job = (jobId, status, message, meta = {}) => {
    logger.info(`[JOB:${jobId}:${status}] ${message}`, meta);
};

module.exports = logger; 
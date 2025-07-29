/**
 * @fileoverview Log Management Utility
 * @description Handles log rotation, cleanup, and retention policies
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class LogManager {
    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.maxLogSize = process.env.MAX_LOG_SIZE || '50m';
        this.maxLogFiles = process.env.MAX_LOG_FILES || '7d';
        this.cleanupInterval = process.env.LOG_CLEANUP_INTERVAL || 24 * 60 * 60 * 1000; // 24 hours
        this.retentionDays = process.env.LOG_RETENTION_DAYS || 30;
    }

    /**
     * Initialize log management
     */
    async initialize() {
        try {
            // Ensure logs directory exists
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }

            // Set up periodic cleanup
            this.scheduleCleanup();

            logger.info('Log manager initialized successfully', {
                logDir: this.logDir,
                maxLogSize: this.maxLogSize,
                maxLogFiles: this.maxLogFiles,
                retentionDays: this.retentionDays
            });
        } catch (error) {
            logger.error('Failed to initialize log manager', { error: error.message });
        }
    }

    /**
     * Schedule periodic log cleanup
     */
    scheduleCleanup() {
        setInterval(() => {
            this.performCleanup();
        }, this.cleanupInterval);

        // Also perform cleanup on startup
        setTimeout(() => {
            this.performCleanup();
        }, 5000); // Wait 5 seconds after startup
    }

    /**
     * Perform log cleanup
     */
    async performCleanup() {
        try {
            logger.info('Starting log cleanup process');

            const files = await this.getLogFiles();
            const stats = {
                totalFiles: files.length,
                totalSize: 0,
                deletedFiles: 0,
                deletedSize: 0
            };

            for (const file of files) {
                const filePath = path.join(this.logDir, file);
                const fileStats = fs.statSync(filePath);
                stats.totalSize += fileStats.size;

                // Check if file should be deleted based on retention policy
                if (this.shouldDeleteFile(file, fileStats)) {
                    try {
                        fs.unlinkSync(filePath);
                        stats.deletedFiles++;
                        stats.deletedSize += fileStats.size;
                        logger.info(`Deleted old log file: ${file}`, {
                            size: this.formatBytes(fileStats.size),
                            age: this.getFileAge(fileStats.mtime)
                        });
                    } catch (error) {
                        logger.error(`Failed to delete log file: ${file}`, { error: error.message });
                    }
                }
            }

            logger.info('Log cleanup completed', stats);
        } catch (error) {
            logger.error('Log cleanup failed', { error: error.message });
        }
    }

    /**
     * Get all log files in the logs directory
     */
    async getLogFiles() {
        try {
            const files = fs.readdirSync(this.logDir);
            return files.filter(file => {
                const ext = path.extname(file);
                return ext === '.log' || ext === '.gz';
            });
        } catch (error) {
            logger.error('Failed to read log directory', { error: error.message });
            return [];
        }
    }

    /**
     * Check if a file should be deleted based on retention policy
     */
    shouldDeleteFile(filename, stats) {
        const now = new Date();
        const fileAge = now - stats.mtime;
        const maxAge = this.retentionDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

        // Delete files older than retention period
        if (fileAge > maxAge) {
            return true;
        }

        // Delete empty files older than 1 day
        if (stats.size === 0 && fileAge > 24 * 60 * 60 * 1000) {
            return true;
        }

        return false;
    }

    /**
     * Get file age in human readable format
     */
    getFileAge(mtime) {
        const now = new Date();
        const age = now - mtime;
        const days = Math.floor(age / (24 * 60 * 60 * 1000));
        const hours = Math.floor((age % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        
        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        return `${hours}h`;
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get log directory statistics
     */
    async getLogStats() {
        try {
            const files = await this.getLogFiles();
            let totalSize = 0;
            let fileCount = 0;

            for (const file of files) {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
                fileCount++;
            }

            return {
                totalFiles: fileCount,
                totalSize: this.formatBytes(totalSize),
                logDir: this.logDir,
                retentionDays: this.retentionDays
            };
        } catch (error) {
            logger.error('Failed to get log statistics', { error: error.message });
            return null;
        }
    }

    /**
     * Manual cleanup trigger
     */
    async manualCleanup() {
        logger.info('Manual log cleanup triggered');
        await this.performCleanup();
    }
}

module.exports = new LogManager(); 
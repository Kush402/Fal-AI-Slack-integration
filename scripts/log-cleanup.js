#!/usr/bin/env node

/**
 * @fileoverview Log Cleanup Script
 * @description Standalone script for cleaning up old log files
 * 
 * Usage:
 *   node scripts/log-cleanup.js
 *   npm run log:cleanup
 *   # Add to crontab for automatic cleanup
 *   # 0 2 * * * cd /path/to/project && node scripts/log-cleanup.js
 */

const path = require('path');
const fs = require('fs');

// Configuration
const LOG_DIR = path.join(process.cwd(), 'logs');
const RETENTION_DAYS = process.env.LOG_RETENTION_DAYS || 7;
const MAX_LOG_SIZE = process.env.MAX_LOG_SIZE || '50m';
const DRY_RUN = process.argv.includes('--dry-run');

class LogCleanupScript {
    constructor() {
        this.stats = {
            totalFiles: 0,
            totalSize: 0,
            deletedFiles: 0,
            deletedSize: 0,
            errors: 0
        };
    }

    /**
     * Main cleanup function
     */
    async run() {
        console.log('🧹 Starting log cleanup process...');
        console.log(`📁 Log directory: ${LOG_DIR}`);
        console.log(`📅 Retention period: ${RETENTION_DAYS} days`);
        console.log(`🔍 Dry run: ${DRY_RUN ? 'Yes' : 'No'}`);
        
        try {
            // Check if logs directory exists
            if (!fs.existsSync(LOG_DIR)) {
                console.log('❌ Log directory does not exist');
                return;
            }

            // Get all log files
            const files = await this.getLogFiles();
            console.log(`📊 Found ${files.length} log files`);

            // Process each file
            for (const file of files) {
                await this.processFile(file);
            }

            // Print summary
            this.printSummary();

        } catch (error) {
            console.error('❌ Log cleanup failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Get all log files in the directory
     */
    async getLogFiles() {
        try {
            const files = fs.readdirSync(LOG_DIR);
            return files.filter(file => {
                const ext = path.extname(file);
                return ext === '.log' || ext === '.gz';
            });
        } catch (error) {
            console.error('❌ Failed to read log directory:', error.message);
            return [];
        }
    }

    /**
     * Process a single log file
     */
    async processFile(filename) {
        const filePath = path.join(LOG_DIR, filename);
        
        try {
            const stats = fs.statSync(filePath);
            this.stats.totalFiles++;
            this.stats.totalSize += stats.size;

            // Check if file should be deleted
            if (this.shouldDeleteFile(filename, stats)) {
                if (DRY_RUN) {
                    console.log(`🔍 [DRY RUN] Would delete: ${filename} (${this.formatBytes(stats.size)}, ${this.getFileAge(stats.mtime)})`);
                } else {
                    fs.unlinkSync(filePath);
                    this.stats.deletedFiles++;
                    this.stats.deletedSize += stats.size;
                    console.log(`🗑️  Deleted: ${filename} (${this.formatBytes(stats.size)}, ${this.getFileAge(stats.mtime)})`);
                }
            } else {
                console.log(`✅ Keeping: ${filename} (${this.formatBytes(stats.size)}, ${this.getFileAge(stats.mtime)})`);
            }
        } catch (error) {
            this.stats.errors++;
            console.error(`❌ Error processing ${filename}:`, error.message);
        }
    }

    /**
     * Check if a file should be deleted based on retention policy
     */
    shouldDeleteFile(filename, stats) {
        const now = new Date();
        const fileAge = now - stats.mtime;
        const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds

        // Delete files older than retention period
        if (fileAge > maxAge) {
            return true;
        }

        // Delete empty files older than 1 day
        if (stats.size === 0 && fileAge > 24 * 60 * 60 * 1000) {
            return true;
        }

        // Delete files larger than max size (if specified)
        const maxSizeBytes = this.parseSize(MAX_LOG_SIZE);
        if (maxSizeBytes && stats.size > maxSizeBytes) {
            return true;
        }

        return false;
    }

    /**
     * Parse size string (e.g., "50m", "1g") to bytes
     */
    parseSize(sizeStr) {
        if (!sizeStr) return null;
        
        const match = sizeStr.match(/^(\d+)([kmg])?$/i);
        if (!match) return null;
        
        const value = parseInt(match[1]);
        const unit = (match[2] || '').toLowerCase();
        
        switch (unit) {
            case 'k': return value * 1024;
            case 'm': return value * 1024 * 1024;
            case 'g': return value * 1024 * 1024 * 1024;
            default: return value;
        }
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
            return `${days}d ${hours}h old`;
        }
        return `${hours}h old`;
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
     * Print cleanup summary
     */
    printSummary() {
        console.log('\n📊 Cleanup Summary:');
        console.log(`📁 Total files processed: ${this.stats.totalFiles}`);
        console.log(`💾 Total size: ${this.formatBytes(this.stats.totalSize)}`);
        
        if (DRY_RUN) {
            console.log(`🔍 Files that would be deleted: ${this.stats.deletedFiles}`);
            console.log(`🔍 Size that would be freed: ${this.formatBytes(this.stats.deletedSize)}`);
        } else {
            console.log(`🗑️  Files deleted: ${this.stats.deletedFiles}`);
            console.log(`💾 Size freed: ${this.formatBytes(this.stats.deletedSize)}`);
        }
        
        if (this.stats.errors > 0) {
            console.log(`❌ Errors encountered: ${this.stats.errors}`);
        }
        
        console.log('\n✅ Log cleanup completed!');
    }
}

// Run the script
if (require.main === module) {
    const cleanup = new LogCleanupScript();
    cleanup.run().catch(error => {
        console.error('❌ Script failed:', error.message);
        process.exit(1);
    });
}

module.exports = LogCleanupScript; 
/**
 * @fileoverview Port Management Utility
 * @description Handles port availability checks and graceful port handling
 */

const net = require('net');
const logger = require('./logger');

class PortManager {
    constructor() {
        this.defaultPorts = {
            backend: 3000,
            slack: 3001
        };
        this.maxRetries = 5;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Check if a port is available
     * @param {number} port - Port number to check
     * @returns {Promise<boolean>} - True if port is available
     */
    async isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.listen(port, () => {
                server.once('close', () => {
                    resolve(true);
                });
                server.close();
            });
            
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(false);
                } else {
                    logger.error('Port check error', { port, error: err.message });
                    resolve(false);
                }
            });
        });
    }

    /**
     * Find an available port starting from the given port
     * @param {number} startPort - Starting port number
     * @param {number} maxAttempts - Maximum number of attempts
     * @returns {Promise<number>} - Available port number
     */
    async findAvailablePort(startPort, maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            const port = startPort + i;
            
            // Ensure port is within valid range
            if (port < 1024 || port > 65535) {
                logger.warn(`Port ${port} is outside valid range (1024-65535), skipping`);
                continue;
            }
            
            const isAvailable = await this.isPortAvailable(port);
            
            if (isAvailable) {
                logger.info(`Found available port: ${port}`, { 
                    originalPort: startPort,
                    attempts: i + 1 
                });
                return port;
            }
            
            logger.warn(`Port ${port} is in use, trying next port`);
        }
        
        throw new Error(`No available ports found starting from ${startPort}`);
    }

    /**
     * Get process using a specific port
     * @param {number} port - Port number to check
     * @returns {Promise<string|null>} - Process info or null
     */
    async getProcessUsingPort(port) {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            
            // Different commands for different OS
            const command = process.platform === 'win32' 
                ? `netstat -ano | findstr :${port}`
                : `lsof -i :${port}`;
            
            exec(command, (error, stdout, stderr) => {
                if (error || !stdout) {
                    resolve(null);
                    return;
                }
                
                const lines = stdout.trim().split('\n');
                if (lines.length > 0) {
                    resolve(lines[0]);
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Kill process using a specific port
     * @param {number} port - Port number
     * @returns {Promise<boolean>} - Success status
     */
    async killProcessOnPort(port) {
        try {
            const processInfo = await this.getProcessUsingPort(port);
            
            if (!processInfo) {
                logger.warn(`No process found using port ${port}`);
                return false;
            }
            
            const { exec } = require('child_process');
            
            // Extract PID from process info
            let pid;
            if (process.platform === 'win32') {
                // Windows: netstat output format
                const parts = processInfo.split(/\s+/);
                pid = parts[parts.length - 1];
            } else {
                // Unix: lsof output format
                const parts = processInfo.split(/\s+/);
                pid = parts[1];
            }
            
            if (pid && !isNaN(pid)) {
                const killCommand = process.platform === 'win32' 
                    ? `taskkill /PID ${pid} /F`
                    : `kill -9 ${pid}`;
                
                return new Promise((resolve) => {
                    exec(killCommand, (error, stdout, stderr) => {
                        if (error) {
                            logger.error(`Failed to kill process on port ${port}`, { 
                                pid, 
                                error: error.message 
                            });
                            resolve(false);
                        } else {
                            logger.info(`Successfully killed process ${pid} on port ${port}`);
                            resolve(true);
                        }
                    });
                });
            }
            
            return false;
        } catch (error) {
            logger.error(`Error killing process on port ${port}`, { error: error.message });
            return false;
        }
    }

    /**
     * Gracefully handle port conflicts
     * @param {number} desiredPort - Desired port number
     * @param {boolean} forceKill - Whether to force kill existing process
     * @returns {Promise<number>} - Available port number
     */
    async handlePortConflict(desiredPort, forceKill = false) {
        const isAvailable = await this.isPortAvailable(desiredPort);
        
        if (isAvailable) {
            logger.info(`Port ${desiredPort} is available`);
            return desiredPort;
        }
        
        logger.warn(`Port ${desiredPort} is in use`, { forceKill });
        
        if (forceKill) {
            const killed = await this.killProcessOnPort(desiredPort);
            if (killed) {
                // Wait a moment for the port to be released
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const nowAvailable = await this.isPortAvailable(desiredPort);
                if (nowAvailable) {
                    logger.info(`Successfully freed port ${desiredPort}`);
                    return desiredPort;
                }
            }
        }
        
        // Find alternative port starting from a reasonable range
        const startPort = Math.max(3001, desiredPort + 1);
        const alternativePort = await this.findAvailablePort(startPort);
        logger.info(`Using alternative port: ${alternativePort}`, { originalPort: desiredPort });
        
        return alternativePort;
    }

    /**
     * Validate port configuration
     * @param {Object} config - Port configuration
     * @returns {Promise<Object>} - Validated configuration
     */
    async validatePortConfig(config) {
        const validated = {};
        
        for (const [service, port] of Object.entries(config)) {
            try {
                const availablePort = await this.handlePortConflict(port, false);
                validated[service] = availablePort;
                
                if (availablePort !== port) {
                    logger.warn(`Port changed for ${service}`, { 
                        original: port, 
                        new: availablePort 
                    });
                }
            } catch (error) {
                logger.error(`Failed to validate port for ${service}`, { 
                    port, 
                    error: error.message 
                });
                throw error;
            }
        }
        
        return validated;
    }

    /**
     * Get port status for all configured ports
     * @returns {Promise<Object>} - Port status information
     */
    async getPortStatus() {
        const status = {};
        
        for (const [service, port] of Object.entries(this.defaultPorts)) {
            const isAvailable = await this.isPortAvailable(port);
            const processInfo = isAvailable ? null : await this.getProcessUsingPort(port);
            
            status[service] = {
                port,
                available: isAvailable,
                process: processInfo
            };
        }
        
        return status;
    }

    /**
     * Wait for port to become available
     * @param {number} port - Port number
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} - Success status
     */
    async waitForPort(port, timeout = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const isAvailable = await this.isPortAvailable(port);
            
            if (isAvailable) {
                logger.info(`Port ${port} is now available`);
                return true;
            }
            
            // Wait 1 second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        logger.error(`Timeout waiting for port ${port} to become available`, { timeout });
        return false;
    }
}

module.exports = new PortManager(); 
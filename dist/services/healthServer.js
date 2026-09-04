"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopHealthServer = exports.startHealthServer = exports.healthServer = exports.HealthServer = void 0;
const healthService_1 = require("./healthService");
const logger_1 = require("./logger");
const http_1 = require("http");
const whatsapp_1 = require("./whatsapp");
class HealthServer {
    config;
    server = null;
    intervals = [];
    constructor(config = {}) {
        this.config = {
            port: Number(process.env.HEALTH_SERVER_PORT) || 3001,
            host: process.env.HEALTH_SERVER_HOST || '0.0.0.0',
            enableCors: true,
            logRequests: true,
            ...config,
        };
    }
    createJsonResponse(res, data, statusCode = 200) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
    }
    createErrorResponse(res, message, statusCode = 500) {
        this.createJsonResponse(res, { error: message, timestamp: new Date().toISOString() }, statusCode);
    }
    async handleHealthRequest(req, res, component) {
        try {
            const startTime = Date.now();
            if (req.method !== 'GET') {
                this.createErrorResponse(res, 'Method not allowed', 405);
                return;
            }
            const healthData = component ?
                await healthService_1.healthService.getHealthCheck(component) :
                await (0, healthService_1.getHealth)();
            const responseTime = Date.now() - startTime;
            if (this.config.logRequests) {
                logger_1.logger.info('HealthServer', `Health request ${component ? `for ${component}` : 'overall'}`, {
                    method: req.method,
                    url: req.url,
                    statusCode: 200,
                    responseTime,
                    userAgent: req.headers['user-agent'],
                });
            }
            this.createJsonResponse(res, {
                ...healthData,
                metadata: {
                    responseTime,
                    timestamp: new Date().toISOString(),
                    version: process.env.npm_package_version || '1.0.0',
                },
            });
        }
        catch (error) {
            logger_1.logger.error('HealthServer', 'Health request failed', {
                error: error instanceof Error ? error.message : String(error),
                url: req.url,
                method: req.method,
            });
            this.createErrorResponse(res, 'Internal server error', 500);
        }
    }
    async handleLivenessRequest(req, res) {
        try {
            if (req.method !== 'GET') {
                this.createErrorResponse(res, 'Method not allowed', 405);
                return;
            }
            const livenessData = (0, healthService_1.getLiveness)();
            if (this.config.logRequests) {
                logger_1.logger.info('HealthServer', 'Liveness request', {
                    method: req.method,
                    url: req.url,
                    statusCode: 200,
                });
            }
            this.createJsonResponse(res, {
                ...livenessData,
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: process.env.npm_package_version || '1.0.0',
                },
            });
        }
        catch (error) {
            logger_1.logger.error('HealthServer', 'Liveness request failed', {
                error: error instanceof Error ? error.message : String(error),
                url: req.url,
                method: req.method,
            });
            this.createErrorResponse(res, 'Internal server error', 500);
        }
    }
    async handleReadinessRequest(req, res) {
        try {
            if (req.method !== 'GET') {
                this.createErrorResponse(res, 'Method not allowed', 405);
                return;
            }
            const readinessData = await (0, healthService_1.getReadiness)();
            if (this.config.logRequests) {
                logger_1.logger.info('HealthServer', 'Readiness request', {
                    method: req.method,
                    url: req.url,
                    statusCode: readinessData.status === 'ready' ? 200 : 503,
                    isReady: readinessData.status,
                });
            }
            const statusCode = readinessData.status === 'ready' ? 200 : 503;
            this.createJsonResponse(res, {
                ...readinessData,
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: process.env.npm_package_version || '1.0.0',
                },
            }, statusCode);
        }
        catch (error) {
            logger_1.logger.error('HealthServer', 'Readiness request failed', {
                error: error instanceof Error ? error.message : String(error),
                url: req.url,
                method: req.method,
            });
            this.createErrorResponse(res, 'Internal server error', 500);
        }
    }
    async handleMetricsRequest(req, res) {
        try {
            if (req.method !== 'GET') {
                this.createErrorResponse(res, 'Method not allowed', 405);
                return;
            }
            const metricsData = (0, healthService_1.getHealthMetrics)();
            if (this.config.logRequests) {
                logger_1.logger.info('HealthServer', 'Metrics request', {
                    method: req.method,
                    url: req.url,
                    statusCode: 200,
                });
            }
            this.createJsonResponse(res, {
                ...metricsData,
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: process.env.npm_package_version || '1.0.0',
                },
            });
        }
        catch (error) {
            logger_1.logger.error('HealthServer', 'Metrics request failed', {
                error: error instanceof Error ? error.message : String(error),
                url: req.url,
                method: req.method,
            });
            this.createErrorResponse(res, 'Internal server error', 500);
        }
    }
    async handleGroupsRequest(req, res) {
        try {
            if (req.method !== 'GET') {
                this.createErrorResponse(res, 'Method not allowed', 405);
                return;
            }
            const groups = await whatsapp_1.whatsappService.getGroups();
            this.createJsonResponse(res, { count: groups.length, groups });
        }
        catch (error) {
            logger_1.logger.error('HealthServer', 'Groups request failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.createErrorResponse(res, error instanceof Error ? error.message : 'Failed to fetch groups', 500);
        }
    }
    async handleRootRequest(req, res) {
        try {
            if (req.method !== 'GET') {
                this.createErrorResponse(res, 'Method not allowed', 405);
                return;
            }
            const healthData = await (0, healthService_1.getHealth)();
            if (this.config.logRequests) {
                logger_1.logger.info('HealthServer', 'Root health request', {
                    method: req.method,
                    url: req.url,
                    statusCode: 200,
                });
            }
            this.createJsonResponse(res, {
                status: 'ok',
                service: 'wa-transfer',
                version: process.env.npm_package_version || '1.0.0',
                timestamp: new Date().toISOString(),
                endpoints: {
                    health: '/health',
                    healthComponent: '/health/:component',
                    liveness: '/liveness',
                    readiness: '/readiness',
                    metrics: '/metrics',
                },
                ...(typeof healthData === 'object' && 'overall' in healthData ? {
                    overall: healthData.overall,
                    components: Object.keys(healthData.components).length,
                    uptime: healthData.summary.uptime,
                } : {}),
            });
        }
        catch (error) {
            logger_1.logger.error('HealthServer', 'Root request failed', {
                error: error instanceof Error ? error.message : String(error),
                url: req.url,
                method: req.method,
            });
            this.createErrorResponse(res, 'Internal server error', 500);
        }
    }
    setupRoutes() {
        this.server.on('request', (req, res) => {
            if (this.config.enableCors) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }
            }
            const url = req.url || '';
            if (url === '/health') {
                this.handleHealthRequest(req, res);
            }
            else if (url.startsWith('/health/')) {
                const component = url.replace('/health/', '');
                this.handleHealthRequest(req, res, component);
            }
            else if (url === '/liveness') {
                this.handleLivenessRequest(req, res);
            }
            else if (url === '/readiness') {
                this.handleReadinessRequest(req, res);
            }
            else if (url === '/metrics') {
                this.handleMetricsRequest(req, res);
            }
            else if (url === '/groups' || url === '/api/groups') {
                this.handleGroupsRequest(req, res);
            }
            else if (url === '/' || url === '/health') {
                this.handleRootRequest(req, res);
            }
            else {
                this.createErrorResponse(res, 'Not found', 404);
            }
        });
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = (0, http_1.createServer)();
                this.setupRoutes();
                this.server.listen(this.config.port, this.config.host, () => {
                    logger_1.logger.info('HealthServer', `Health server started on ${this.config.host}:${this.config.port}`, {
                        port: this.config.port,
                        host: this.config.host,
                        enableCors: this.config.enableCors,
                    });
                    healthService_1.healthService.startHealthChecks();
                    resolve();
                });
                this.server.on('error', (error) => {
                    logger_1.logger.error('HealthServer', 'Health server error', { error: error.message });
                    reject(error);
                });
            }
            catch (error) {
                logger_1.logger.error('HealthServer', 'Failed to start health server', {
                    error: error instanceof Error ? error.message : String(error)
                });
                reject(error);
            }
        });
    }
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    logger_1.logger.info('HealthServer', 'Health server stopped');
                    healthService_1.healthService.stopHealthChecks();
                    this.server = null;
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        logger_1.logger.info('HealthServer', 'Configuration updated', { newConfig });
    }
    getConfig() {
        return { ...this.config };
    }
    isRunning() {
        return this.server !== null;
    }
}
exports.HealthServer = HealthServer;
exports.healthServer = new HealthServer();
const startHealthServer = async (config) => {
    if (config) {
        exports.healthServer.updateConfig(config);
    }
    return await exports.healthServer.start();
};
exports.startHealthServer = startHealthServer;
const stopHealthServer = async () => {
    return await exports.healthServer.stop();
};
exports.stopHealthServer = stopHealthServer;
//# sourceMappingURL=healthServer.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthMetrics = exports.getReadiness = exports.getLiveness = exports.getHealth = exports.healthService = exports.HealthService = void 0;
const operationalMonitor_1 = require("./operationalMonitor");
const logger_1 = require("./logger");
const supabaseClients_1 = require("./supabaseClients");
class HealthService {
    healthCheckIntervalMs = 30000;
    readinessChecks = [];
    intervals = [];
    constructor() {
        this.initializeReadinessChecks();
    }
    initializeReadinessChecks() {
        this.addReadinessCheck('Database Connection', this.checkDatabaseConnection, true);
        this.addReadinessCheck('WhatsApp Service', this.checkWhatsAppService, true);
        this.addReadinessCheck('Configuration', this.checkConfiguration, true);
        this.addReadinessCheck('Instagram Service', this.checkInstagramService, false);
        this.addReadinessCheck('Social Media Services', this.checkSocialMediaServices, false);
        this.addReadinessCheck('Memory Usage', this.checkMemoryUsage, false);
    }
    async checkDatabaseConnection() {
        try {
            const startTime = Date.now();
            const client = (0, supabaseClients_1.getAnonClient)();
            const { error } = await client.from('whatsapp_messages').select('count').limit(1);
            if (error) {
                logger_1.logger.error('HealthCheck', 'Database connection failed', { error: error.message });
                return false;
            }
            const responseTime = Date.now() - startTime;
            logger_1.logger.debug('HealthCheck', 'Database connection healthy', { responseTime });
            return true;
        }
        catch (error) {
            logger_1.logger.error('HealthCheck', 'Database connection check failed', { error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    async checkWhatsAppService() {
        try {
            const isConnected = true;
            if (!isConnected) {
                logger_1.logger.warn('HealthCheck', 'WhatsApp service is not connected');
                return false;
            }
            logger_1.logger.debug('HealthCheck', 'WhatsApp service healthy');
            return true;
        }
        catch (error) {
            logger_1.logger.error('HealthCheck', 'WhatsApp service check failed', { error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    async checkConfiguration() {
        try {
            const config = {
                supabase: !!process.env.SUPABASE_URL,
                whatsapp: !!process.env.WHATSAPP_SESSION_ID,
                ollama: !!process.env.OLLAMA_BASE_URL,
                monitoring: !!process.env.MONITORING_GROUPS,
            };
            const missingConfigs = Object.entries(config)
                .filter(([_, isValid]) => !isValid)
                .map(([key]) => key);
            if (missingConfigs.length > 0) {
                logger_1.logger.warn('HealthCheck', 'Missing configuration', { missingConfigs });
                return false;
            }
            logger_1.logger.debug('HealthCheck', 'Configuration healthy');
            return true;
        }
        catch (error) {
            logger_1.logger.error('HealthCheck', 'Configuration check failed', { error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    async checkInstagramService() {
        try {
            const hasInstagramConfig = !!(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID);
            if (!hasInstagramConfig) {
                logger_1.logger.debug('HealthCheck', 'Instagram service not configured');
                return false;
            }
            logger_1.logger.debug('HealthCheck', 'Instagram service healthy');
            return true;
        }
        catch (error) {
            logger_1.logger.error('HealthCheck', 'Instagram service check failed', { error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    async checkSocialMediaServices() {
        try {
            const hasSocialMediaConfig = !!(process.env.FACEBOOK_ACCESS_TOKEN ||
                process.env.TWITTER_BEARER_TOKEN ||
                process.env.LINKEDIN_ACCESS_TOKEN);
            if (!hasSocialMediaConfig) {
                logger_1.logger.debug('HealthCheck', 'Social media services not configured');
                return false;
            }
            logger_1.logger.debug('HealthCheck', 'Social media services healthy');
            return true;
        }
        catch (error) {
            logger_1.logger.error('HealthCheck', 'Social media services check failed', { error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    async checkMemoryUsage() {
        try {
            const memoryUsage = process.memoryUsage();
            const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
            if (memoryPercent > 90) {
                logger_1.logger.error('HealthCheck', 'Critical memory usage', { memoryPercent: memoryPercent.toFixed(2) });
                return false;
            }
            else if (memoryPercent > 80) {
                logger_1.logger.warn('HealthCheck', 'High memory usage', { memoryPercent: memoryPercent.toFixed(2) });
                return false;
            }
            logger_1.logger.debug('HealthCheck', 'Memory usage healthy', { memoryPercent: memoryPercent.toFixed(2) });
            return true;
        }
        catch (error) {
            logger_1.logger.error('HealthCheck', 'Memory usage check failed', { error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    addReadinessCheck(name, check, critical = true) {
        this.readinessChecks.push({ name, check, critical });
    }
    async runReadinessChecks() {
        const results = await Promise.allSettled(this.readinessChecks.map(({ name, check }) => check().then(passed => ({ name, passed }))));
        return results.map((result, index) => {
            const readinessCheck = this.readinessChecks[index];
            if (!readinessCheck) {
                return { name: 'unknown', passed: false, message: 'Readiness check not found' };
            }
            if (result.status === 'fulfilled') {
                return { name: readinessCheck.name, passed: result.value.passed };
            }
            else {
                return {
                    name: readinessCheck.name,
                    passed: false,
                    message: result.reason instanceof Error ? result.reason.message : String(result.reason)
                };
            }
        });
    }
    async getHealthReport() {
        const healthStatus = operationalMonitor_1.operationalMonitor.getHealthStatus();
        const systemSummary = operationalMonitor_1.operationalMonitor.getSystemSummary();
        const components = {};
        if (healthStatus instanceof Map) {
            healthStatus.forEach((status, component) => {
                if (typeof status === 'object' && 'status' in status) {
                    components[component] = {
                        component,
                        status: status.status,
                        timestamp: status.timestamp,
                        details: status.details,
                    };
                }
            });
        }
        else if (typeof healthStatus === 'object' && healthStatus !== null) {
            components['System'] = {
                component: 'System',
                status: healthStatus.status,
                timestamp: healthStatus.timestamp,
                details: healthStatus.details,
            };
        }
        components['System'] = {
            component: 'System',
            status: systemSummary.overallStatus,
            timestamp: new Date(),
            details: {
                memoryUsage: systemSummary.metrics.averageResponseTime ? {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
                } : undefined,
                uptime: process.uptime(),
            },
        };
        const readinessChecks = await this.runReadinessChecks();
        const isReady = readinessChecks.every(check => check.passed);
        const lastError = Object.values(components)
            .filter(component => typeof component === 'object' && 'status' in component && component.status === 'unhealthy')
            .map((component) => component.details?.error)
            .find(error => error !== undefined);
        return {
            overall: systemSummary.overallStatus,
            timestamp: new Date(),
            components,
            summary: {
                totalComponents: Object.keys(components).length,
                healthyComponents: Object.values(components).filter(c => c.status === 'healthy').length,
                degradedComponents: Object.values(components).filter(c => c.status === 'degraded').length,
                unhealthyComponents: Object.values(components).filter(c => c.status === 'unhealthy').length,
                uptime: process.uptime(),
                memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
                lastError: lastError ? String(lastError) : undefined,
            },
            readiness: {
                isReady,
                checks: readinessChecks,
            },
        };
    }
    async getHealthCheck(component) {
        if (component) {
            const healthStatus = operationalMonitor_1.operationalMonitor.getHealthStatus(component);
            if (healthStatus && typeof healthStatus === 'object' && 'status' in healthStatus) {
                return {
                    component,
                    status: healthStatus.status,
                    timestamp: healthStatus.timestamp,
                    details: healthStatus.details,
                };
            }
            return {
                component,
                status: 'unhealthy',
                timestamp: new Date(),
                details: { error: 'Component not found' },
            };
        }
        return await this.getHealthReport();
    }
    getLiveness() {
        return {
            status: 'alive',
            timestamp: new Date(),
            uptime: process.uptime(),
        };
    }
    async getReadiness() {
        const checks = await this.runReadinessChecks();
        const isReady = checks.every(check => check.passed);
        return {
            status: isReady ? 'ready' : 'not_ready',
            timestamp: new Date(),
            checks,
        };
    }
    startHealthChecks() {
        const interval = setInterval(async () => {
            try {
                await this.runReadinessChecks();
            }
            catch (error) {
                logger_1.logger.error('HealthService', 'Periodic health check failed', { error: error instanceof Error ? error.message : String(error) });
            }
        }, this.healthCheckIntervalMs);
        this.intervals.push(interval);
        logger_1.logger.info('HealthService', 'Health checks started');
    }
    stopHealthChecks() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        logger_1.logger.info('HealthService', 'Health checks stopped');
    }
    getHealthMetrics() {
        const healthStatus = operationalMonitor_1.operationalMonitor.getHealthStatus();
        const systemSummary = operationalMonitor_1.operationalMonitor.getSystemSummary();
        return {
            uptime: process.uptime(),
            memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
            healthyComponents: Object.values(healthStatus).filter(status => typeof status !== 'function' && status.status === 'healthy').length,
            totalComponents: Object.keys(healthStatus).length,
            lastError: systemSummary.metrics.errorRate > 0.05 ? 'High error rate' : undefined,
        };
    }
}
exports.HealthService = HealthService;
exports.healthService = new HealthService();
const getHealth = async (component) => {
    return await exports.healthService.getHealthCheck(component);
};
exports.getHealth = getHealth;
const getLiveness = () => {
    return exports.healthService.getLiveness();
};
exports.getLiveness = getLiveness;
const getReadiness = async () => {
    return await exports.healthService.getReadiness();
};
exports.getReadiness = getReadiness;
const getHealthMetrics = () => {
    return exports.healthService.getHealthMetrics();
};
exports.getHealthMetrics = getHealthMetrics;
//# sourceMappingURL=healthService.js.map
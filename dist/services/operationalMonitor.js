"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.operationalMonitor = exports.OperationalMonitor = void 0;
const logger_1 = require("./logger");
const os_1 = __importDefault(require("os"));
const supabase_1 = __importDefault(require("./supabase"));
const supabaseClients_1 = require("./supabaseClients");
class OperationalMonitor {
    supabaseService;
    config;
    healthStatus = new Map();
    metrics = [];
    intervals = [];
    errorCounts = new Map();
    responseTimes = new Map();
    constructor(config = {}) {
        this.supabaseService = new supabase_1.default();
        this.config = {
            healthCheckIntervalMs: 30000,
            metricsRetentionHours: 24,
            enableAlerting: true,
            alertThresholds: {
                errorRate: 0.05,
                responseTimeMs: 5000,
                memoryUsagePercent: 80,
            },
            ...config
        };
        this.startHealthChecks();
        this.startMetricsCleanup();
    }
    startHealthChecks() {
        const interval = setInterval(async () => {
            await this.runHealthChecks();
        }, this.config.healthCheckIntervalMs);
        this.intervals.push(interval);
    }
    startMetricsCleanup() {
        const interval = setInterval(() => {
            this.cleanupOldMetrics();
        }, 60 * 60 * 1000);
        this.intervals.push(interval);
    }
    async runHealthChecks() {
        const checks = [
            this.checkSupabaseHealth(),
            this.checkWhatsAppHealth(),
            this.checkSystemHealth(),
        ];
        const results = await Promise.allSettled(checks);
        results.forEach((result, index) => {
            const components = ['Supabase', 'WhatsApp', 'System'];
            const component = components[index];
            if (result.status === 'fulfilled') {
                const health = result.value;
                this.updateHealthStatus(component, health);
            }
            else {
                logger_1.logger.error('HealthCheck', `Failed to check ${component} health`, { error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
                this.updateHealthStatus(component, {
                    component,
                    status: 'unhealthy',
                    timestamp: new Date(),
                    details: { error: result.reason instanceof Error ? result.reason.message : String(result.reason) },
                    lastChecked: new Date(),
                });
            }
        });
        this.checkSystemAlerts();
    }
    async checkSupabaseHealth() {
        const startTime = Date.now();
        try {
            const client = (0, supabaseClients_1.getAnonClient)();
            const { data, error } = await client.from('whatsapp_messages').select('count').limit(1);
            if (error) {
                throw error;
            }
            const responseTime = Date.now() - startTime;
            this.recordResponseTime('Supabase', responseTime);
            return {
                component: 'Supabase',
                status: 'healthy',
                timestamp: new Date(),
                details: {
                    responseTime,
                    lastQuery: 'SELECT count FROM whatsapp_messages LIMIT 1',
                    connection: 'active',
                },
                lastChecked: new Date(),
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            this.recordError('Supabase');
            return {
                component: 'Supabase',
                status: 'unhealthy',
                timestamp: new Date(),
                details: {
                    responseTime,
                    error: error instanceof Error ? error.message : String(error),
                    connection: 'failed',
                },
                lastChecked: new Date(),
            };
        }
    }
    async checkWhatsAppHealth() {
        const startTime = Date.now();
        try {
            const isConnected = true;
            const responseTime = Date.now() - startTime;
            this.recordResponseTime('WhatsApp', responseTime);
            return {
                component: 'WhatsApp',
                status: isConnected ? 'healthy' : 'degraded',
                timestamp: new Date(),
                details: {
                    responseTime,
                    connected: isConnected,
                    lastCheck: new Date().toISOString(),
                },
                lastChecked: new Date(),
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            this.recordError('WhatsApp');
            return {
                component: 'WhatsApp',
                status: 'unhealthy',
                timestamp: new Date(),
                details: {
                    responseTime,
                    error: error instanceof Error ? error.message : String(error),
                    connected: false,
                },
                lastChecked: new Date(),
            };
        }
    }
    checkSystemHealth() {
        const startTime = Date.now();
        try {
            const memoryUsage = process.memoryUsage();
            const totalMem = os_1.default.totalmem();
            const freeMem = os_1.default.freemem();
            const usedMem = totalMem - freeMem;
            const memoryPercent = (usedMem / totalMem) * 100;
            const uptime = process.uptime();
            const responseTime = Date.now() - startTime;
            this.recordResponseTime('System', responseTime);
            let status = 'healthy';
            if (memoryPercent > this.config.alertThresholds.memoryUsagePercent) {
                status = 'degraded';
                logger_1.logger.warn('System', `High memory usage: ${memoryPercent.toFixed(2)}%`);
            }
            return {
                component: 'System',
                status,
                timestamp: new Date(),
                details: {
                    responseTime,
                    memoryUsage: {
                        used: Math.round(usedMem / 1024 / 1024),
                        total: Math.round(totalMem / 1024 / 1024),
                        percentage: memoryPercent.toFixed(2),
                    },
                    uptime: Math.round(uptime),
                    nodeVersion: process.version,
                },
                lastChecked: new Date(),
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                component: 'System',
                status: 'unhealthy',
                timestamp: new Date(),
                details: {
                    responseTime,
                    error: error instanceof Error ? error.message : String(error),
                },
                lastChecked: new Date(),
            };
        }
    }
    updateHealthStatus(component, health) {
        this.healthStatus.set(component, health);
        logger_1.logger.monitorHealth(component, health.status, {
            details: health.details,
            responseTime: health.details?.responseTime,
        });
        this.recordMetric({
            component,
            metric: 'health_status',
            value: health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0,
            timestamp: health.timestamp,
            tags: { status: health.status },
        });
    }
    checkSystemAlerts() {
        if (!this.config.enableAlerting)
            return;
        this.healthStatus.forEach((health, component) => {
            if (health.status === 'unhealthy') {
                this.triggerAlert(component, 'CRITICAL', `${component} is unhealthy`, health.details);
            }
            else if (health.status === 'degraded') {
                this.triggerAlert(component, 'WARNING', `${component} is degraded`, health.details);
            }
        });
        this.errorCounts.forEach((count, component) => {
            const totalRequests = this.getResponseTimeCount(component);
            const errorRate = totalRequests > 0 ? count / totalRequests : 0;
            if (errorRate > this.config.alertThresholds.errorRate) {
                this.triggerAlert(component, 'ERROR', `High error rate: ${(errorRate * 100).toFixed(2)}%`, {
                    errorRate,
                    errorCount: count,
                    totalRequests,
                });
            }
        });
        this.responseTimes.forEach((times, component) => {
            if (times.length > 0) {
                const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
                if (avgTime > this.config.alertThresholds.responseTimeMs) {
                    this.triggerAlert(component, 'WARNING', `Slow response time: ${avgTime.toFixed(2)}ms`, {
                        averageResponseTime: avgTime,
                        sampleSize: times.length,
                    });
                }
            }
        });
    }
    triggerAlert(component, severity, message, details) {
        logger_1.logger.error('Alert', `${component} - ${severity}: ${message}`, {
            component,
            severity,
            message,
            details,
            timestamp: new Date().toISOString(),
        });
    }
    recordResponseTime(component, responseTime) {
        if (!this.responseTimes.has(component)) {
            this.responseTimes.set(component, []);
        }
        const times = this.responseTimes.get(component);
        times.push(responseTime);
        if (times.length > 100) {
            times.shift();
        }
    }
    recordError(component) {
        const current = this.errorCounts.get(component) || 0;
        this.errorCounts.set(component, current + 1);
    }
    getResponseTimeCount(component) {
        return this.responseTimes.get(component)?.length || 0;
    }
    recordMetric(metric) {
        this.metrics.push(metric);
    }
    cleanupOldMetrics() {
        const cutoffTime = new Date(Date.now() - this.config.metricsRetentionHours * 60 * 60 * 1000);
        this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
        this.errorCounts.forEach((count, component) => {
            if (this.getResponseTimeCount(component) === 0) {
                this.errorCounts.delete(component);
            }
        });
    }
    getHealthStatus(component) {
        if (component) {
            return this.healthStatus.get(component) || {
                component,
                status: 'unhealthy',
                timestamp: new Date(),
                details: { error: 'Component not found' },
                lastChecked: new Date(),
            };
        }
        return this.healthStatus;
    }
    getMetrics(component, metric, sinceHours) {
        let filteredMetrics = [...this.metrics];
        if (component) {
            filteredMetrics = filteredMetrics.filter(m => m.component === component);
        }
        if (metric) {
            filteredMetrics = filteredMetrics.filter(m => m.metric === metric);
        }
        if (sinceHours) {
            const cutoffTime = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
            filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoffTime);
        }
        return filteredMetrics;
    }
    getSystemSummary() {
        const components = {};
        let healthyCount = 0;
        let degradedCount = 0;
        let unhealthyCount = 0;
        this.healthStatus.forEach((health, component) => {
            components[component] = health;
            switch (health.status) {
                case 'healthy':
                    healthyCount++;
                    break;
                case 'degraded':
                    degradedCount++;
                    break;
                case 'unhealthy':
                    unhealthyCount++;
                    break;
            }
        });
        let overallStatus = 'healthy';
        if (unhealthyCount > 0) {
            overallStatus = 'unhealthy';
        }
        else if (degradedCount > 0) {
            overallStatus = 'degraded';
        }
        const totalRequests = this.metrics.filter(m => m.metric === 'request_count').length;
        const errorRequests = this.metrics.filter(m => m.metric === 'error_count').length;
        const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
        const responseTimes = this.metrics
            .filter(m => m.metric === 'response_time')
            .map(m => m.value);
        const averageResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0;
        return {
            overallStatus,
            components,
            metrics: {
                totalRequests,
                errorRate,
                averageResponseTime,
            },
        };
    }
    recordRequest(component, responseTime, success = true) {
        this.recordResponseTime(component, responseTime);
        if (!success) {
            this.recordError(component);
        }
        this.recordMetric({
            component,
            metric: 'request_count',
            value: 1,
            timestamp: new Date(),
        });
        if (!success) {
            this.recordMetric({
                component,
                metric: 'error_count',
                value: 1,
                timestamp: new Date(),
            });
        }
        this.recordMetric({
            component,
            metric: 'response_time',
            value: responseTime,
            timestamp: new Date(),
        });
    }
    recordMetricData(metric) {
        this.metrics.push(metric);
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        logger_1.logger.info('OperationalMonitor', 'Configuration updated', { newConfig });
    }
    shutdown() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        logger_1.logger.info('OperationalMonitor', 'Monitor shutdown completed');
    }
}
exports.OperationalMonitor = OperationalMonitor;
exports.operationalMonitor = new OperationalMonitor();
//# sourceMappingURL=operationalMonitor.js.map
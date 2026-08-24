"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.logger = exports.StructuredLogger = void 0;
class StructuredLogger {
    config;
    traces = new Map();
    constructor(config = {}) {
        this.config = {
            level: 'info',
            enableConsole: true,
            enableFile: false,
            redactPatterns: [
                /([a-zA-Z0-9]{20,})/g,
                /sk-[a-zA-Z0-9]{20,}/g,
                /eyJ[a-zA-Z0-9+/=]{50,}/g,
                /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,
                /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
                /\b\d{3}-\d{2}-\d{4}\b/g,
                /(?:[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g,
                /password[^a-zA-Z0-9]*[:=][^a-zA-Z0-9]*/gi,
                /token[^a-zA-Z0-9]*[:=][^a-zA-Z0-9]*/gi,
                /key[^a-zA-Z0-9]*[:=][^a-zA-Z0-9]*/gi,
            ],
            enableTracing: true,
            ...config
        };
    }
    shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.config.level];
    }
    redactSensitiveData(message, metadata) {
        let redactedMessage = message;
        this.config.redactPatterns.forEach(pattern => {
            redactedMessage = redactedMessage.replace(pattern, '[REDACTED]');
        });
        let redactedMetadata;
        if (metadata) {
            redactedMetadata = { ...metadata };
            Object.keys(redactedMetadata).forEach(key => {
                const value = redactedMetadata[key];
                if (typeof value === 'string') {
                    this.config.redactPatterns.forEach(pattern => {
                        redactedMetadata[key] = value.replace(pattern, '[REDACTED]');
                    });
                }
                else if (typeof value === 'object' && value !== null) {
                    this.redactObject(value);
                }
            });
        }
        return { message: redactedMessage, metadata: redactedMetadata };
    }
    redactObject(obj) {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (typeof value === 'string') {
                this.config.redactPatterns.forEach(pattern => {
                    obj[key] = value.replace(pattern, '[REDACTED]');
                });
            }
            else if (typeof value === 'object' && value !== null) {
                this.redactObject(value);
            }
        });
    }
    generateTraceId() {
        return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    formatLogEntry(entry) {
        const { timestamp, level, component, message, metadata, userId, sessionId, traceId } = entry;
        const baseLog = {
            timestamp: timestamp.toISOString(),
            level,
            component,
            message,
        };
        if (userId)
            baseLog.userId = '[USER_ID]';
        if (sessionId)
            baseLog.sessionId = '[SESSION_ID]';
        if (traceId)
            baseLog.traceId = traceId;
        if (metadata)
            baseLog.metadata = metadata;
        return JSON.stringify(baseLog);
    }
    log(level, component, message, metadata, userId, sessionId, traceId) {
        if (!this.shouldLog(level))
            return;
        const entry = {
            timestamp: new Date(),
            level,
            component,
            message,
            metadata,
            userId,
            sessionId,
            traceId,
        };
        if (this.config.enableTracing && traceId) {
            if (!this.traces.has(traceId)) {
                this.traces.set(traceId, []);
            }
            this.traces.get(traceId).push(entry);
        }
        const { message: redactedMessage, metadata: redactedMetadata } = this.redactSensitiveData(message, metadata);
        entry.message = redactedMessage;
        entry.metadata = redactedMetadata;
        const formattedLog = this.formatLogEntry(entry);
        if (this.config.enableConsole) {
            switch (level) {
                case 'debug':
                    console.debug(formattedLog);
                    break;
                case 'info':
                    console.info(formattedLog);
                    break;
                case 'warn':
                    console.warn(formattedLog);
                    break;
                case 'error':
                    console.error(formattedLog);
                    break;
            }
        }
        if (this.config.enableFile && this.config.filePath) {
            console.log(`[FILE] ${formattedLog}`);
        }
    }
    debug(component, message, metadata, userId, sessionId) {
        this.log('debug', component, message, metadata, userId, sessionId);
    }
    info(component, message, metadata, userId, sessionId) {
        this.log('info', component, message, metadata, userId, sessionId);
    }
    warn(component, message, metadata, userId, sessionId) {
        this.log('warn', component, message, metadata, userId, sessionId);
    }
    error(component, message, metadata, userId, sessionId) {
        this.log('error', component, message, metadata, userId, sessionId);
    }
    whatsapp(message, metadata, userId, sessionId) {
        this.info('WhatsApp', message, metadata, userId, sessionId);
    }
    supabase(message, metadata, userId, sessionId) {
        this.info('Supabase', message, metadata, userId, sessionId);
    }
    instagram(message, metadata, userId, sessionId) {
        this.info('Instagram', message, metadata, userId, sessionId);
    }
    ollama(message, metadata, userId, sessionId) {
        this.info('Ollama', message, metadata, userId, sessionId);
    }
    scheduler(message, metadata, userId, sessionId) {
        this.info('Scheduler', message, metadata, userId, sessionId);
    }
    startTrace(component, message, metadata) {
        const traceId = this.generateTraceId();
        this.info('Trace', `Starting trace: ${component}`, { ...metadata, traceId });
        return traceId;
    }
    endTrace(traceId, component, message, metadata) {
        const trace = this.traces.get(traceId);
        if (trace && trace.length > 0) {
            const firstTrace = trace[0];
            const lastTrace = trace[trace.length - 1];
            const duration = lastTrace.timestamp.getTime() - firstTrace.timestamp.getTime();
            this.info('Trace', `Ending trace: ${component}`, {
                ...metadata,
                traceId,
                duration,
                steps: trace.length
            });
            this.traces.delete(traceId);
        }
    }
    getTrace(traceId) {
        return this.traces.get(traceId) || [];
    }
    monitorHealth(component, status, metadata) {
        if (status === 'unhealthy') {
            this.error('Health', `Component ${component} is unhealthy`, metadata);
        }
        else if (status === 'degraded') {
            this.warn('Health', `Component ${component} is degraded`, metadata);
        }
        else {
            this.info('Health', `Component ${component} is healthy`, metadata);
        }
    }
    monitorPerformance(component, operation, duration, metadata) {
        const performanceLog = {
            component,
            operation,
            duration,
            timestamp: new Date().toISOString(),
            ...metadata
        };
        if (duration > 5000) {
            this.warn('Performance', `Slow operation: ${operation} took ${duration}ms`, performanceLog);
        }
        else {
            this.info('Performance', `Operation: ${operation} completed in ${duration}ms`, performanceLog);
        }
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.StructuredLogger = StructuredLogger;
exports.logger = new StructuredLogger();
exports.log = {
    debug: (component, message, metadata) => exports.logger.debug(component, message, metadata),
    info: (component, message, metadata) => exports.logger.info(component, message, metadata),
    warn: (component, message, metadata) => exports.logger.warn(component, message, metadata),
    error: (component, message, metadata) => exports.logger.error(component, message, metadata),
    whatsapp: (message, metadata) => exports.logger.whatsapp(message, metadata),
    supabase: (message, metadata) => exports.logger.supabase(message, metadata),
    instagram: (message, metadata) => exports.logger.instagram(message, metadata),
    ollama: (message, metadata) => exports.logger.ollama(message, metadata),
    scheduler: (message, metadata) => exports.logger.scheduler(message, metadata),
    health: (component, status, metadata) => exports.logger.monitorHealth(component, status, metadata),
    performance: (component, operation, duration, metadata) => exports.logger.monitorPerformance(component, operation, duration, metadata),
};
//# sourceMappingURL=logger.js.map
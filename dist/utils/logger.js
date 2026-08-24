"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    level;
    context = {};
    constructor() {
        this.level = process.env.LOG_LEVEL || LogLevel.INFO;
    }
    formatMessage(level, message, context) {
        const timestamp = new Date().toISOString();
        const ctx = { ...this.context, ...context };
        const ctxString = Object.keys(ctx).length > 0 ? JSON.stringify(ctx) : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${ctxString ? ` ${ctxString}` : ''}`;
    }
    shouldLog(level) {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }
    debug(message, context) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
        }
    }
    info(message, context) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(this.formatMessage(LogLevel.INFO, message, context));
        }
    }
    warn(message, context) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage(LogLevel.WARN, message, context));
        }
    }
    error(message, error, context) {
        if (this.shouldLog(LogLevel.ERROR)) {
            const errorContext = error instanceof Error
                ? { error: error.message, stack: error.stack }
                : error !== undefined
                    ? { error: String(error) }
                    : {};
            console.error(this.formatMessage(LogLevel.ERROR, message, { ...context, ...errorContext }));
        }
    }
    setContext(context) {
        this.context = { ...this.context, ...context };
    }
    clearContext() {
        this.context = {};
    }
    child(childContext) {
        const child = new Logger();
        child.level = this.level;
        child.context = { ...this.context, ...childContext };
        return child;
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map
export declare enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}
export interface LogContext {
    correlationId?: string;
    messageId?: string;
    postId?: string;
    platform?: string;
    [key: string]: any;
}
declare class Logger {
    private level;
    private context;
    constructor();
    private formatMessage;
    private shouldLog;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, error?: unknown, context?: LogContext): void;
    setContext(context: LogContext): void;
    clearContext(): void;
    child(childContext: LogContext): Logger;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map
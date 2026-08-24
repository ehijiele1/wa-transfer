export interface LogEntry {
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    component: string;
    message: string;
    metadata: Record<string, any> | undefined;
    userId: string | undefined;
    sessionId: string | undefined;
    traceId: string | undefined;
}
export interface LoggerConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableFile: boolean;
    filePath?: string;
    redactPatterns: RegExp[];
    enableTracing: boolean;
}
export declare class StructuredLogger {
    private config;
    private traces;
    constructor(config?: Partial<LoggerConfig>);
    private shouldLog;
    private redactSensitiveData;
    private redactObject;
    private generateTraceId;
    private formatLogEntry;
    private log;
    debug(component: string, message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void;
    info(component: string, message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void;
    warn(component: string, message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void;
    error(component: string, message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void;
    whatsapp(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void;
    supabase(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void;
    instagram(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void;
    ollama(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void;
    scheduler(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void;
    startTrace(component: string, message: string, metadata?: Record<string, any>): string;
    endTrace(traceId: string, component: string, message: string, metadata?: Record<string, any>): void;
    getTrace(traceId: string): LogEntry[];
    monitorHealth(component: string, status: 'healthy' | 'degraded' | 'unhealthy', metadata?: Record<string, any>): void;
    monitorPerformance(component: string, operation: string, duration: number, metadata?: Record<string, any>): void;
    updateConfig(newConfig: Partial<LoggerConfig>): void;
    getConfig(): LoggerConfig;
}
export declare const logger: StructuredLogger;
export declare const log: {
    debug: (component: string, message: string, metadata?: Record<string, any>) => void;
    info: (component: string, message: string, metadata?: Record<string, any>) => void;
    warn: (component: string, message: string, metadata?: Record<string, any>) => void;
    error: (component: string, message: string, metadata?: Record<string, any>) => void;
    whatsapp: (message: string, metadata?: Record<string, any>) => void;
    supabase: (message: string, metadata?: Record<string, any>) => void;
    instagram: (message: string, metadata?: Record<string, any>) => void;
    ollama: (message: string, metadata?: Record<string, any>) => void;
    scheduler: (message: string, metadata?: Record<string, any>) => void;
    health: (component: string, status: "healthy" | "degraded" | "unhealthy", metadata?: Record<string, any>) => void;
    performance: (component: string, operation: string, duration: number, metadata?: Record<string, any>) => void;
};
//# sourceMappingURL=logger.d.ts.map
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

export class StructuredLogger {
  private config: LoggerConfig;
  private traces: Map<string, LogEntry[]> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableFile: false,
      redactPatterns: [
        /([a-zA-Z0-9]{20,})/g, // Generic long strings (likely keys/tokens)
        /sk-[a-zA-Z0-9]{20,}/g, // API keys
        /eyJ[a-zA-Z0-9+/=]{50,}/g, // JWT tokens
        /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, // UUIDs
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
        /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
        /(?:[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g, // Email addresses
        /password[^a-zA-Z0-9]*[:=][^a-zA-Z0-9]*/gi, // Password fields
        /token[^a-zA-Z0-9]*[:=][^a-zA-Z0-9]*/gi, // Token fields
        /key[^a-zA-Z0-9]*[:=][^a-zA-Z0-9]*/gi, // Key fields
      ],
      enableTracing: true,
      ...config
    };
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.config.level];
  }

  private redactSensitiveData(message: string, metadata?: Record<string, any>): { message: string, metadata: Record<string, any> | undefined } {
    let redactedMessage = message;
    
    // Redact from message
    this.config.redactPatterns.forEach(pattern => {
      redactedMessage = redactedMessage.replace(pattern, '[REDACTED]');
    });

    // Redact from metadata
    let redactedMetadata: Record<string, any> | undefined;
    if (metadata) {
      redactedMetadata = { ...metadata };
      Object.keys(redactedMetadata).forEach(key => {
        const value = redactedMetadata![key];
        if (typeof value === 'string') {
          this.config.redactPatterns.forEach(pattern => {
            redactedMetadata![key] = value.replace(pattern, '[REDACTED]');
          });
        } else if (typeof value === 'object' && value !== null) {
          // Recursively redact nested objects
          this.redactObject(value);
        }
      });
    }

    return { message: redactedMessage, metadata: redactedMetadata };
  }

  private redactObject(obj: any): void {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === 'string') {
        this.config.redactPatterns.forEach(pattern => {
          obj[key] = value.replace(pattern, '[REDACTED]');
        });
      } else if (typeof value === 'object' && value !== null) {
        this.redactObject(value);
      }
    });
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, component, message, metadata, userId, sessionId, traceId } = entry;
    
    const baseLog: any = {
      timestamp: timestamp.toISOString(),
      level,
      component,
      message,
    };

    if (userId) baseLog.userId = '[USER_ID]';
    if (sessionId) baseLog.sessionId = '[SESSION_ID]';
    if (traceId) baseLog.traceId = traceId;
    if (metadata) baseLog.metadata = metadata;
    
    return JSON.stringify(baseLog);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', component: string, message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string, traceId?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component,
      message,
      metadata,
      userId,
      sessionId,
      traceId,
    };

    // Add to trace if tracing is enabled
    if (this.config.enableTracing && traceId) {
      if (!this.traces.has(traceId)) {
        this.traces.set(traceId, []);
      }
      this.traces.get(traceId)!.push(entry);
    }

    const { message: redactedMessage, metadata: redactedMetadata } = this.redactSensitiveData(message, metadata);

    entry.message = redactedMessage;
    entry.metadata = redactedMetadata;

    const formattedLog = this.formatLogEntry(entry);

    // Log to console
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

    // Log to file (if configured)
    if (this.config.enableFile && this.config.filePath) {
      // In a real implementation, you would append to a file here
      // For now, we'll just log to console
      console.log(`[FILE] ${formattedLog}`);
    }
  }

  // Public logging methods
  debug(component: string, message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void {
    this.log('debug', component, message, metadata, userId, sessionId);
  }

  info(component: string, message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void {
    this.log('info', component, message, metadata, userId, sessionId);
  }

  warn(component: string, message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void {
    this.log('warn', component, message, metadata, userId, sessionId);
  }

  error(component: string, message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void {
    this.log('error', component, message, metadata, userId, sessionId);
  }

  // Convenience methods for common components
  whatsapp(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void {
    this.info('WhatsApp', message, metadata, userId, sessionId);
  }

  supabase(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void {
    this.info('Supabase', message, metadata, userId, sessionId);
  }

  instagram(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void {
    this.info('Instagram', message, metadata, userId, sessionId);
  }

  ollama(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void {
    this.info('Ollama', message, metadata, userId, sessionId);
  }

  scheduler(message: string, metadata?: Record<string, any>, userId?: string, sessionId?: string): void {
    this.info('Scheduler', message, metadata, userId, sessionId);
  }

  // Tracing methods
  startTrace(component: string, message: string, metadata?: Record<string, any>): string {
    const traceId = this.generateTraceId();
    this.info('Trace', `Starting trace: ${component}`, { ...metadata, traceId });
    return traceId;
  }

  endTrace(traceId: string, component: string, message: string, metadata?: Record<string, any>): void {
    const trace = this.traces.get(traceId);
    if (trace && trace.length > 0) {
      const firstTrace = trace[0]!;
      const lastTrace = trace[trace.length - 1]!;
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

  getTrace(traceId: string): LogEntry[] {
    return this.traces.get(traceId) || [];
  }

  // Operational monitoring methods
  monitorHealth(component: string, status: 'healthy' | 'degraded' | 'unhealthy', metadata?: Record<string, any>): void {
    if (status === 'unhealthy') {
      this.error('Health', `Component ${component} is unhealthy`, metadata);
    } else if (status === 'degraded') {
      this.warn('Health', `Component ${component} is degraded`, metadata);
    } else {
      this.info('Health', `Component ${component} is healthy`, metadata);
    }
  }

  monitorPerformance(component: string, operation: string, duration: number, metadata?: Record<string, any>): void {
    const performanceLog = {
      component,
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    if (duration > 5000) {
      this.warn('Performance', `Slow operation: ${operation} took ${duration}ms`, performanceLog);
    } else {
      this.info('Performance', `Operation: ${operation} completed in ${duration}ms`, performanceLog);
    }
  }

  // Configuration methods
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Global logger instance
export const logger = new StructuredLogger();

// Convenience functions for easy logging
export const log = {
  debug: (component: string, message: string, metadata?: Record<string, any>) => logger.debug(component, message, metadata),
  info: (component: string, message: string, metadata?: Record<string, any>) => logger.info(component, message, metadata),
  warn: (component: string, message: string, metadata?: Record<string, any>) => logger.warn(component, message, metadata),
  error: (component: string, message: string, metadata?: Record<string, any>) => logger.error(component, message, metadata),
  
  // Component-specific loggers
  whatsapp: (message: string, metadata?: Record<string, any>) => logger.whatsapp(message, metadata),
  supabase: (message: string, metadata?: Record<string, any>) => logger.supabase(message, metadata),
  instagram: (message: string, metadata?: Record<string, any>) => logger.instagram(message, metadata),
  ollama: (message: string, metadata?: Record<string, any>) => logger.ollama(message, metadata),
  scheduler: (message: string, metadata?: Record<string, any>) => logger.scheduler(message, metadata),
  
  // Monitoring
  health: (component: string, status: 'healthy' | 'degraded' | 'unhealthy', metadata?: Record<string, any>) => 
    logger.monitorHealth(component, status, metadata),
  performance: (component: string, operation: string, duration: number, metadata?: Record<string, any>) => 
    logger.monitorPerformance(component, operation, duration, metadata),
};
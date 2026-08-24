/**
 * Structured Logger
 * Replaces console.log/console.error throughout the application
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  correlationId?: string;
  messageId?: string;
  postId?: string;
  platform?: string;
  [key: string]: any;
}

class Logger {
  private level: LogLevel;
  private context: LogContext = {};

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const ctx = { ...this.context, ...context };
    const ctxString = Object.keys(ctx).length > 0 ? JSON.stringify(ctx) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${ctxString ? ` ${ctxString}` : ''}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: unknown, context?: LogContext) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext: LogContext =
        error instanceof Error
          ? { error: error.message, stack: error.stack }
          : error !== undefined
            ? { error: String(error) }
            : {};
      console.error(this.formatMessage(LogLevel.ERROR, message, { ...context, ...errorContext }));
    }
  }

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  child(childContext: LogContext): Logger {
    const child = new Logger();
    child.level = this.level;
    child.context = { ...this.context, ...childContext };
    return child;
  }
}

export const logger = new Logger();
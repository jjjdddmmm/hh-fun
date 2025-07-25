/**
 * Production-ready logging utility
 * Replaces console.log statements with proper logging that respects environments
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogContext {
  service?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorDetails = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        ...context
      } : context;
      
      console.error(this.formatMessage('ERROR', message, errorDetails));
    }
  }

  // Special methods for specific use cases
  api(method: string, endpoint: string, status: number, duration?: number): void {
    if (this.isDevelopment) {
      const message = `${method} ${endpoint} - ${status}${duration ? ` (${duration}ms)` : ''}`;
      this.info(message, { type: 'api' });
    }
  }

  service(serviceName: string, action: string, details?: any): void {
    if (this.isDevelopment) {
      this.debug(`${serviceName}: ${action}`, { service: serviceName, ...details });
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (message: string, error?: Error | unknown, context?: LogContext) => logger.error(message, error, context);
export const logApi = (method: string, endpoint: string, status: number, duration?: number) => logger.api(method, endpoint, status, duration);
export const logService = (serviceName: string, action: string, details?: any) => logger.service(serviceName, action, details);
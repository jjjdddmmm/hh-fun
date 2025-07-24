/**
 * Structured logging utility for document processing
 * Clean, consistent, production-ready logging
 */

import { ExtractionMethod, SupportedFileType, ProcessingContext } from '../types/DocumentTypes';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: ProcessingContext;
  readonly metadata?: Record<string, unknown>;
}

export class DocumentLogger {
  private static createLogEntry(
    level: LogLevel,
    message: string,
    context?: ProcessingContext,
    metadata?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata
    };
  }

  private static log(entry: LogEntry): void {
    const logMessage = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.message
    ].join(' ');

    if (entry.context || entry.metadata) {
      const details = {
        ...(entry.context && { context: entry.context }),
        ...(entry.metadata && { metadata: entry.metadata })
      };
      console.log(logMessage, details);
    } else {
      console.log(logMessage);
    }
  }

  static logProcessingStart(
    fileName: string,
    fileSize: number,
    fileType: SupportedFileType,
    context?: ProcessingContext
  ): void {
    this.log(
      this.createLogEntry(
        LogLevel.INFO,
        `Starting document processing: ${fileName}`,
        context,
        { fileName, fileSize, fileType }
      )
    );
  }

  static logExtractionAttempt(
    method: ExtractionMethod,
    context?: ProcessingContext
  ): void {
    this.log(
      this.createLogEntry(
        LogLevel.INFO,
        `Attempting text extraction with method: ${method}`,
        context,
        { method }
      )
    );
  }

  static logExtractionSuccess(
    method: ExtractionMethod,
    textLength: number,
    processingTimeMs: number,
    context?: ProcessingContext
  ): void {
    this.log(
      this.createLogEntry(
        LogLevel.INFO,
        `Text extraction successful`,
        context,
        { method, textLength, processingTimeMs }
      )
    );
  }

  static logExtractionFailure(
    method: ExtractionMethod,
    error: string,
    context?: ProcessingContext
  ): void {
    this.log(
      this.createLogEntry(
        LogLevel.WARN,
        `Text extraction failed with method: ${method}`,
        context,
        { method, error }
      )
    );
  }

  static logFallbackAttempt(
    fromMethod: ExtractionMethod,
    toMethod: ExtractionMethod,
    context?: ProcessingContext
  ): void {
    this.log(
      this.createLogEntry(
        LogLevel.INFO,
        `Falling back from ${fromMethod} to ${toMethod}`,
        context,
        { fromMethod, toMethod }
      )
    );
  }

  static logProcessingComplete(
    success: boolean,
    totalTimeMs: number,
    finalMethod: ExtractionMethod,
    context?: ProcessingContext
  ): void {
    this.log(
      this.createLogEntry(
        success ? LogLevel.INFO : LogLevel.ERROR,
        `Document processing ${success ? 'completed' : 'failed'}`,
        context,
        { success, totalTimeMs, finalMethod }
      )
    );
  }

  static logError(
    error: Error,
    context?: ProcessingContext,
    metadata?: Record<string, unknown>
  ): void {
    this.log(
      this.createLogEntry(
        LogLevel.ERROR,
        `Error: ${error.message}`,
        context,
        { ...metadata, errorName: error.name, errorStack: error.stack }
      )
    );
  }

  static logDebug(
    message: string,
    context?: ProcessingContext,
    metadata?: Record<string, unknown>
  ): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(
        this.createLogEntry(LogLevel.DEBUG, message, context, metadata)
      );
    }
  }

  static logValidation(
    fileName: string,
    fileType: SupportedFileType,
    isValid: boolean,
    errors?: string[],
    context?: ProcessingContext
  ): void {
    this.log(
      this.createLogEntry(
        isValid ? LogLevel.INFO : LogLevel.WARN,
        `File validation ${isValid ? 'passed' : 'failed'}: ${fileName}`,
        context,
        { fileName, fileType, isValid, validationErrors: errors }
      )
    );
  }
}
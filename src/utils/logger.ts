/**
 * Production-Safe Logger Utility
 * 
 * Provides environment-aware logging that:
 * - Only logs in development mode
 * - Sanitizes sensitive data in production
 * - Supports structured logging
 * - Can be extended to send logs to external services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment: boolean
  private isProduction: boolean

  constructor() {
    this.isDevelopment = import.meta.env.DEV
    this.isProduction = import.meta.env.PROD
  }

  /**
   * Debug logs - only in development
   * Use for detailed debugging information
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '')
    }
  }

  /**
   * Info logs - development only by default
   * Use for general informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context || '')
    }
  }

  /**
   * Warning logs - shown in both dev and production
   * Use for recoverable errors or important warnings
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '')
    } else {
      // In production, only log sanitized message
      console.warn(`[WARN] ${this.sanitizeMessage(message)}`)
      // TODO: Send to error tracking service (Sentry, etc.)
    }
  }

  /**
   * Error logs - shown in both dev and production
   * Use for errors that need attention
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error || '', context || '')
    } else {
      // In production, log sanitized message and send to tracking service
      console.error(`[ERROR] ${this.sanitizeMessage(message)}`)
      
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(error, { tags: context })
    }
  }

  /**
   * Success logs - development only
   * Use for successful operations (e.g., "✅ Data saved")
   */
  success(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`✅ ${message}`, context || '')
    }
  }

  /**
   * API logs - development only
   * Use for API request/response logging
   */
  api(method: string, url: string, status?: number, context?: LogContext): void {
    if (this.isDevelopment) {
      const statusEmoji = status && status >= 200 && status < 300 ? '✅' : '❌'
      console.log(`${statusEmoji} [API] ${method} ${url}`, status || '', context || '')
    }
  }

  /**
   * Performance logs - development only
   * Use for performance measurements
   */
  perf(label: string, duration: number): void {
    if (this.isDevelopment) {
      console.log(`⚡ [PERF] ${label}: ${duration.toFixed(2)}ms`)
    }
  }

  /**
   * Sanitize message to remove sensitive data
   */
  private sanitizeMessage(message: string): string {
    // Remove potential PII patterns
    return message
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      .replace(/\b\d{16}\b/g, '[CARD]')
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [TOKEN]')
      .replace(/apiKey[=:]\s*['"]?[A-Za-z0-9]+['"]?/gi, 'apiKey=[REDACTED]')
  }

  /**
   * Group logs together (development only)
   */
  group(label: string, callback: () => void): void {
    if (this.isDevelopment) {
      console.group(label)
      callback()
      console.groupEnd()
    }
  }

  /**
   * Table logs (development only)
   */
  table(data: any): void {
    if (this.isDevelopment) {
      console.table(data)
    }
  }

  /**
   * Time measurement (development only)
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label)
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for external use
export type { LogLevel, LogContext }

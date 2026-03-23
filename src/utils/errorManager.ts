import { ref, reactive } from 'vue'

export interface ErrorReport {
  id: string
  error: Error
  component: string
  route: string
  timestamp: string
  userAgent: string
  userId?: string
  resolved: boolean
}

export interface ErrorBoundaryConfig {
  enableReporting: boolean
  maxErrors: number
  retryAttempts: number
  enableDevDetails: boolean
}

class ErrorManager {
  private errors = ref<ErrorReport[]>([])
  private config: ErrorBoundaryConfig
  private errorCallbacks: ((error: ErrorReport) => void)[] = []

  constructor(config: Partial<ErrorBoundaryConfig> = {}) {
    this.config = {
      enableReporting: import.meta.env.PROD,
      maxErrors: 50,
      retryAttempts: 3,
      enableDevDetails: import.meta.env.DEV,
      ...config
    }
  }

  /**
   * Report an error to the global error manager
   */
  reportError(error: Error, component: string = 'Unknown', route: string = window.location.pathname): ErrorReport {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      error,
      component,
      route,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
      resolved: false
    }

    // Add to errors list
    this.errors.value.unshift(errorReport)
    
    // Limit number of stored errors
    if (this.errors.value.length > this.config.maxErrors) {
      this.errors.value = this.errors.value.slice(0, this.config.maxErrors)
    }

    // Notify callbacks
    this.errorCallbacks.forEach(callback => callback(errorReport))

    // Send to error reporting service in production
    if (this.config.enableReporting) {
      this.sendToErrorService(errorReport)
    }

    return errorReport
  }

  /**
   * Get all reported errors
   */
  getErrors(): ErrorReport[] {
    return this.errors.value
  }

  /**
   * Get errors for a specific component
   */
  getErrorsForComponent(component: string): ErrorReport[] {
    return this.errors.value.filter(error => error.component === component)
  }

  /**
   * Mark an error as resolved
   */
  resolveError(errorId: string): void {
    const error = this.errors.value.find(e => e.id === errorId)
    if (error) {
      error.resolved = true
    }
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors.value = []
  }

  /**
   * Add error callback
   */
  onError(callback: (error: ErrorReport) => void): () => void {
    this.errorCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback)
      if (index > -1) {
        this.errorCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const total = this.errors.value.length
    const unresolved = this.errors.value.filter(e => !e.resolved).length
    const byComponent = this.errors.value.reduce((acc, error) => {
      acc[error.component] = (acc[error.component] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      unresolved,
      resolved: total - unresolved,
      byComponent
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from various sources
    try {
      // Check if there's a global user state
      if (window.localStorage.getItem('auth_user')) {
        const user = JSON.parse(window.localStorage.getItem('auth_user') || '{}')
        return user.id
      }
    } catch {
      // Ignore errors
    }
    return undefined
  }

  private async sendToErrorService(errorReport: ErrorReport): Promise<void> {
    try {
      // In production, send to error reporting service
      // This could be Sentry, LogRocket, or a custom endpoint
      
      const payload = {
        id: errorReport.id,
        message: errorReport.error.message,
        stack: errorReport.error.stack,
        component: errorReport.component,
        route: errorReport.route,
        timestamp: errorReport.timestamp,
        userAgent: errorReport.userAgent,
        userId: errorReport.userId,
        url: window.location.href,
        buildVersion: import.meta.env.VITE_APP_VERSION || 'unknown'
      }

      // TODO: Replace with actual error reporting service
      console.log('Error reported to service:', payload)
      
      // Example: Sentry.captureException(errorReport.error, {
      //   tags: {
      //     component: errorReport.component,
      //     route: errorReport.route
      //   },
      //   extra: errorReport
      // })
      
    } catch (err) {
      console.error('Failed to send error to service:', err)
    }
  }

  /**
   * Categorize error type
   */
  categorizeError(error: Error): string {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network'
    }
    
    if (message.includes('validation')) {
      return 'validation'
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'permission'
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'not-found'
    }
    
    if (message.includes('timeout')) {
      return 'timeout'
    }
    
    return 'unknown'
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: Error): string {
    const category = this.categorizeError(error)
    
    switch (category) {
      case 'network':
        return 'Connection error. Please check your internet connection and try again.'
      case 'validation':
        return 'Please check your input and try again.'
      case 'permission':
        return 'You don\'t have permission to perform this action.'
      case 'not-found':
        return 'The requested resource was not found.'
      case 'timeout':
        return 'Request timed out. Please try again.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }
}

// Create singleton instance
export const errorManager = new ErrorManager()

// Export composable for use in components
export function useErrorManager() {
  return {
    errors: errorManager.getErrors(),
    reportError: errorManager.reportError.bind(errorManager),
    resolveError: errorManager.resolveError.bind(errorManager),
    clearErrors: errorManager.clearErrors.bind(errorManager),
    getErrorStats: errorManager.getErrorStats.bind(errorManager),
    onError: errorManager.onError.bind(errorManager),
    categorizeError: errorManager.categorizeError.bind(errorManager),
    getUserFriendlyMessage: errorManager.getUserFriendlyMessage.bind(errorManager)
  }
}

/**
 * Global Error Handler
 * Provides user-friendly error messages without exposing internals
 */

export interface ErrorConfig {
  showToUser: boolean
  logToConsole: boolean
  logToServer?: boolean // For Phase 2 - error tracking service
}

const DEFAULT_CONFIG: ErrorConfig = {
  showToUser: true,
  logToConsole: true,
  logToServer: false,
}

/**
 * User-friendly error messages
 * Never expose technical details to users
 */
const USER_MESSAGES: Record<string, string> = {
  // Network errors
  network: 'Connection error. Please check your internet and try again.',
  timeout: 'Request timed out. Please try again.',
  
  // Data errors
  validation: 'Please check your input and try again.',
  notFound: 'The requested item was not found.',
  duplicate: 'This item already exists.',
  
  // Permission errors
  unauthorized: 'You do not have permission to perform this action.',
  forbidden: 'Access denied.',
  
  // Generic errors
  save: 'Failed to save. Please try again.',
  delete: 'Failed to delete. Please try again.',
  load: 'Failed to load data. Please try again.',
  update: 'Failed to update. Please try again.',
  
  // Default
  default: 'Something went wrong. Please try again.',
}

/**
 * Categorize errors for better handling
 */
function categorizeError(error: unknown): string {
  if (error instanceof TypeError) {
    return 'validation'
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network'
    }
    if (message.includes('timeout')) {
      return 'timeout'
    }
    if (message.includes('not found')) {
      return 'notFound'
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'unauthorized'
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'forbidden'
    }
  }
  
  return 'default'
}

/**
 * Main error handler
 * Logs technical details, shows user-friendly message
 */
export function handleError(
  error: unknown,
  context: string,
  config: Partial<ErrorConfig> = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const category = categorizeError(error)
  const userMessage = USER_MESSAGES[category] || USER_MESSAGES.default

  // Log technical details (for debugging only)
  if (finalConfig.logToConsole) {
    console.group(`❌ Error in ${context}`)
    console.error('Category:', category)
    console.error('Error:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    console.groupEnd()
  }

  // TODO Phase 2: Send to error tracking service (Sentry, LogRocket, etc.)
  if (finalConfig.logToServer) {
    // sendToErrorTracking(error, context)
  }

  return userMessage
}

/**
 * Async wrapper that handles errors automatically
 */
export async function handleAsync<T>(
  fn: () => Promise<T>,
  context: string,
  config?: Partial<ErrorConfig>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (error) {
    const message = handleError(error, context, config)
    return { data: null, error: message }
  }
}

/**
 * Specific error handlers for common operations
 */
export const ErrorHandlers = {
  /**
   * Handle save operation errors
   */
  save(error: unknown, itemType: string): string {
    const message = handleError(error, `Save ${itemType}`)
    return `Failed to save ${itemType}. ${message}`
  },

  /**
   * Handle delete operation errors
   */
  delete(error: unknown, itemType: string): string {
    const message = handleError(error, `Delete ${itemType}`)
    return `Failed to delete ${itemType}. ${message}`
  },

  /**
   * Handle load operation errors
   */
  load(error: unknown, itemType: string): string {
    const message = handleError(error, `Load ${itemType}`)
    return `Failed to load ${itemType}. ${message}`
  },

  /**
   * Handle search operation errors
   */
  search(error: unknown): string {
    const message = handleError(error, 'Search')
    return `Search failed. ${message}`
  },

  /**
   * Handle validation errors
   */
  validation(errors: string[]): string {
    if (errors.length === 0) return ''
    if (errors.length === 1) return errors[0]
    return `Please fix ${errors.length} errors: ${errors.join(', ')}`
  },
}

/**
 * Assert function for development
 * Throws in dev, logs in production
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    if (import.meta.env.DEV) {
      throw new Error(`Assertion failed: ${message}`)
    } else {
      console.error(`Assertion failed: ${message}`)
    }
  }
}

/**
 * Safe JSON parse that doesn't throw
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch (error) {
    handleError(error, 'JSON Parse', { showToUser: false })
    return fallback
  }
}

/**
 * Safe localStorage operations
 */
export const SafeStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key)
      if (item === null) return fallback
      return JSON.parse(item) as T
    } catch (error) {
      handleError(error, `LocalStorage Get: ${key}`, { showToUser: false })
      return fallback
    }
  },

  set(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      handleError(error, `LocalStorage Set: ${key}`, { showToUser: false })
      return false
    }
  },

  remove(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      handleError(error, `LocalStorage Remove: ${key}`, { showToUser: false })
      return false
    }
  },
}

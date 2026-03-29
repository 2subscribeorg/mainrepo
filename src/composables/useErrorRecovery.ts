import { ref, computed } from 'vue'

interface RetryOptions {
  maxRetries?: number
  retryStrategy?: 'immediate' | 'exponential' | 'linear'
  onRetry?: (retryCount: number) => void
  onSuccess?: () => void
  onFailure?: (error: Error) => void
}

interface RetryState {
  isRetrying: boolean
  retryCount: number
  lastError: Error | null
  retryHistory: Array<{ timestamp: string; success: boolean; error?: string }>
}

/**
 * Composable for error recovery with retry logic
 * Provides reusable retry mechanisms with exponential backoff
 * 
 * @example
 * ```ts
 * const { executeWithRetry, retryState, reset } = useErrorRecovery()
 * 
 * await executeWithRetry(async () => {
 *   await fetchData()
 * }, {
 *   maxRetries: 3,
 *   retryStrategy: 'exponential'
 * })
 * ```
 */
export function useErrorRecovery() {
  const state = ref<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    retryHistory: []
  })

  const canRetry = computed(() => state.value.retryCount < 3)
  const hasError = computed(() => state.value.lastError !== null)

  /**
   * Calculate retry delay based on strategy
   */
  function getRetryDelay(retryCount: number, strategy: 'immediate' | 'exponential' | 'linear'): number {
    switch (strategy) {
      case 'immediate':
        return 0
      case 'linear':
        return retryCount * 1000
      case 'exponential':
      default:
        // Exponential backoff: 1s, 2s, 4s, 8s... (max 10s)
        return Math.min(Math.pow(2, retryCount) * 1000, 10000)
    }
  }

  /**
   * Determine if error is transient (network, timeout, etc.)
   */
  function isTransientError(error: Error): boolean {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('aborted')
    )
  }

  /**
   * Execute a function with automatic retry logic
   */
  async function executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryStrategy = 'exponential',
      onRetry,
      onSuccess,
      onFailure
    } = options

    state.value.isRetrying = true
    state.value.retryCount = 0
    state.value.lastError = null

    while (state.value.retryCount <= maxRetries) {
      try {
        const result = await fn()
        
        // Success!
        state.value.retryHistory.push({
          timestamp: new Date().toISOString(),
          success: true
        })
        
        state.value.isRetrying = false
        
        if (onSuccess) {
          onSuccess()
        }
        
        return result
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        state.value.lastError = err
        
        // Log failed attempt
        state.value.retryHistory.push({
          timestamp: new Date().toISOString(),
          success: false,
          error: err.message
        })

        // Check if we should retry
        const shouldRetry = state.value.retryCount < maxRetries && isTransientError(err)
        
        if (!shouldRetry) {
          state.value.isRetrying = false
          
          if (onFailure) {
            onFailure(err)
          }
          
          throw err
        }

        // Calculate delay and wait
        const delay = getRetryDelay(state.value.retryCount, retryStrategy)
        
        if (onRetry) {
          onRetry(state.value.retryCount)
        }
        
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
        state.value.retryCount++
      }
    }

    // Max retries exceeded
    state.value.isRetrying = false
    const finalError = state.value.lastError || new Error('Max retries exceeded')
    
    if (onFailure) {
      onFailure(finalError)
    }
    
    throw finalError
  }

  /**
   * Retry a failed operation manually
   */
  async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    return executeWithRetry(fn, options)
  }

  /**
   * Reset retry state
   */
  function reset() {
    state.value = {
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      retryHistory: []
    }
  }

  /**
   * Get user-friendly error message
   */
  function getErrorMessage(error: Error | null): string {
    if (!error) return ''
    
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection error. Please check your internet connection.'
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You don\'t have permission to perform this action.'
    }
    
    if (message.includes('not found')) {
      return 'The requested resource was not found.'
    }
    
    return 'An error occurred. Please try again.'
  }

  return {
    // State
    retryState: computed(() => state.value),
    canRetry,
    hasError,
    isRetrying: computed(() => state.value.isRetrying),
    retryCount: computed(() => state.value.retryCount),
    lastError: computed(() => state.value.lastError),
    
    // Methods
    executeWithRetry,
    retry,
    reset,
    getErrorMessage,
    isTransientError
  }
}

/**
 * Create a retry wrapper for async functions
 * Useful for wrapping API calls, data fetching, etc.
 * 
 * @example
 * ```ts
 * const fetchWithRetry = createRetryWrapper(fetchData, {
 *   maxRetries: 3,
 *   retryStrategy: 'exponential'
 * })
 * 
 * const data = await fetchWithRetry()
 * ```
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    const { executeWithRetry } = useErrorRecovery()
    return executeWithRetry(() => fn(...args), options)
  }) as T
}

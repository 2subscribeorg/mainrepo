/**
 * Client-side rate limiting
 * Prevents rapid repeated actions (e.g., form submissions, API calls)
 * Uses localStorage for persistence across page refreshes
 */

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

interface StoredRateLimitData {
  attempts: number[]
  expiresAt: number
}

class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  private readonly STORAGE_PREFIX = 'rate_limit_'
  private readonly STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Get storage key for a rate limit entry
   */
  private getStorageKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`
  }

  /**
   * Load attempts from localStorage
   */
  private loadFromStorage(key: string): number[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return []
      }

      const storageKey = this.getStorageKey(key)
      const stored = localStorage.getItem(storageKey)
      
      if (!stored) return []

      const data: StoredRateLimitData = JSON.parse(stored)
      
      // Check if data has expired
      if (Date.now() > data.expiresAt) {
        localStorage.removeItem(storageKey)
        return []
      }

      return data.attempts
    } catch {
      // If localStorage fails, fall back to empty array
      return []
    }
  }

  /**
   * Save attempts to localStorage
   */
  private saveToStorage(key: string, attempts: number[]): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return
      }

      const storageKey = this.getStorageKey(key)
      const data: StoredRateLimitData = {
        attempts,
        expiresAt: Date.now() + this.STORAGE_EXPIRY_MS
      }

      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }

  /**
   * Get attempts for a key (from memory or localStorage)
   */
  private getAttempts(key: string): number[] {
    // Check memory first
    if (this.attempts.has(key)) {
      return this.attempts.get(key)!
    }

    // Load from localStorage
    const stored = this.loadFromStorage(key)
    if (stored.length > 0) {
      this.attempts.set(key, stored)
    }

    return stored
  }

  /**
   * Check if an action is allowed
   * @param key - Unique identifier for the action (e.g., 'save-subscription', 'delete-category')
   * @param maxAttempts - Maximum attempts allowed in the time window
   * @param windowMs - Time window in milliseconds
   * @returns true if allowed, false if rate limit exceeded
   */
  check(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now()
    const attempts = this.getAttempts(key)

    // Remove attempts outside the time window
    const recentAttempts = attempts.filter((time) => now - time < windowMs)

    if (recentAttempts.length >= maxAttempts) {
      return false // Rate limit exceeded
    }

    // Record this attempt
    recentAttempts.push(now)
    this.attempts.set(key, recentAttempts)
    this.saveToStorage(key, recentAttempts)
    return true
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.attempts.delete(key)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.getStorageKey(key))
      }
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.attempts.clear()
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Clear all rate limit entries from localStorage
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith(this.STORAGE_PREFIX)) {
            localStorage.removeItem(key)
          }
        })
      }
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }

  /**
   * Get remaining attempts for a key
   */
  getRemaining(key: string, maxAttempts: number, windowMs: number): number {
    const now = Date.now()
    const attempts = this.getAttempts(key)
    const recentAttempts = attempts.filter((time) => now - time < windowMs)
    return Math.max(0, maxAttempts - recentAttempts.length)
  }

  /**
   * Get time until next attempt is allowed (in ms)
   */
  getTimeUntilReset(key: string, windowMs: number): number {
    const attempts = this.getAttempts(key)
    if (attempts.length === 0) return 0

    const now = Date.now()
    const recentAttempts = attempts.filter((time) => now - time < windowMs)
    
    if (recentAttempts.length === 0) return 0

    const oldestAttempt = Math.min(...recentAttempts)
    const resetTime = oldestAttempt + windowMs
    return Math.max(0, resetTime - now)
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Common rate limit presets
export const RATE_LIMITS = {
  // Form submissions
  FORM_SUBMIT: { maxAttempts: 5, windowMs: 60000 }, // 5 per minute
  
  // Save operations
  SAVE_DATA: { maxAttempts: 10, windowMs: 60000 }, // 10 per minute
  
  // Delete operations (more restrictive)
  DELETE_DATA: { maxAttempts: 3, windowMs: 60000 }, // 3 per minute
  
  // Search queries
  SEARCH: { maxAttempts: 20, windowMs: 60000 }, // 20 per minute
  
  // Authentication - CRITICAL for security
  LOGIN: { maxAttempts: 5, windowMs: 900000 }, // 5 per 15 minutes
  SIGNUP: { maxAttempts: 3, windowMs: 3600000 }, // 3 per hour
  PASSWORD_RESET: { maxAttempts: 3, windowMs: 3600000 }, // 3 per hour
  PASSWORD_CHANGE: { maxAttempts: 3, windowMs: 900000 }, // 3 per 15 minutes
  
  // API calls
  API_CALL: { maxAttempts: 30, windowMs: 60000 }, // 30 per minute
  
  // Plaid-specific operations (more restrictive due to external API costs)
  PLAID_CREATE_LINK: { maxAttempts: 10, windowMs: 60000 }, // 10 per minute
  PLAID_EXCHANGE_TOKEN: { maxAttempts: 5, windowMs: 60000 }, // 5 per minute
  PLAID_SYNC_TRANSACTIONS: { maxAttempts: 10, windowMs: 60000 }, // 10 per minute
  PLAID_DISCONNECT: { maxAttempts: 5, windowMs: 60000 }, // 5 per minute
} as const

/**
 * Helper function to check rate limit with preset
 */
export function checkRateLimit(
  action: string,
  preset: RateLimitConfig = RATE_LIMITS.FORM_SUBMIT
): boolean {
  return rateLimiter.check(action, preset.maxAttempts, preset.windowMs)
}

/**
 * Helper to get user-friendly error message
 */
export function getRateLimitMessage(
  key: string,
  preset: RateLimitConfig = RATE_LIMITS.FORM_SUBMIT
): string {
  const timeUntilReset = rateLimiter.getTimeUntilReset(key, preset.windowMs)
  const secondsRemaining = Math.ceil(timeUntilReset / 1000)

  if (secondsRemaining <= 0) {
    return 'Please try again'
  }

  if (secondsRemaining < 60) {
    return `Too many attempts. Please wait ${secondsRemaining} seconds`
  }

  const minutesRemaining = Math.ceil(secondsRemaining / 60)
  return `Too many attempts. Please wait ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}`
}

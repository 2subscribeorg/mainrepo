/**
 * Client-side rate limiting
 * Prevents rapid repeated actions (e.g., form submissions, API calls)
 */

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

class RateLimiter {
  private attempts: Map<string, number[]> = new Map()

  /**
   * Check if an action is allowed
   * @param key - Unique identifier for the action (e.g., 'save-subscription', 'delete-category')
   * @param maxAttempts - Maximum attempts allowed in the time window
   * @param windowMs - Time window in milliseconds
   * @returns true if allowed, false if rate limit exceeded
   */
  check(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []

    // Remove attempts outside the time window
    const recentAttempts = attempts.filter((time) => now - time < windowMs)

    if (recentAttempts.length >= maxAttempts) {
      return false // Rate limit exceeded
    }

    // Record this attempt
    recentAttempts.push(now)
    this.attempts.set(key, recentAttempts)
    return true
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.attempts.delete(key)
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.attempts.clear()
  }

  /**
   * Get remaining attempts for a key
   */
  getRemaining(key: string, maxAttempts: number, windowMs: number): number {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    const recentAttempts = attempts.filter((time) => now - time < windowMs)
    return Math.max(0, maxAttempts - recentAttempts.length)
  }

  /**
   * Get time until next attempt is allowed (in ms)
   */
  getTimeUntilReset(key: string, windowMs: number): number {
    const attempts = this.attempts.get(key) || []
    if (attempts.length === 0) return 0

    const oldestAttempt = Math.min(...attempts)
    const resetTime = oldestAttempt + windowMs
    return Math.max(0, resetTime - Date.now())
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
  
  // Password attempts (if adding auth later)
  PASSWORD: { maxAttempts: 3, windowMs: 300000 }, // 3 per 5 minutes
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

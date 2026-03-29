/**
 * Authentication-specific rate limiting
 * Provides additional security features for auth operations
 */

import { rateLimiter, RATE_LIMITS } from './rateLimiter'

interface LoginAttempt {
  email: string
  timestamp: number
  success: boolean
}

class AuthRateLimiter {
  private loginAttempts: LoginAttempt[] = []
  private readonly MAX_FAILED_ATTEMPTS = 5
  private readonly LOCKOUT_DURATION = 900000 // 15 minutes

  /**
   * Check if login is allowed for this email
   * Implements progressive delays and account lockout
   */
  canAttemptLogin(email: string): { allowed: boolean; message?: string; retryAfter?: number } {
    const normalizedEmail = email.toLowerCase().trim()
    const now = Date.now()

    // Clean up old attempts (older than 1 hour)
    this.loginAttempts = this.loginAttempts.filter(
      attempt => now - attempt.timestamp < 3600000
    )

    // Get recent failed attempts for this email
    const recentFailures = this.loginAttempts.filter(
      attempt => 
        attempt.email === normalizedEmail && 
        !attempt.success &&
        now - attempt.timestamp < this.LOCKOUT_DURATION
    )

    // Check if account is locked out
    if (recentFailures.length >= this.MAX_FAILED_ATTEMPTS) {
      const oldestFailure = Math.min(...recentFailures.map(a => a.timestamp))
      const unlockTime = oldestFailure + this.LOCKOUT_DURATION
      const remainingMs = unlockTime - now

      if (remainingMs > 0) {
        const remainingMinutes = Math.ceil(remainingMs / 60000)
        return {
          allowed: false,
          message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
          retryAfter: remainingMs
        }
      }
    }

    // Check standard rate limit
    const rateLimitKey = `login:${normalizedEmail}`
    if (!rateLimiter.check(rateLimitKey, RATE_LIMITS.LOGIN.maxAttempts, RATE_LIMITS.LOGIN.windowMs)) {
      const timeUntilReset = rateLimiter.getTimeUntilReset(rateLimitKey, RATE_LIMITS.LOGIN.windowMs)
      const minutesRemaining = Math.ceil(timeUntilReset / 60000)
      return {
        allowed: false,
        message: `Too many login attempts. Please wait ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`,
        retryAfter: timeUntilReset
      }
    }

    return { allowed: true }
  }

  /**
   * Record a login attempt
   */
  recordLoginAttempt(email: string, success: boolean): void {
    const normalizedEmail = email.toLowerCase().trim()
    this.loginAttempts.push({
      email: normalizedEmail,
      timestamp: Date.now(),
      success
    })

    // If successful, clear failed attempts for this email
    if (success) {
      this.loginAttempts = this.loginAttempts.filter(
        attempt => attempt.email !== normalizedEmail || attempt.success
      )
    }
  }

  /**
   * Get failed attempt count for an email
   */
  getFailedAttemptCount(email: string): number {
    const normalizedEmail = email.toLowerCase().trim()
    const now = Date.now()
    
    return this.loginAttempts.filter(
      attempt => 
        attempt.email === normalizedEmail && 
        !attempt.success &&
        now - attempt.timestamp < this.LOCKOUT_DURATION
    ).length
  }

  /**
   * Clear all attempts for an email (use after successful password reset)
   */
  clearAttempts(email: string): void {
    const normalizedEmail = email.toLowerCase().trim()
    this.loginAttempts = this.loginAttempts.filter(
      attempt => attempt.email !== normalizedEmail
    )
    rateLimiter.reset(`login:${normalizedEmail}`)
  }

  /**
   * Reset all rate limits (for testing)
   */
  reset(): void {
    this.loginAttempts = []
    rateLimiter.clear()
  }
}

// Singleton instance
export const authRateLimiter = new AuthRateLimiter()

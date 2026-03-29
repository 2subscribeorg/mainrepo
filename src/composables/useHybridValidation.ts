/**
 * Hybrid Validation Composable
 * Provides server-side validation with client-side fallback
 * Ensures validation works both with and without backend
 */

import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'
import { z } from 'zod'

// ============================================================================
// CLIENT-SIDE VALIDATION SCHEMAS (mirror backend schemas)
// ============================================================================

const subscriptionAmountSchema = z.number()
  .positive("Amount must be positive")
  .max(999999, "Amount too large (max: £999,999)")
  .finite("Amount must be a finite number")

const merchantNameSchema = z.string()
  .min(1, "Merchant name is required")
  .max(100, "Merchant name too long (max: 100 characters)")
  .regex(/^[a-zA-Z0-9\s\-_.,&()[\]'"\/]+$/, "Invalid characters in merchant name")

const subscriptionStatusSchema = z.enum(['active', 'cancelled', 'paused', 'expired'])
const subscriptionFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time'])

const categoryNameSchema = z.string()
  .min(1, "Category name is required")
  .max(50, "Category name too long (max: 50 characters)")
  .regex(/^[a-zA-Z0-9\s\-_]+$/, "Category name can only contain letters, numbers, spaces, hyphens, and underscores")

const categoryColorSchema = z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format (use #RRGGBB)")
  .default("#007ACC")

const transactionDateSchema = z.string()
  .datetime("Invalid date format")
  .refine((dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    return date <= now && date >= oneYearAgo
  }, "Transaction date must be within the last year and not in the future")

// Full schemas
const subscriptionSchema = z.object({
  amount: subscriptionAmountSchema,
  merchantName: merchantNameSchema,
  categoryId: z.string().min(1, "Category ID is required").max(128),
  userId: z.string().min(1, "User ID is required").max(128),
  status: subscriptionStatusSchema.default('active'),
  frequency: subscriptionFrequencySchema.default('monthly'),
  nextBillingDate: z.string()
    .refine((val) => {
      // Accept both date-only (YYYY-MM-DD) and full datetime (ISO 8601) formats
      const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/
      const isDateOnly = dateOnlyRegex.test(val)
      const isValidDate = !isNaN(new Date(val).getTime())
      return isDateOnly || isValidDate
    }, "Invalid date format (use YYYY-MM-DD or ISO datetime)")
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
  isActive: z.boolean().default(true),
})

const categorySchema = z.object({
  name: categoryNameSchema,
  userId: z.string().min(1, "User ID is required").max(128),
  color: categoryColorSchema,
  icon: z.string().max(50).regex(/^[a-zA-Z0-9\-_]+$/).optional(),
  description: z.string().max(200, "Description too long").optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).optional(),
})

const transactionSchema = z.object({
  amount: z.number().finite().max(999999999),
  merchantName: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s\-_.,&()[\]'"\/]+$/),
  date: transactionDateSchema,
  categoryId: z.string().max(128).optional(),
  userId: z.string().min(1).max(128),
  subscriptionId: z.string().max(128).optional(),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default("GBP"),
  type: z.enum(['debit', 'credit']).default('debit'),
})

// ============================================================================
// HYBRID VALIDATION COMPOSABLE
// ============================================================================

export function useHybridValidation() {
  const isValidating = ref(false)
  const validationError = ref<string | null>(null)
  const usingServerValidation = ref(false)

  /**
   * Validate subscription data with hybrid approach
   */
  const validateSubscription = async (subscriptionData: any) => {
    isValidating.value = true
    validationError.value = null
    usingServerValidation.value = false

    try {
      // Try server validation first
      try {
        const response = await fetch('/api/validate/subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription: subscriptionData }),
        })

        if (response.ok) {
          const result = await response.json()
          usingServerValidation.value = true
          logger.success('Server validation passed for subscription')
          return { valid: true, usingServer: true, data: result }
        } else {
          const error = await response.json()
          throw new Error(error.error?.message || 'Server validation failed')
        }
      } catch (serverError) {
        logger.warn('⚠️ Backend not available, using client validation:', serverError)
        
        // Fallback to client validation
        const result = subscriptionSchema.safeParse(subscriptionData)
        
        if (result.success) {
          logger.success('Client validation passed for subscription')
          return { valid: true, usingServer: false, data: result.data }
        } else {
          const errorMessages = result.error.issues.map(issue => issue.message)
          throw new Error(errorMessages.join(', '))
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed'
      validationError.value = errorMessage
      logger.error('❌ Subscription validation failed:', errorMessage)
      return { valid: false, error: errorMessage, usingServer: usingServerValidation.value }
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Validate category data with hybrid approach
   */
  const validateCategory = async (categoryData: any) => {
    isValidating.value = true
    validationError.value = null
    usingServerValidation.value = false

    try {
      // Try server validation first
      try {
        const response = await fetch('/api/validate/category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ category: categoryData }),
        })

        if (response.ok) {
          const result = await response.json()
          usingServerValidation.value = true
          logger.success('Server validation passed for category')
          return { valid: true, usingServer: true, data: result }
        } else {
          const error = await response.json()
          throw new Error(error.error?.message || 'Server validation failed')
        }
      } catch (serverError) {
        logger.warn('⚠️ Backend not available, using client validation:', serverError)
        
        // Fallback to client validation
        const result = categorySchema.safeParse(categoryData)
        
        if (result.success) {
          logger.success('Client validation passed for category')
          return { valid: true, usingServer: false, data: result.data }
        } else {
          const errorMessages = result.error.issues.map(issue => issue.message)
          throw new Error(errorMessages.join(', '))
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed'
      validationError.value = errorMessage
      logger.error('❌ Category validation failed:', errorMessage)
      return { valid: false, error: errorMessage, usingServer: usingServerValidation.value }
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Validate transaction data with hybrid approach
   */
  const validateTransaction = async (transactionData: any) => {
    isValidating.value = true
    validationError.value = null
    usingServerValidation.value = false

    try {
      // Try server validation first
      try {
        const response = await fetch('/api/validate/transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transaction: transactionData }),
        })

        if (response.ok) {
          const result = await response.json()
          usingServerValidation.value = true
          logger.success('Server validation passed for transaction')
          return { valid: true, usingServer: true, data: result }
        } else {
          const error = await response.json()
          throw new Error(error.error?.message || 'Server validation failed')
        }
      } catch (serverError) {
        logger.warn('⚠️ Backend not available, using client validation:', serverError)
        
        // Fallback to client validation
        const result = transactionSchema.safeParse(transactionData)
        
        if (result.success) {
          logger.success('Client validation passed for transaction')
          return { valid: true, usingServer: false, data: result.data }
        } else {
          const errorMessages = result.error.issues.map(issue => issue.message)
          throw new Error(errorMessages.join(', '))
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed'
      validationError.value = errorMessage
      logger.error('❌ Transaction validation failed:', errorMessage)
      return { valid: false, error: errorMessage, usingServer: usingServerValidation.value }
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Check if validation service is available
   */
  const checkValidationService = async () => {
    try {
      const response = await fetch('/api/validate/health')
      return response.ok
    } catch {
      return false
    }
  }

  // Computed properties
  const isServerAvailable = computed(() => usingServerValidation.value)
  const hasValidationError = computed(() => validationError.value !== null)

  return {
    // State
    isValidating,
    validationError,
    usingServerValidation,
    isServerAvailable,
    hasValidationError,
    
    // Methods
    validateSubscription,
    validateCategory,
    validateTransaction,
    checkValidationService,
    
    // Utilities
    clearValidationError: () => { validationError.value = null },
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Quick client-side validation (no server call)
 */
export function validateSubscriptionClient(data: any) {
  const result = subscriptionSchema.safeParse(data)
  return {
    valid: result.success,
    data: result.success ? result.data : null,
    errors: result.success ? [] : result.error.issues.map(issue => issue.message)
  }
}

export function validateCategoryClient(data: any) {
  const result = categorySchema.safeParse(data)
  return {
    valid: result.success,
    data: result.success ? result.data : null,
    errors: result.success ? [] : result.error.issues.map(issue => issue.message)
  }
}

export function validateTransactionClient(data: any) {
  const result = transactionSchema.safeParse(data)
  return {
    valid: result.success,
    data: result.success ? result.data : null,
    errors: result.success ? [] : result.error.issues.map(issue => issue.message)
  }
}

/**
 * Type guards
 */
export function isValidationError(error: any): error is { error: string } {
  return error && typeof error === 'object' && 'error' in error
}

export function isValidationSuccess(result: any): result is { valid: true; data: any } {
  return result && typeof result === 'object' && result.valid === true
}

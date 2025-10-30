/**
 * Input validation utilities
 * These work in Phase 1 (mock) and Phase 2 (production APIs)
 */

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

// Amount validation
export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && amount >= 0 && amount <= 999999.99
}

// Date validation (ISO format: YYYY-MM-DD)
export function isValidISODate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(date)) return false

  const parsedDate = new Date(date)
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime())
}

// Merchant name validation
export function isValidMerchantName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 100
}

// Category name validation
export function isValidCategoryName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 50
}

// Hex color validation
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color)
}

// Merchant pattern validation (for admin rules)
export function isValidMerchantPattern(pattern: string): boolean {
  const trimmed = pattern.trim()
  return trimmed.length >= 2 && trimmed.length <= 50
}

// Validation result type
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Subscription validation
export interface SubscriptionInput {
  merchantName: string
  amount: number
  recurrence: string
  nextPaymentDate: string
  categoryId: string
}

export function validateSubscription(data: SubscriptionInput): ValidationResult {
  const errors: string[] = []

  if (!isValidMerchantName(data.merchantName)) {
    errors.push('Merchant name must be between 2 and 100 characters')
  }

  if (!isValidAmount(data.amount)) {
    errors.push('Amount must be between 0 and 999,999.99')
  }

  if (!['monthly', 'yearly', 'weekly', 'custom'].includes(data.recurrence)) {
    errors.push('Invalid recurrence type')
  }

  if (!isValidISODate(data.nextPaymentDate)) {
    errors.push('Invalid date format (use YYYY-MM-DD)')
  }

  if (!data.categoryId || data.categoryId.trim().length === 0) {
    errors.push('Category is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Budget validation
export interface BudgetInput {
  monthlyLimit?: number
  yearlyLimit?: number
  perCategoryLimits?: Record<string, number>
}

export function validateBudget(data: BudgetInput): ValidationResult {
  const errors: string[] = []

  if (data.monthlyLimit !== undefined) {
    if (!isValidAmount(data.monthlyLimit)) {
      errors.push('Monthly limit must be between 0 and 999,999.99')
    }
  }

  if (data.yearlyLimit !== undefined) {
    if (!isValidAmount(data.yearlyLimit)) {
      errors.push('Yearly limit must be between 0 and 999,999.99')
    }
  }

  if (
    data.monthlyLimit !== undefined &&
    data.yearlyLimit !== undefined &&
    data.monthlyLimit * 12 > data.yearlyLimit
  ) {
    errors.push('Monthly limit × 12 cannot exceed yearly limit')
  }

  if (data.perCategoryLimits) {
    Object.entries(data.perCategoryLimits).forEach(([categoryId, limit]) => {
      if (!isValidAmount(limit)) {
        errors.push(`Invalid limit for category ${categoryId}`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Category validation
export interface CategoryInput {
  name: string
  colour?: string
  monthlyLimit?: number
}

export function validateCategory(data: CategoryInput): ValidationResult {
  const errors: string[] = []

  if (!isValidCategoryName(data.name)) {
    errors.push('Category name must be between 2 and 50 characters')
  }

  if (data.colour && !isValidHexColor(data.colour)) {
    errors.push('Invalid color format (use #RRGGBB)')
  }

  if (data.monthlyLimit !== undefined && !isValidAmount(data.monthlyLimit)) {
    errors.push('Monthly limit must be between 0 and 999,999.99')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Merchant rule validation
export interface MerchantRuleInput {
  merchantPattern: string
  categoryId: string
}

export function validateMerchantRule(data: MerchantRuleInput): ValidationResult {
  const errors: string[] = []

  if (!isValidMerchantPattern(data.merchantPattern)) {
    errors.push('Merchant pattern must be between 2 and 50 characters')
  }

  if (!data.categoryId || data.categoryId.trim().length === 0) {
    errors.push('Category is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

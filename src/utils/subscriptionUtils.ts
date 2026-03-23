/**
 * Subscription utility functions
 * Business logic helpers for subscription operations
 */

import type { 
  SubscriptionRecurrence, 
  DateCalculationConfig, 
  SubscriptionConfig
} from '@/types/subscriptions'
import { DEFAULT_SUBSCRIPTION_CONFIG } from '@/types/subscriptions'

/**
 * Calculate the next payment date based on recurrence type
 * Enhanced version with configurable recurrence patterns
 */
export function calculateNextPaymentDate(
  transactionDate: string, 
  recurrence: SubscriptionRecurrence = 'monthly',
  customOffset?: number
): string {
  const date = new Date(transactionDate)
  
  // Validate input date
  if (isNaN(date.getTime())) {
    throw new Error('Invalid transaction date provided')
  }
  
  switch (recurrence) {
    case 'weekly':
      date.setDate(date.getDate() + (customOffset || 7))
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      // Fallback to monthly if invalid recurrence
      date.setMonth(date.getMonth() + 1)
  }
  
  return date.toISOString().split('T')[0]
}

/**
 * Calculate next payment date with full configuration
 */
export function calculateNextPaymentDateWithConfig(config: DateCalculationConfig): string {
  return calculateNextPaymentDate(config.baseDate, config.recurrence, config.customOffset)
}

/**
 * Get default recurrence for a given merchant (can be extended with ML/patterns later)
 */
export function getDefaultRecurrenceForMerchant(merchantName: string): SubscriptionRecurrence {
  const merchant = merchantName.toLowerCase()
  
  // Common patterns - can be extended or moved to a configuration file
  if (merchant.includes('netflix') || merchant.includes('spotify') || merchant.includes('hulu')) {
    return 'monthly'
  }
  
  if (merchant.includes('annual') || merchant.includes('yearly')) {
    return 'yearly'
  }
  
  if (merchant.includes('weekly') || merchant.includes('gym')) {
    return 'weekly'
  }
  
  // Default fallback
  return DEFAULT_SUBSCRIPTION_CONFIG.defaultRecurrence
}

/**
 * Validate recurrence type
 */
export function isValidRecurrence(recurrence: string): recurrence is SubscriptionRecurrence {
  return ['weekly', 'monthly', 'quarterly', 'yearly'].includes(recurrence)
}

/**
 * Get human-readable recurrence description
 */
export function getRecurrenceDescription(recurrence: SubscriptionRecurrence): string {
  const descriptions = {
    weekly: 'Every week',
    monthly: 'Every month',
    quarterly: 'Every 3 months',
    yearly: 'Every year'
  }
  
  return descriptions[recurrence] || 'Unknown frequency'
}

/**
 * Calculate subscription cost per year for comparison
 */
export function calculateAnnualCost(amount: number, recurrence: SubscriptionRecurrence): number {
  const multipliers = {
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    yearly: 1
  }
  
  return amount * (multipliers[recurrence] || 12)
}

/**
 * Generate subscription notes based on creation context
 */
export function generateSubscriptionNotes(
  source: 'manual' | 'pattern_detection' | 'import',
  confidence?: number,
  transactionDate?: string
): string {
  switch (source) {
    case 'manual':
      return `Created manually from transaction${transactionDate ? ` on ${transactionDate}` : ''}`
    case 'pattern_detection':
      return `Created from pattern detection${confidence ? ` with ${Math.round(confidence * 100)}% confidence` : ''}`
    case 'import':
      return 'Imported from external source'
    default:
      return 'Subscription created'
  }
}

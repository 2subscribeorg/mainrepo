/**
 * Subscription-related types and configuration interfaces
 * Used for business logic and internal configuration
 */

// Recurrence types for subscriptions
export type SubscriptionRecurrence = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

// Subscription configuration interface
export interface SubscriptionConfig {
  defaultRecurrence: SubscriptionRecurrence
  defaultDaysOffset: number
  allowCustomRecurrence: boolean
}

// Default subscription configuration
export const DEFAULT_SUBSCRIPTION_CONFIG: SubscriptionConfig = {
  defaultRecurrence: 'monthly',
  defaultDaysOffset: 30,
  allowCustomRecurrence: true
}

// Subscription creation parameters
export interface SubscriptionCreationParams {
  transactionId: string
  categoryId: string
  recurrence?: SubscriptionRecurrence
  customDaysOffset?: number
}

// Date calculation configuration
export interface DateCalculationConfig {
  recurrence: SubscriptionRecurrence
  baseDate: string
  customOffset?: number
}

// Subscription status types
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired'

// Subscription source types
export type SubscriptionSource = 'manual' | 'pattern_detection' | 'import' | 'api'

// Enhanced subscription creation data
export interface EnhancedSubscriptionData {
  merchantName: string
  amount: {
    amount: number
    currency: string
  }
  recurrence: SubscriptionRecurrence
  nextPaymentDate: string
  categoryId: string
  status: SubscriptionStatus
  source: SubscriptionSource
  notes?: string
  confidence?: number
}

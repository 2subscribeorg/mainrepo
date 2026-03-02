import type { ID, Money, Recurrence } from '@/domain/models'

export interface RenewalWarning {
  id: ID
  userId: ID
  subscriptionId: ID
  
  // Warning details
  dueDate: string              // ISO date of next payment
  daysUntilDue: number         // Calculated days remaining
  warningThreshold: number     // Days before to warn (5, 10, or 21)
  
  // Subscription snapshot (for display)
  merchantName: string
  amount: Money
  recurrence: Recurrence
  
  // State management
  status: 'active' | 'dismissed' | 'expired'
  notificationSent: boolean
  notificationSentAt?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  expiresAt: string           // Auto-delete after due date
}

export interface WarningCalculationResult {
  userId: ID
  warningsCreated: number
  warningsUpdated: number
  warningsExpired: number
  errors: string[]
}

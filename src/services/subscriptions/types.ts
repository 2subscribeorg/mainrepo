import type { BankTransaction, Recurrence } from '@/domain/models'

export interface RecurringPattern {
  merchant: string
  normalizedMerchant: string
  amount: number
  amountVariance: number
  frequency: Recurrence
  confidence: number
  lastDate: string
  nextDate: string
  transactions: BankTransaction[]
  detectionReason: 'amount_matching'
  flags: any[]
}

export interface DetectionConfig {
  minTransactions: number
  minConfidence: number
  intervalToleranceDays: number
  amountTolerancePercent: number
  lookbackDays: number
}

export const DEFAULT_CONFIG: DetectionConfig = {
  minTransactions: 2,
  minConfidence: 0.3,
  intervalToleranceDays: 7,
  amountTolerancePercent: 20,
  lookbackDays: 365
}

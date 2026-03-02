import type { BankTransaction, Recurrence } from '@/domain/models'
import type { RecurringPattern, DetectionConfig } from './types'
import { ConfidenceScorer } from './ConfidenceScorer'

/**
 * Builds RecurringPattern objects from transaction clusters
 * Handles pattern creation and next payment prediction
 */
export class PatternBuilder {
  private confidenceScorer: ConfidenceScorer

  constructor(private config: DetectionConfig) {
    this.confidenceScorer = new ConfidenceScorer()
  }

  /**
   * Create a pattern from a cluster of transactions with similar merchant and amount
   */
  createHybridPattern(
    normalizedMerchant: string,
    transactions: BankTransaction[]
  ): RecurringPattern | null {
    if (transactions.length < this.config.minTransactions) {
      return null
    }
    
    // Sort by date
    const sorted = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    const firstTx = sorted[0]
    const lastTx = sorted[sorted.length - 1]
    
    // Calculate amount statistics
    const amounts = sorted.map(t => Math.abs(t.amount.amount))
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
    const variance = this.confidenceScorer.calculateStandardDeviation(amounts)
    
    // Calculate confidence based on amount variance and transaction count
    const confidence = this.confidenceScorer.calculateScore(sorted, variance)
    
    // Default to monthly frequency (can be enhanced with interval analysis)
    const frequency: Recurrence = 'monthly'
    
    // Calculate next expected date (30 days from last transaction)
    const nextDate = new Date(lastTx.date)
    nextDate.setDate(nextDate.getDate() + 30)
    
    return {
      merchant: firstTx.merchantName,
      normalizedMerchant,
      amount: avgAmount,
      amountVariance: variance,
      frequency,
      confidence,
      lastDate: lastTx.date,
      nextDate: nextDate.toISOString().split('T')[0],
      transactions: sorted,
      detectionReason: 'amount_matching' as const,
      flags: []
    }
  }

  /**
   * Create a subscription pattern from transactions with matching amounts
   * No complex date analysis - just matching amounts = subscription
   */
  createAmountBasedPattern(
    merchant: string, 
    transactions: BankTransaction[], 
    amount: number
  ): RecurringPattern | null {
    console.log(`💰 createAmountBasedPattern: ${merchant}, ${transactions.length} transactions, amount ${amount}`)
    
    if (transactions.length < 2) {
      console.log(`💰 Not enough transactions: ${transactions.length}`)
      return null
    }
    
    console.log(`💰 Transaction details:`, transactions.map(t => ({
      id: t.id,
      merchant: t.merchantName,
      amount: t.amount?.amount,
      date: t.date
    })))
    
    // Sort by date for consistency
    const sorted = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    const firstTx = sorted[0]
    const lastTx = sorted[sorted.length - 1]
    
    // Default to monthly frequency for subscriptions
    const frequency: Recurrence = 'monthly'
    const confidence = 0.9 // High confidence for exact amount matches
    
    // Calculate next expected date (30 days from last transaction)
    const nextDate = new Date(lastTx.date)
    nextDate.setDate(nextDate.getDate() + 30)
    
    const pattern = {
      merchant: firstTx.merchantName,
      normalizedMerchant: merchant,
      amount,
      amountVariance: 0, // Exact match, no variance
      frequency,
      confidence,
      lastDate: lastTx.date,
      nextDate: nextDate.toISOString().split('T')[0],
      transactions: sorted,
      detectionReason: 'amount_matching' as const,
      flags: []
    }
    
    console.log(`💰 Created pattern:`, pattern)
    return pattern
  }

  /**
   * Predict next payment date based on frequency
   */
  predictNextPayment(lastDate: string, frequency: Recurrence): string {
    const date = new Date(lastDate)
    
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'biweekly':
        date.setDate(date.getDate() + 14)
        break
      case 'monthly':
        // Handle month-end dates properly
        const currentDay = date.getDate()
        date.setMonth(date.getMonth() + 1)
        // If day changed (e.g., Jan 31 -> Mar 3), set to last day of month
        if (date.getDate() !== currentDay) {
          date.setDate(0)  // Go to last day of previous month
        }
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
      case 'custom':
        // Default to monthly for custom
        date.setMonth(date.getMonth() + 1)
        break
    }
    
    return date.toISOString().split('T')[0]
  }
}

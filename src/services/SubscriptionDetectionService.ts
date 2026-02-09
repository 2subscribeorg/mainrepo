import { PatternDetector, type RecurringPattern, type DetectionConfig } from './PatternDetector'
import type { BankTransaction } from '@/domain/models'



/**
 * Simple service that detects subscription patterns
 * Works with any transaction source (Plaid, manual, mock)
 * 
 * Simplified to solve today's problem - just detect patterns
 */
export class SubscriptionDetectionService {
  private detector: PatternDetector

  constructor(detectionConfig?: Partial<DetectionConfig>) {
    this.detector = new PatternDetector(detectionConfig)
  }

  /**
   * Simple pattern detection - just find recurring transactions
   */
  detectPatterns(transactions: BankTransaction[]): RecurringPattern[] {
    console.log('🔍 Detecting subscription patterns...')
    
    const patterns = this.detector.detectPatterns(transactions)
    console.log(`📊 Found ${patterns.length} patterns`)
    
    return patterns
  }

  /**
   * Check if a new transaction matches any existing pattern
   * Useful for real-time transaction processing
   */
  matchNewTransaction(
    transaction: BankTransaction,
    patterns: RecurringPattern[]
  ): RecurringPattern | null {
    for (const pattern of patterns) {
      if (this.detector.matchesPattern(transaction, pattern)) {
        return pattern
      }
    }
    return null
  }
}

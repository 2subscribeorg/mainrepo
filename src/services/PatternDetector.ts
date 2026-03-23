import type { BankTransaction } from '@/domain/models'
import { MerchantNormalizer } from './subscriptions/MerchantNormalizer'
import { AmountClusterer } from './subscriptions/AmountClusterer'
import { PatternBuilder } from './subscriptions/PatternBuilder'
import type { RecurringPattern, DetectionConfig } from './subscriptions/types'
import { DEFAULT_CONFIG } from './subscriptions/types'

// Re-export types for backward compatibility
export type { RecurringPattern, DetectionConfig }

/**
 * Main orchestrator for subscription pattern detection
 * Delegates to specialized modules for merchant normalization, amount clustering, and pattern building
 */
export class PatternDetector {
  private config: DetectionConfig
  private merchantNormalizer: MerchantNormalizer
  private amountClusterer: AmountClusterer
  private patternBuilder: PatternBuilder

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.merchantNormalizer = new MerchantNormalizer()
    this.amountClusterer = new AmountClusterer(this.config.amountTolerancePercent)
    this.patternBuilder = new PatternBuilder(this.config)
  }


  /**
   * Main entry point: Analyze all transactions and return detected patterns
   * Uses hybrid approach: merchant-based grouping with amount clustering
   */
  detectPatterns(transactions: BankTransaction[]): RecurringPattern[] {
    
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.lookbackDays)
      
      // Filter transactions within lookback period AND exclude already confirmed subscriptions
      const recentTransactions = transactions.filter(t => 
        new Date(t.date) >= cutoffDate && !t.matchedSubscriptionId
      )
      
      
      // Use hybrid detection: merchant-based with amount clustering
      const patterns = this.detectHybridPatterns(recentTransactions)
      
      return patterns.sort((a, b) => b.confidence - a.confidence)
    } catch (error) {
      console.error('❌ Error in PatternDetector.detectPatterns:', error)
      return []
    }
  }

  /**
   * Hybrid detection: Group by merchant (with fuzzy matching), then cluster by amount
   * This catches price changes, VAT adjustments, and merchant name variations
   */
  private detectHybridPatterns(transactions: BankTransaction[]): RecurringPattern[] {
    
    // Step 1: Group by similar merchants using fuzzy matching
    const merchantGroups = new Map<string, BankTransaction[]>()
    
    for (const tx of transactions) {
      if (!tx.amount || typeof tx.amount.amount !== 'number') {
        continue
      }
      
      const normalized = this.merchantNormalizer.normalize(tx.merchantName)
      
      // Check if similar merchant already exists (fuzzy matching)
      let matchedMerchant = normalized
      let bestSimilarity = 0
      
      for (const existingMerchant of merchantGroups.keys()) {
        const similarity = this.merchantNormalizer.calculateSimilarity(normalized, existingMerchant)
        if (similarity > 0.8 && similarity > bestSimilarity) {
          matchedMerchant = existingMerchant
          bestSimilarity = similarity
        }
      }
      
      if (!merchantGroups.has(matchedMerchant)) {
        merchantGroups.set(matchedMerchant, [])
      }
      merchantGroups.get(matchedMerchant)!.push(tx)
    }
    
    // Step 2: For each merchant group, cluster by similar amounts
    const patterns: RecurringPattern[] = []
    
    for (const [merchant, txs] of merchantGroups) {
      if (txs.length < this.config.minTransactions) {
        continue
      }
      
      
      // Cluster transactions by similar amounts
      const amountClusters = this.amountClusterer.clusterByAmount(txs)
      
      
      // Create pattern for each cluster with enough transactions
      for (const cluster of amountClusters) {
        if (cluster.length >= this.config.minTransactions) {
          const pattern = this.patternBuilder.createHybridPattern(merchant, cluster)
          if (pattern && pattern.confidence >= this.config.minConfidence) {
            patterns.push(pattern)
          }
        }
      }
    }
    
    return patterns
  }

  /**
   * Check if a new transaction matches an existing pattern
   * Useful for real-time updates
   */
  matchesPattern(transaction: BankTransaction, pattern: RecurringPattern): boolean {
    // Check merchant
    const normalized = this.merchantNormalizer.normalize(transaction.merchantName)
    if (normalized !== pattern.normalizedMerchant) return false

    // Check amount (within tolerance)
    const amount = Math.abs(transaction.amount.amount)
    const amountDiff = Math.abs(amount - pattern.amount)
    const tolerancePercent = this.config.amountTolerancePercent / 100
    if (amountDiff > pattern.amount * tolerancePercent) return false

    // Check date proximity to expected next payment
    const txDate = new Date(transaction.date)
    const expectedDate = new Date(pattern.nextDate)
    const daysDiff = Math.abs((txDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24))
    
    return daysDiff <= this.config.intervalToleranceDays
  }
}

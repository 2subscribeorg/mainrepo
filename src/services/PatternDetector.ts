import type { BankTransaction, Recurrence } from '@/domain/models'

export interface RecurringPattern {
  merchant: string
  normalizedMerchant: string  // Cleaned merchant name
  amount: number
  amountVariance: number  // Standard deviation of amounts
  frequency: Recurrence
  confidence: number  // 0-1 score
  lastDate: string
  nextDate: string
  transactions: BankTransaction[]
  detectionReason: 'amount_matching'
  flags: any[]
}


export interface DetectionConfig {
  minTransactions: number  // Minimum transactions to detect pattern (default: 2)
  minConfidence: number    // Minimum confidence to return pattern (default: 0.6)
  intervalToleranceDays: number  // How many days variance allowed (default: 5)
  amountTolerancePercent: number  // How much amount can vary (default: 10%)
  lookbackDays: number  // How far back to analyze (default: 365)
}

const DEFAULT_CONFIG: DetectionConfig = {
  minTransactions: 2,
  minConfidence: 0.3,  // Lowered for testing - was 0.6
  intervalToleranceDays: 7,  // More tolerance - was 5
  amountTolerancePercent: 20,  // More tolerance - was 10
  lookbackDays: 365
}

/**
 * Simple pattern detector for subscription detection
 * Finds transactions with matching amounts (2+ occurrences) from same merchant
 * Uses only MerchantNormalizer for merchant name cleanup
 */
export class PatternDetector {
  private config: DetectionConfig

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Simple merchant name normalization
   */
  private normalizeMerchant(merchantName: string): string {
    return merchantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')  // Remove special chars
      .replace(/\s+/g, '')         // Remove spaces
      .replace(/^(www|http|https)/, '')  // Remove web prefixes
      .substring(0, 20)  // Take first 20 chars
  }

  /**
   * Main entry point: Analyze all transactions and return detected patterns
   */
  detectPatterns(transactions: BankTransaction[]): RecurringPattern[] {
    console.log(`🔍 PatternDetector: Analyzing ${transactions.length} transactions with simple amount matching`)
    
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.lookbackDays)
      
      // Filter transactions within lookback period
      const recentTransactions = transactions.filter(t => 
        new Date(t.date) >= cutoffDate
      )
      
      console.log(`📅 PatternDetector: ${recentTransactions.length} transactions within ${this.config.lookbackDays} days`)
      
      // New simple detection: Group by exact amount
      const patterns = this.detectAmountBasedPatterns(recentTransactions)
      
      console.log(`🎯 PatternDetector: Found ${patterns.length} amount-based patterns`)
      return patterns.sort((a, b) => b.confidence - a.confidence)
    } catch (error) {
      console.error('❌ Error in PatternDetector.detectPatterns:', error)
      return []
    }
  }

  /**
   * New simple detection: Find transactions with matching amounts (2+ occurrences)
   */
  private detectAmountBasedPatterns(transactions: BankTransaction[]): RecurringPattern[] {
    console.log('💰 Detecting amount-based patterns...')
    console.log('💰 Sample transaction data:', transactions.slice(0, 3))
    
    // Group transactions by exact amount
    const amountGroups = new Map<number, BankTransaction[]>()
    
    for (const tx of transactions) {
      console.log(`💰 Processing transaction: ${tx.merchantName} - ${tx.amount?.amount || 'NO AMOUNT'}`)
      
      if (!tx.amount || typeof tx.amount.amount !== 'number') {
        console.log(`⚠️ Skipping transaction with invalid amount:`, tx)
        continue
      }
      
      const amount = Math.abs(tx.amount.amount) // Use absolute value
      if (!amountGroups.has(amount)) {
        amountGroups.set(amount, [])
      }
      amountGroups.get(amount)!.push(tx)
    }
    
    console.log(`💰 Grouped into ${amountGroups.size} amount groups`)
    
    const patterns: RecurringPattern[] = []
    
    for (const [amount, txs] of amountGroups) {
      console.log(`💰 Checking amount ${amount}: ${txs.length} transactions`)
      
      if (txs.length >= 2) { // At least 2 transactions with same amount
        console.log(`💰 Found ${txs.length} transactions with amount ${amount}`)
        
        // Group by merchant name within same amount
        const merchantGroups = new Map<string, BankTransaction[]>()
        for (const tx of txs) {
          const merchant = this.normalizeMerchant(tx.merchantName)
          console.log(`💰 Normalized merchant: "${tx.merchantName}" -> "${merchant}"`)
          
          if (!merchantGroups.has(merchant)) {
            merchantGroups.set(merchant, [])
          }
          merchantGroups.get(merchant)!.push(tx)
        }
        
        console.log(`💰 Amount ${amount} has ${merchantGroups.size} unique merchants`)
        
        // Create patterns for merchants with 2+ transactions of same amount
        for (const [merchant, merchantTxs] of merchantGroups) {
          console.log(`💰 Merchant "${merchant}": ${merchantTxs.length} transactions`)
          
          if (merchantTxs.length >= 2) {
            console.log(`💰 Creating pattern for ${merchant} with ${merchantTxs.length} transactions`)
            const pattern = this.createAmountBasedPattern(merchant, merchantTxs, amount)
            if (pattern) {
              patterns.push(pattern)
              console.log(`✅ Created subscription pattern: ${merchant} - ${amount}`)
            } else {
              console.log(`❌ Failed to create pattern for ${merchant}`)
            }
          }
        }
      }
    }
    
    console.log(`💰 Total patterns created: ${patterns.length}`)
    return patterns
  }

  /**
   * Create a subscription pattern from transactions with matching amounts
   * No complex date analysis - just matching amounts = subscription
   */
  private createAmountBasedPattern(
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
   * Analyze a group of transactions from the same merchant (legacy method)
   */
  private analyzeTransactionGroup(
    normalizedMerchant: string,
    transactions: BankTransaction[]
  ): RecurringPattern | null {
    const sorted = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Calculate intervals between transactions using helper
    const intervals = this.intervalCalculator.calculateIntervals(sorted)
    if (intervals.length === 0) return null

    // Detect frequency from intervals using helper
    const frequencyResult = this.intervalCalculator.detectFrequency(intervals)
    if (!frequencyResult) return null

    // Calculate amount statistics
    const amounts = sorted.map(tx => Math.abs(tx.amount.amount))
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const amountVariance = this.confidenceScorer.calculateStandardDeviation(amounts)

    // Calculate confidence score using helper
    const confidence = this.confidenceScorer.calculateConfidence(
      intervals,
      amounts,
      frequencyResult.frequency,
      sorted.length
    )

    // Detect flags/issues using helper
    const flags = this.flagDetector.detectFlags(sorted, intervals, amounts, frequencyResult.frequency)

    // Predict next payment date
    const lastDate = sorted[sorted.length - 1].date
    const nextDate = this.predictNextPayment(lastDate, frequencyResult.frequency)

    return {
      merchant: sorted[0].merchantName,  // Original merchant name
      normalizedMerchant,
      amount: avgAmount,
      amountVariance,
      frequency: frequencyResult.frequency,
      confidence,
      lastDate,
      nextDate,
      transactions: sorted,
      detectionReason: frequencyResult.reason,
      flags
    }
  }

  /**
   * Predict next payment date based on frequency
   */
  private predictNextPayment(lastDate: string, frequency: Recurrence): string {
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

  /**
   * Group transactions by normalized merchant name
   */
  private groupByMerchant(transactions: BankTransaction[]): Map<string, BankTransaction[]> {
    const groups = new Map<string, BankTransaction[]>()

    for (const tx of transactions) {
      const normalized = this.merchantNormalizer.normalize(tx.merchantName)
      if (!groups.has(normalized)) {
        groups.set(normalized, [])
      }
      groups.get(normalized)!.push(tx)
    }

    return groups
  }

  /**
   * Check if a new transaction matches an existing pattern
   * Useful for real-time updates
   */
  matchesPattern(transaction: BankTransaction, pattern: RecurringPattern): boolean {
    // Check merchant using helper
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

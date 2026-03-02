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
   * Enhanced merchant name normalization
   * Removes location markers, trial indicators, payment processors, etc.
   */
  private normalizeMerchant(merchantName: string): string {
    return merchantName
      .toLowerCase()
      .trim()
      // Remove common payment processor suffixes
      .replace(/\s*(payment|payments|pay|subscription|subs?)\s*/gi, '')
      // Remove location indicators
      .replace(/\s*(london|uk|us|usa|gb|ltd|limited|inc|llc|corp|plc)\s*/gi, '')
      // Remove trial/promo indicators
      .replace(/\s*(\*trial|\*promo|trial|promo|free)\s*/gi, '')
      // Remove common separators and special chars
      .replace(/[^a-z0-9]/g, '')
      // Remove web prefixes
      .replace(/^(www|http|https)/, '')
      // Take first 15 chars for better grouping
      .substring(0, 15)
  }

  /**
   * Calculate similarity between two merchant names (0-1 score)
   * Uses simple substring matching and character overlap
   */
  private calculateMerchantSimilarity(merchant1: string, merchant2: string): number {
    if (merchant1 === merchant2) return 1.0
    
    const longer = merchant1.length > merchant2.length ? merchant1 : merchant2
    const shorter = merchant1.length > merchant2.length ? merchant2 : merchant1
    
    // If shorter is completely contained in longer, high similarity
    if (longer.includes(shorter)) {
      return 0.85 + (shorter.length / longer.length) * 0.15
    }
    
    // Calculate character overlap ratio
    const shorterChars = new Set(shorter.split(''))
    const overlapCount = [...shorterChars].filter(char => longer.includes(char)).length
    const overlapRatio = overlapCount / shorterChars.size
    
    // Boost score if they start with the same characters
    const commonPrefixLength = this.getCommonPrefixLength(merchant1, merchant2)
    const prefixBoost = Math.min(commonPrefixLength / 5, 0.3)
    
    return Math.min(overlapRatio + prefixBoost, 1.0)
  }

  /**
   * Get length of common prefix between two strings
   */
  private getCommonPrefixLength(str1: string, str2: string): number {
    let i = 0
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++
    }
    return i
  }

  /**
   * Cluster transactions by similar amounts with tolerance
   */
  private clusterByAmount(
    transactions: BankTransaction[], 
    tolerancePercent: number = 0.15
  ): BankTransaction[][] {
    const clusters: BankTransaction[][] = []
    
    for (const tx of transactions) {
      const amount = Math.abs(tx.amount.amount)
      let matched = false
      
      // Try to add to existing cluster
      for (const cluster of clusters) {
        const clusterAmounts = cluster.map(t => Math.abs(t.amount.amount))
        const clusterAvg = clusterAmounts.reduce((sum, a) => sum + a, 0) / clusterAmounts.length
        const diff = Math.abs(amount - clusterAvg) / clusterAvg
        
        if (diff <= tolerancePercent) {
          cluster.push(tx)
          matched = true
          break
        }
      }
      
      // Create new cluster if no match
      if (!matched) {
        clusters.push([tx])
      }
    }
    
    return clusters
  }

  /**
   * Calculate confidence score based on amount variance and transaction count
   */
  private calculateConfidenceScore(
    transactions: BankTransaction[],
    amountVariance: number,
    merchantSimilarity: number = 1.0
  ): number {
    // Base confidence from transaction count (more transactions = higher confidence)
    const countScore = Math.min(transactions.length / 5, 1.0) * 0.4
    
    // Amount consistency score (lower variance = higher confidence)
    const avgAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount.amount), 0) / transactions.length
    const varianceRatio = avgAmount > 0 ? amountVariance / avgAmount : 0
    const consistencyScore = Math.max(0, 1 - varianceRatio) * 0.4
    
    // Merchant similarity score
    const merchantScore = merchantSimilarity * 0.2
    
    return Math.min(countScore + consistencyScore + merchantScore, 1.0)
  }

  /**
   * Main entry point: Analyze all transactions and return detected patterns
   * Uses hybrid approach: merchant-based grouping with amount clustering
   */
  detectPatterns(transactions: BankTransaction[]): RecurringPattern[] {
    console.log(`🔍 PatternDetector: Analyzing ${transactions.length} transactions with hybrid detection`)
    
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.lookbackDays)
      
      // Filter transactions within lookback period AND exclude already confirmed subscriptions
      const recentTransactions = transactions.filter(t => 
        new Date(t.date) >= cutoffDate && !t.subscriptionId && !t.isSubscription
      )
      
      console.log(`📅 PatternDetector: ${recentTransactions.length} unlinked transactions within ${this.config.lookbackDays} days (filtered out ${transactions.length - recentTransactions.length} already confirmed subscriptions)`)
      
      // Use hybrid detection: merchant-based with amount clustering
      const patterns = this.detectHybridPatterns(recentTransactions)
      
      console.log(`🎯 PatternDetector: Found ${patterns.length} hybrid patterns`)
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
    console.log('🔄 Detecting hybrid patterns (merchant + amount clustering)...')
    
    // Step 1: Group by similar merchants using fuzzy matching
    const merchantGroups = new Map<string, BankTransaction[]>()
    
    for (const tx of transactions) {
      if (!tx.amount || typeof tx.amount.amount !== 'number') {
        console.log(`⚠️ Skipping transaction with invalid amount:`, tx)
        continue
      }
      
      const normalized = this.normalizeMerchant(tx.merchantName)
      
      // Check if similar merchant already exists (fuzzy matching)
      let matchedMerchant = normalized
      let bestSimilarity = 0
      
      for (const existingMerchant of merchantGroups.keys()) {
        const similarity = this.calculateMerchantSimilarity(normalized, existingMerchant)
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
    
    console.log(`🏪 Grouped into ${merchantGroups.size} merchant groups`)
    
    // Step 2: For each merchant group, cluster by similar amounts
    const patterns: RecurringPattern[] = []
    
    for (const [merchant, txs] of merchantGroups) {
      if (txs.length < this.config.minTransactions) {
        console.log(`⏭️ Skipping ${merchant}: only ${txs.length} transactions`)
        continue
      }
      
      console.log(`🔍 Analyzing ${merchant}: ${txs.length} transactions`)
      
      // Cluster transactions by similar amounts (±15% tolerance)
      const amountClusters = this.clusterByAmount(txs, this.config.amountTolerancePercent / 100)
      
      console.log(`💰 Found ${amountClusters.length} amount clusters for ${merchant}`)
      
      // Create pattern for each cluster with enough transactions
      for (const cluster of amountClusters) {
        if (cluster.length >= this.config.minTransactions) {
          const pattern = this.createHybridPattern(merchant, cluster)
          if (pattern && pattern.confidence >= this.config.minConfidence) {
            patterns.push(pattern)
            console.log(`✅ Created pattern: ${pattern.merchant} - ${pattern.amount} (${cluster.length} txs, ${Math.round(pattern.confidence * 100)}% confidence)`)
          }
        }
      }
    }
    
    console.log(`🎯 Total hybrid patterns created: ${patterns.length}`)
    return patterns
  }

  /**
   * Create a pattern from a cluster of transactions with similar merchant and amount
   */
  private createHybridPattern(
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
    const variance = this.calculateStandardDeviation(amounts)
    
    // Calculate confidence based on amount variance and transaction count
    const confidence = this.calculateConfidenceScore(sorted, variance)
    
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
   * Calculate standard deviation of amounts
   */
  private calculateStandardDeviation(amounts: number[]): number {
    if (amounts.length === 0) return 0
    
    const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
    const squaredDiffs = amounts.map(a => Math.pow(a - avg, 2))
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / amounts.length
    
    return Math.sqrt(variance)
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

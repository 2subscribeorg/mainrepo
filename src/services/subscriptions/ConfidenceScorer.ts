import type { BankTransaction } from '@/domain/models'

/**
 * Calculates confidence scores for detected patterns
 * Based on transaction count, amount consistency, and merchant similarity
 */
export class ConfidenceScorer {
  /**
   * Calculate confidence score based on amount variance and transaction count
   * Returns a score between 0 and 1
   */
  calculateScore(
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
   * Calculate standard deviation of amounts
   */
  calculateStandardDeviation(amounts: number[]): number {
    if (amounts.length === 0) return 0
    
    const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
    const squaredDiffs = amounts.map(a => Math.pow(a - avg, 2))
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / amounts.length
    
    return Math.sqrt(variance)
  }
}

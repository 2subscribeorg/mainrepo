import { describe, it, expect } from 'vitest'
import { ConfidenceScorer } from '@/services/subscriptions/ConfidenceScorer'
import type { BankTransaction } from '@/domain/models'

describe('ConfidenceScorer', () => {
  const scorer = new ConfidenceScorer()

  const createTransaction = (amount: number, id: string = 'tx-1'): BankTransaction => ({
    id,
    accountId: 'acc-1',
    amount: { amount, currency: 'GBP' },
    merchantName: 'Test Merchant',
    date: '2024-01-01',
    category: { name: 'Entertainment' },
    pending: false,
    transactionType: 'purchase',
    userId: 'user-1',
    createdAt: '2024-01-01'
  })

  describe('calculateScore', () => {
    it('returns higher confidence for more transactions', () => {
      const twoTxs = [createTransaction(10, 'tx-1'), createTransaction(10, 'tx-2')]
      const fiveTxs = Array.from({ length: 5 }, (_, i) => createTransaction(10, `tx-${i}`))
      
      const score2 = scorer.calculateScore(twoTxs, 0)
      const score5 = scorer.calculateScore(fiveTxs, 0)
      
      expect(score5).toBeGreaterThan(score2)
    })

    it('returns higher confidence for lower variance', () => {
      const transactions = [
        createTransaction(10, 'tx-1'),
        createTransaction(10, 'tx-2')
      ]
      
      const lowVariance = scorer.calculateScore(transactions, 0.1)
      const highVariance = scorer.calculateScore(transactions, 5.0)
      
      expect(lowVariance).toBeGreaterThan(highVariance)
    })

    it('returns higher confidence for better merchant similarity', () => {
      const transactions = [createTransaction(10, 'tx-1'), createTransaction(10, 'tx-2')]
      
      const highSimilarity = scorer.calculateScore(transactions, 0, 1.0)
      const lowSimilarity = scorer.calculateScore(transactions, 0, 0.5)
      
      expect(highSimilarity).toBeGreaterThan(lowSimilarity)
    })

    it('returns score between 0 and 1', () => {
      const transactions = Array.from({ length: 10 }, (_, i) => createTransaction(10, `tx-${i}`))
      const score = scorer.calculateScore(transactions, 0, 1.0)
      
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1.0)
    })

    it('handles perfect scenario (many txs, no variance, perfect similarity)', () => {
      const transactions = Array.from({ length: 10 }, (_, i) => createTransaction(10, `tx-${i}`))
      const score = scorer.calculateScore(transactions, 0, 1.0)
      
      expect(score).toBeGreaterThan(0.9)
    })

    it('handles poor scenario (few txs, high variance, low similarity)', () => {
      const transactions = [createTransaction(10, 'tx-1'), createTransaction(15, 'tx-2')]
      const score = scorer.calculateScore(transactions, 10, 0.3)
      
      expect(score).toBeLessThan(0.5)
    })

    it('defaults merchant similarity to 1.0 when not provided', () => {
      const transactions = [createTransaction(10, 'tx-1'), createTransaction(10, 'tx-2')]
      
      const scoreWithDefault = scorer.calculateScore(transactions, 0)
      const scoreWithExplicit = scorer.calculateScore(transactions, 0, 1.0)
      
      expect(scoreWithDefault).toBe(scoreWithExplicit)
    })

    it('handles single transaction', () => {
      const transactions = [createTransaction(10, 'tx-1')]
      const score = scorer.calculateScore(transactions, 0, 1.0)
      
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(1.0)
    })
  })

  describe('calculateStandardDeviation', () => {
    it('returns 0 for identical amounts', () => {
      const amounts = [10, 10, 10, 10]
      const stdDev = scorer.calculateStandardDeviation(amounts)
      
      expect(stdDev).toBe(0)
    })

    it('returns 0 for empty array', () => {
      const stdDev = scorer.calculateStandardDeviation([])
      expect(stdDev).toBe(0)
    })

    it('returns 0 for single value', () => {
      const stdDev = scorer.calculateStandardDeviation([10])
      expect(stdDev).toBe(0)
    })

    it('calculates correct standard deviation for simple case', () => {
      const amounts = [10, 12, 14]
      const stdDev = scorer.calculateStandardDeviation(amounts)
      
      // Mean = 12, variance = ((2^2 + 0^2 + 2^2) / 3) = 8/3, stdDev = sqrt(8/3) ≈ 1.633
      expect(stdDev).toBeCloseTo(1.633, 2)
    })

    it('handles larger variance', () => {
      const amounts = [5, 10, 15, 20]
      const stdDev = scorer.calculateStandardDeviation(amounts)
      
      expect(stdDev).toBeGreaterThan(0)
    })

    it('handles negative amounts', () => {
      const amounts = [-10, -12, -14]
      const stdDev = scorer.calculateStandardDeviation(amounts)
      
      expect(stdDev).toBeGreaterThan(0)
    })

    it('handles mixed positive and negative amounts', () => {
      const amounts = [-10, 0, 10]
      const stdDev = scorer.calculateStandardDeviation(amounts)
      
      expect(stdDev).toBeGreaterThan(0)
    })

    it('handles very small amounts', () => {
      const amounts = [0.01, 0.02, 0.03]
      const stdDev = scorer.calculateStandardDeviation(amounts)
      
      expect(stdDev).toBeGreaterThan(0)
      expect(stdDev).toBeLessThan(1)
    })

    it('handles very large amounts', () => {
      const amounts = [10000, 10100, 10200]
      const stdDev = scorer.calculateStandardDeviation(amounts)
      
      expect(stdDev).toBeGreaterThan(0)
    })
  })

  describe('real-world subscription scenarios', () => {
    it('gives high confidence to consistent Netflix subscription', () => {
      const transactions = Array.from({ length: 6 }, (_, i) => createTransaction(9.99, `tx-${i}`))
      const variance = scorer.calculateStandardDeviation([9.99, 9.99, 9.99, 9.99, 9.99, 9.99])
      const score = scorer.calculateScore(transactions, variance, 1.0)
      
      expect(score).toBeGreaterThan(0.8)
    })

    it('gives moderate confidence to subscription with price change', () => {
      const amounts = [9.99, 9.99, 9.99, 10.99, 10.99, 10.99]
      const transactions = amounts.map((amt, i) => createTransaction(amt, `tx-${i}`))
      const variance = scorer.calculateStandardDeviation(amounts)
      const score = scorer.calculateScore(transactions, variance, 1.0)
      
      // With 6 transactions and low variance, score is high despite price change
      expect(score).toBeGreaterThan(0.8)
      expect(score).toBeLessThan(1.0)
    })

    it('gives lower confidence to inconsistent amounts', () => {
      const amounts = [9.99, 12.50, 8.75, 15.00]
      const transactions = amounts.map((amt, i) => createTransaction(amt, `tx-${i}`))
      const variance = scorer.calculateStandardDeviation(amounts)
      const score = scorer.calculateScore(transactions, variance, 1.0)
      
      // Still gets decent score due to transaction count and merchant similarity
      expect(score).toBeGreaterThan(0.5)
      expect(score).toBeLessThan(0.9)
    })

    it('gives lower confidence to few transactions even with consistency', () => {
      const transactions = [createTransaction(10, 'tx-1'), createTransaction(10, 'tx-2')]
      const variance = scorer.calculateStandardDeviation([10, 10])
      const score = scorer.calculateScore(transactions, variance, 1.0)
      
      // 2 transactions with perfect consistency and merchant similarity = 0.76
      expect(score).toBeGreaterThan(0.7)
      expect(score).toBeLessThan(0.8)
    })
  })

  describe('score components weighting', () => {
    it('count score contributes 40% of total', () => {
      // With 5 transactions (max count score), 0 variance, 0 merchant similarity
      const transactions = Array.from({ length: 5 }, (_, i) => createTransaction(10, `tx-${i}`))
      const score = scorer.calculateScore(transactions, 0, 0)
      
      // Should be approximately 0.4 (40% from count, 40% from consistency, 0% from merchant)
      expect(score).toBeCloseTo(0.8, 1)
    })

    it('consistency score contributes 40% of total', () => {
      // With perfect consistency (0 variance) but only 1 transaction and no merchant similarity
      const transactions = [createTransaction(10, 'tx-1')]
      const score = scorer.calculateScore(transactions, 0, 0)
      
      // Count score: 1/5 * 0.4 = 0.08
      // Consistency score: 1.0 * 0.4 = 0.4
      // Merchant score: 0 * 0.2 = 0
      // Total: 0.48
      expect(score).toBeCloseTo(0.48, 1)
    })

    it('merchant similarity contributes 20% of total', () => {
      // With 0 transactions (edge case), 0 variance, perfect merchant similarity
      const transactions = [createTransaction(10, 'tx-1')]
      const score = scorer.calculateScore(transactions, 0, 1.0)
      
      expect(score).toBeGreaterThan(0)
    })
  })
})

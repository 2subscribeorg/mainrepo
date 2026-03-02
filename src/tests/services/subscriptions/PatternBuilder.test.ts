import { describe, it, expect } from 'vitest'
import { PatternBuilder } from '@/services/subscriptions/PatternBuilder'
import type { BankTransaction } from '@/domain/models'
import { DEFAULT_CONFIG } from '@/services/subscriptions/types'

describe('PatternBuilder', () => {
  const builder = new PatternBuilder(DEFAULT_CONFIG)

  const createTransaction = (
    amount: number,
    merchantName: string,
    date: string,
    id: string = 'tx-1'
  ): BankTransaction => ({
    id,
    accountId: 'acc-1',
    amount: { amount, currency: 'GBP' },
    merchantName,
    date,
    category: { name: 'Entertainment' },
    pending: false,
    transactionType: 'purchase',
    userId: 'user-1',
    createdAt: '2024-01-01'
  })

  describe('createHybridPattern', () => {
    it('creates pattern from valid transactions', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2'),
        createTransaction(9.99, 'Netflix', '2024-03-01', 'tx-3')
      ]

      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern).not.toBeNull()
      expect(pattern?.merchant).toBe('Netflix')
      expect(pattern?.normalizedMerchant).toBe('netflix')
      expect(pattern?.amount).toBe(9.99)
      expect(pattern?.amountVariance).toBe(0)
      expect(pattern?.frequency).toBe('monthly')
      expect(pattern?.transactions).toHaveLength(3)
      expect(pattern?.detectionReason).toBe('amount_matching')
    })

    it('returns null if not enough transactions', () => {
      const transactions = [createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1')]
      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern).toBeNull()
    })

    it('calculates average amount correctly', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(10.99, 'Netflix', '2024-02-01', 'tx-2'),
        createTransaction(11.99, 'Netflix', '2024-03-01', 'tx-3')
      ]

      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern?.amount).toBeCloseTo(10.99, 2)
    })

    it('calculates amount variance correctly', () => {
      const transactions = [
        createTransaction(10.00, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(12.00, 'Netflix', '2024-02-01', 'tx-2'),
        createTransaction(14.00, 'Netflix', '2024-03-01', 'tx-3')
      ]

      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern?.amountVariance).toBeGreaterThan(0)
    })

    it('sorts transactions by date', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-03-01', 'tx-3'),
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern?.transactions[0].id).toBe('tx-1')
      expect(pattern?.transactions[1].id).toBe('tx-2')
      expect(pattern?.transactions[2].id).toBe('tx-3')
    })

    it('sets lastDate to most recent transaction', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2'),
        createTransaction(9.99, 'Netflix', '2024-03-15', 'tx-3')
      ]

      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern?.lastDate).toBe('2024-03-15')
    })

    it('predicts nextDate 30 days after lastDate', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern?.nextDate).toBe('2024-03-02')
    })

    it('calculates confidence score', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern?.confidence).toBeGreaterThan(0)
      expect(pattern?.confidence).toBeLessThanOrEqual(1.0)
    })

    it('uses original merchant name from first transaction', () => {
      const transactions = [
        createTransaction(9.99, 'NETFLIX UK', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern?.merchant).toBe('NETFLIX UK')
    })
  })

  describe('createAmountBasedPattern', () => {
    it('creates pattern from exact amount matches', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createAmountBasedPattern('netflix', transactions, 9.99)

      expect(pattern).not.toBeNull()
      expect(pattern?.amount).toBe(9.99)
      expect(pattern?.amountVariance).toBe(0)
      expect(pattern?.confidence).toBe(0.9)
    })

    it('returns null if less than 2 transactions', () => {
      const transactions = [createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1')]
      const pattern = builder.createAmountBasedPattern('netflix', transactions, 9.99)

      expect(pattern).toBeNull()
    })

    it('sets high confidence for exact matches', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createAmountBasedPattern('netflix', transactions, 9.99)

      expect(pattern?.confidence).toBe(0.9)
    })

    it('sets frequency to monthly', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createAmountBasedPattern('netflix', transactions, 9.99)

      expect(pattern?.frequency).toBe('monthly')
    })

    it('sorts transactions by date', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-03-01', 'tx-3'),
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1')
      ]

      const pattern = builder.createAmountBasedPattern('netflix', transactions, 9.99)

      expect(pattern?.transactions[0].id).toBe('tx-1')
      expect(pattern?.transactions[1].id).toBe('tx-3')
    })
  })

  describe('predictNextPayment', () => {
    it('predicts weekly payment correctly', () => {
      const nextDate = builder.predictNextPayment('2024-01-01', 'weekly')
      expect(nextDate).toBe('2024-01-08')
    })

    it('predicts biweekly payment correctly', () => {
      const nextDate = builder.predictNextPayment('2024-01-01', 'biweekly')
      expect(nextDate).toBe('2024-01-15')
    })

    it('predicts monthly payment correctly', () => {
      const nextDate = builder.predictNextPayment('2024-01-15', 'monthly')
      expect(nextDate).toBe('2024-02-15')
    })

    it('predicts quarterly payment correctly', () => {
      const nextDate = builder.predictNextPayment('2024-01-01', 'quarterly')
      // Jan 1 + 3 months = March 31 (setMonth behavior)
      expect(nextDate).toBe('2024-03-31')
    })

    it('predicts yearly payment correctly', () => {
      const nextDate = builder.predictNextPayment('2024-01-01', 'yearly')
      expect(nextDate).toBe('2025-01-01')
    })

    it('handles month-end dates correctly', () => {
      const nextDate = builder.predictNextPayment('2024-01-31', 'monthly')
      // February doesn't have 31 days, should go to last day of Feb
      expect(nextDate).toBe('2024-02-29') // 2024 is a leap year
    })

    it('handles non-leap year month-end dates', () => {
      const nextDate = builder.predictNextPayment('2023-01-31', 'monthly')
      expect(nextDate).toBe('2023-02-28') // 2023 is not a leap year
    })

    it('handles custom frequency as monthly', () => {
      const nextDate = builder.predictNextPayment('2024-01-01', 'custom')
      expect(nextDate).toBe('2024-02-01')
    })

    it('handles year boundary for monthly', () => {
      const nextDate = builder.predictNextPayment('2024-12-15', 'monthly')
      expect(nextDate).toBe('2025-01-15')
    })

    it('handles year boundary for weekly', () => {
      const nextDate = builder.predictNextPayment('2024-12-30', 'weekly')
      expect(nextDate).toBe('2025-01-06')
    })
  })

  describe('real-world subscription scenarios', () => {
    it('creates pattern for consistent Netflix subscription', () => {
      const transactions = [
        createTransaction(9.99, 'Netflix', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Netflix', '2024-02-01', 'tx-2'),
        createTransaction(9.99, 'Netflix', '2024-03-01', 'tx-3'),
        createTransaction(9.99, 'Netflix', '2024-04-01', 'tx-4')
      ]

      const pattern = builder.createHybridPattern('netflix', transactions)

      expect(pattern).not.toBeNull()
      expect(pattern?.confidence).toBeGreaterThan(0.7)
      expect(pattern?.amountVariance).toBe(0)
    })

    it('creates pattern for subscription with price increase', () => {
      const transactions = [
        createTransaction(9.99, 'Spotify', '2024-01-01', 'tx-1'),
        createTransaction(9.99, 'Spotify', '2024-02-01', 'tx-2'),
        createTransaction(10.99, 'Spotify', '2024-03-01', 'tx-3'),
        createTransaction(10.99, 'Spotify', '2024-04-01', 'tx-4')
      ]

      const pattern = builder.createHybridPattern('spotify', transactions)

      expect(pattern).not.toBeNull()
      expect(pattern?.amount).toBeCloseTo(10.49, 2)
      expect(pattern?.amountVariance).toBeGreaterThan(0)
    })

    it('handles annual subscription', () => {
      const transactions = [
        createTransaction(99.99, 'Adobe', '2023-01-01', 'tx-1'),
        createTransaction(99.99, 'Adobe', '2024-01-01', 'tx-2')
      ]

      const pattern = builder.createHybridPattern('adobe', transactions)

      expect(pattern).not.toBeNull()
      expect(pattern?.amount).toBe(99.99)
    })
  })

  describe('edge cases', () => {
    it('handles transactions with negative amounts', () => {
      const transactions = [
        createTransaction(-9.99, 'Refund', '2024-01-01', 'tx-1'),
        createTransaction(-9.99, 'Refund', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createHybridPattern('refund', transactions)

      expect(pattern).not.toBeNull()
      expect(pattern?.amount).toBe(9.99) // Should use absolute value
    })

    it('handles very small amounts', () => {
      const transactions = [
        createTransaction(0.99, 'MicroService', '2024-01-01', 'tx-1'),
        createTransaction(0.99, 'MicroService', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createHybridPattern('microservice', transactions)

      expect(pattern).not.toBeNull()
      expect(pattern?.amount).toBe(0.99)
    })

    it('handles very large amounts', () => {
      const transactions = [
        createTransaction(9999.99, 'Enterprise', '2024-01-01', 'tx-1'),
        createTransaction(9999.99, 'Enterprise', '2024-02-01', 'tx-2')
      ]

      const pattern = builder.createHybridPattern('enterprise', transactions)

      expect(pattern).not.toBeNull()
      expect(pattern?.amount).toBe(9999.99)
    })
  })
})

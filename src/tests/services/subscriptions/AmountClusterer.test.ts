import { describe, it, expect } from 'vitest'
import { AmountClusterer } from '@/services/subscriptions/AmountClusterer'
import type { BankTransaction } from '@/domain/models'

describe('AmountClusterer', () => {
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

  describe('clusterByAmount with default tolerance (15%)', () => {
    const clusterer = new AmountClusterer(15)

    it('groups transactions with identical amounts', () => {
      const transactions = [
        createTransaction(9.99, 'tx-1'),
        createTransaction(9.99, 'tx-2'),
        createTransaction(9.99, 'tx-3')
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(1)
      expect(clusters[0]).toHaveLength(3)
    })

    it('groups transactions within tolerance', () => {
      const transactions = [
        createTransaction(10.00, 'tx-1'),
        createTransaction(10.50, 'tx-2'), // 5% difference
        createTransaction(11.00, 'tx-3')  // 10% difference
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(1)
      expect(clusters[0]).toHaveLength(3)
    })

    it('separates transactions outside tolerance', () => {
      const transactions = [
        createTransaction(10.00, 'tx-1'),
        createTransaction(12.00, 'tx-2'), // 20% difference - outside 15% tolerance
        createTransaction(10.50, 'tx-3')  // 5% difference from tx-1
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(2)
    })

    it('handles multiple distinct clusters', () => {
      const transactions = [
        createTransaction(9.99, 'tx-1'),
        createTransaction(10.00, 'tx-2'),
        createTransaction(19.99, 'tx-3'),
        createTransaction(20.00, 'tx-4'),
        createTransaction(29.99, 'tx-5')
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(3)
    })

    it('handles single transaction', () => {
      const transactions = [createTransaction(9.99, 'tx-1')]
      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(1)
      expect(clusters[0]).toHaveLength(1)
    })

    it('handles empty array', () => {
      const clusters = clusterer.clusterByAmount([])
      expect(clusters).toHaveLength(0)
    })
  })

  describe('clusterByAmount with custom tolerance', () => {
    it('uses tighter tolerance (5%)', () => {
      const clusterer = new AmountClusterer(5)
      const transactions = [
        createTransaction(10.00, 'tx-1'),
        createTransaction(10.40, 'tx-2'), // 4% difference - within tolerance
        createTransaction(10.60, 'tx-3')  // Compared to cluster avg (10.20), 3.9% - within tolerance
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      // All three cluster together because each addition is within tolerance of cluster average
      expect(clusters).toHaveLength(1)
    })

    it('uses looser tolerance (25%)', () => {
      const clusterer = new AmountClusterer(25)
      const transactions = [
        createTransaction(10.00, 'tx-1'),
        createTransaction(12.00, 'tx-2'), // 20% difference - within tolerance
        createTransaction(12.50, 'tx-3')  // 25% difference - within tolerance
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(1)
      expect(clusters[0]).toHaveLength(3)
    })
  })

  describe('real-world subscription scenarios', () => {
    const clusterer = new AmountClusterer(15)

    it('groups Netflix subscription with price change', () => {
      const transactions = [
        createTransaction(9.99, 'tx-1'),
        createTransaction(9.99, 'tx-2'),
        createTransaction(10.99, 'tx-3'), // Price increase
        createTransaction(10.99, 'tx-4')
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(1)
      expect(clusters[0]).toHaveLength(4)
    })

    it('groups transactions with VAT adjustments', () => {
      const transactions = [
        createTransaction(10.00, 'tx-1'),
        createTransaction(10.20, 'tx-2'), // 2% VAT change
        createTransaction(10.00, 'tx-3')
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(1)
      expect(clusters[0]).toHaveLength(3)
    })

    it('separates different subscription tiers', () => {
      const transactions = [
        createTransaction(9.99, 'tx-1'),   // Basic tier
        createTransaction(9.99, 'tx-2'),
        createTransaction(14.99, 'tx-3'),  // Premium tier
        createTransaction(14.99, 'tx-4')
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(2)
      expect(clusters[0]).toHaveLength(2)
      expect(clusters[1]).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    const clusterer = new AmountClusterer(15)

    it('handles negative amounts (refunds)', () => {
      const transactions = [
        createTransaction(-9.99, 'tx-1'),
        createTransaction(-10.00, 'tx-2')
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(1)
    })

    it('handles very small amounts', () => {
      const transactions = [
        createTransaction(0.01, 'tx-1'),
        createTransaction(0.01, 'tx-2')
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(1)
    })

    it('handles very large amounts', () => {
      const transactions = [
        createTransaction(9999.99, 'tx-1'),
        createTransaction(10000.00, 'tx-2')
      ]

      const clusters = clusterer.clusterByAmount(transactions)
      
      expect(clusters).toHaveLength(1)
    })
  })
})

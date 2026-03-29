import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTransactionManagement } from '@/composables/useTransactionManagement'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useBankTransactionsStore } from '@/stores/bankTransactions'
import { useAuthStore } from '@/stores/auth'
import { SubscriptionDetectionService } from '@/services/SubscriptionDetectionService'
import type { Transaction, Subscription } from '@/domain/models'

// Mock stores to isolate the composable under test
vi.mock('@/stores/transactionsData')
vi.mock('@/stores/subscriptions')
vi.mock('@/stores/bankTransactions')
vi.mock('@/stores/auth')
vi.mock('@/services/SubscriptionDetectionService')

describe('useTransactionManagement', () => {
  let mockDataStore: any
  let mockSubscriptionsStore: any
  let mockBankTransactionsStore: any
  let mockAuthStore: any
  let mockDetectionService: any
  let pinia: any

  // Test data
  const mockTransactions: Transaction[] = [
    {
      id: 'transaction-1',
      userId: 'user-123',
      accountId: 'account-1',
      merchantName: 'Netflix',
      amount: { amount: 15.99, currency: 'USD' },
      date: '2024-01-15',
      pending: false,
      createdAt: '2024-01-15T10:00:00.000Z'
    },
    {
      id: 'transaction-2',
      userId: 'user-123',
      accountId: 'account-1',
      merchantName: 'Spotify',
      amount: { amount: 9.99, currency: 'USD' },
      date: '2024-01-20',
      pending: false,
      subscriptionId: 'existing-subscription-1', // Already linked
      createdAt: '2024-01-20T10:00:00.000Z'
    }
  ]

  const mockSubscriptions: Subscription[] = [
    {
      id: 'existing-subscription-1',
      userId: 'user-123',
      merchantName: 'Spotify',
      amount: { amount: 9.99, currency: 'USD' },
      recurrence: 'monthly',
      nextPaymentDate: '2024-02-20',
      categoryId: 'entertainment-category',
      status: 'active',
      source: 'manual',
      createdAt: '2024-01-20T10:00:00.000Z',
      updatedAt: '2024-01-20T10:00:00.000Z'
    }
  ]

  const mockUser = {
    id: 'user-123',
    uid: 'user-123',
    email: 'test@example.com'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a fresh Pinia instance for each test
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Mock transactions data store
    mockDataStore = {
      transactions: mockTransactions,
      getById: vi.fn(),
      updateTransaction: vi.fn().mockResolvedValue(undefined)
    }
    
    // Mock subscriptions store
    mockSubscriptionsStore = {
      subscriptions: mockSubscriptions,
      save: vi.fn().mockResolvedValue(undefined)
    }
    
    // Mock bank transactions store
    mockBankTransactionsStore = {
      transactions: [],
      addPendingPattern: vi.fn().mockResolvedValue(undefined)
    }
    
    // Mock auth store
    mockAuthStore = {
      user: mockUser
    }
    
    // Mock detection service
    mockDetectionService = {
      detectPatterns: vi.fn().mockReturnValue([])
    }
    
    // Setup store mocks
    const MockDataStore = vi.mocked(useTransactionsDataStore)
    const MockSubscriptionsStore = vi.mocked(useSubscriptionsStore)
    const MockBankTransactionsStore = vi.mocked(useBankTransactionsStore)
    const MockAuthStore = vi.mocked(useAuthStore)
    const MockDetectionServiceClass = vi.mocked(SubscriptionDetectionService)
    
    MockDataStore.mockReturnValue(mockDataStore)
    MockSubscriptionsStore.mockReturnValue(mockSubscriptionsStore)
    MockBankTransactionsStore.mockReturnValue(mockBankTransactionsStore)
    MockAuthStore.mockReturnValue(mockAuthStore)
    MockDetectionServiceClass.mockImplementation(() => mockDetectionService)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('pattern detection', () => {
    it('detects patterns in transaction data', async () => {
      // Arrange
      const { detectPatterns } = useTransactionManagement()
      
      const mockPatterns = [
        {
          merchant: 'Netflix',
          amount: 15.99,
          transactions: [mockTransactions[0]],
          confidence: 0.85,
          recurrence: 'monthly'
        }
      ]
      
      mockDetectionService.detectPatterns.mockReturnValue(mockPatterns)
      
      // Act
      await detectPatterns()
      
      // Assert
      expect(mockDetectionService.detectPatterns).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'transaction-1',
            merchantName: 'Netflix',
            amount: { amount: 15.99, currency: 'USD' },
            userId: 'user-123'
          })
        ])
      )
    })

    it('handles empty transaction arrays', async () => {
      // Arrange
      const { detectPatterns } = useTransactionManagement()
      
      mockDataStore.transactions = []
      mockDetectionService.detectPatterns.mockReturnValue([])
      
      // Act
      await detectPatterns()
      
      // Assert - when no transactions, detectPatterns should return early without calling service
      expect(mockDetectionService.detectPatterns).not.toHaveBeenCalled()
    })

    it('passes all transactions to pattern detection', async () => {
      // Arrange
      const { detectPatterns } = useTransactionManagement()
      
      // Act
      await detectPatterns()
      
      // Assert - should pass all transactions (implementation doesn't filter by subscriptionId)
      const callArgs = mockDetectionService.detectPatterns.mock.calls[0][0]
      expect(callArgs).toHaveLength(2)
      expect(callArgs).toEqual([
        expect.objectContaining({
          id: 'transaction-1',
          merchantName: 'Netflix'
        }),
        expect.objectContaining({
          id: 'transaction-2',
          merchantName: 'Spotify'
        })
      ])
    })

    it('handles pattern detection service failures', async () => {
      // Arrange
      const { detectPatterns, patternDetectionError } = useTransactionManagement()
      
      const detectionError = new Error('Pattern detection service unavailable')
      mockDetectionService.detectPatterns.mockImplementation(() => {
        throw detectionError
      })
      
      // Act & Assert
      await expect(detectPatterns()).rejects.toThrow('Pattern detection service unavailable')
      expect(patternDetectionError.value).toBe('Pattern detection service unavailable')
    })

    it('maintains loading state during detection', async () => {
      // Arrange
      const { detectPatterns, patternDetectionLoading } = useTransactionManagement()
      
      expect(patternDetectionLoading.value).toBe(false)
      
      // Mock detection to return patterns array (not a promise)
      mockDetectionService.detectPatterns.mockReturnValue([])
      
      // Act
      await detectPatterns()
      
      // Assert - loading should be false after completion
      expect(patternDetectionLoading.value).toBe(false)
      expect(mockDetectionService.detectPatterns).toHaveBeenCalled()
    })

    it('handles user authentication failures', async () => {
      // Arrange
      const { detectPatterns, patternDetectionError } = useTransactionManagement()
      
      mockAuthStore.user = null
      
      // Act & Assert
      await expect(detectPatterns()).rejects.toThrow('User not authenticated')
      expect(patternDetectionError.value).toBe('User not authenticated')
    })

    it('transforms transactions to bank transaction format', async () => {
      // Arrange
      const { detectPatterns } = useTransactionManagement()
      
      // Act
      await detectPatterns()
      
      // Assert - should transform all transactions to BankTransaction format
      const callArgs = mockDetectionService.detectPatterns.mock.calls[0][0]
      expect(callArgs).toHaveLength(2)
      expect(callArgs[0]).toEqual({
        id: 'transaction-1',
        accountId: 'account-1',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        date: '2024-01-15',
        pending: false,
        transactionType: 'purchase',
        userId: 'user-123'
      })
      expect(callArgs[1]).toEqual({
        id: 'transaction-2',
        accountId: 'account-1',
        merchantName: 'Spotify',
        amount: { amount: 9.99, currency: 'USD' },
        date: '2024-01-20',
        pending: false,
        transactionType: 'purchase',
        userId: 'user-123'
      })
    })
  })

  describe('transaction updates', () => {
    beforeEach(() => {
      mockDataStore.getById.mockImplementation((id: string) => {
        return mockTransactions.find(t => t.id === id) || null
      })
    })

    it('updates transaction with subscription link', async () => {
      // Arrange
      const { updateTransactionWithSubscription } = useTransactionManagement()
      
      const transactionId = 'transaction-1'
      const subscriptionId = 'new-subscription-1'
      const categoryId = 'entertainment-category'
      
      const mockDate = '2024-01-15T12:00:00.000Z'
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate)
      
      // Act
      const result = await updateTransactionWithSubscription(transactionId, subscriptionId, categoryId)
      
      // Assert
      expect(mockDataStore.getById).toHaveBeenCalledWith(transactionId)
      expect(mockDataStore.updateTransaction).toHaveBeenCalledWith({
        ...mockTransactions[0],
        subscriptionId: 'new-subscription-1',
        categoryId: 'entertainment-category',
        updatedAt: mockDate
      })
      expect(result).toEqual(
        expect.objectContaining({
          subscriptionId: 'new-subscription-1',
          categoryId: 'entertainment-category'
        })
      )
    })

    it('updates related subscription when transaction changes', async () => {
      // Arrange
      const { updateTransactionWithSubscription } = useTransactionManagement()
      
      const transactionWithSubscription = {
        ...mockTransactions[1], // This one has subscriptionId
        subscriptionId: 'existing-subscription-1'
      }
      
      mockDataStore.getById.mockReturnValue(transactionWithSubscription)
      
      const transactionId = 'transaction-2'
      const subscriptionId = 'existing-subscription-1'
      const categoryId = 'new-entertainment-category'
      
      const mockDate = '2024-01-15T12:00:00.000Z'
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate)
      
      // Act
      await updateTransactionWithSubscription(transactionId, subscriptionId, categoryId)
      
      // Assert - should update both transaction and related subscription
      expect(mockDataStore.updateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'existing-subscription-1',
          categoryId: 'new-entertainment-category'
        })
      )
      
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith({
        ...mockSubscriptions[0],
        categoryId: 'new-entertainment-category',
        updatedAt: mockDate
      })
    })

    it('handles missing transaction scenarios', async () => {
      // Arrange
      const { updateTransactionWithSubscription } = useTransactionManagement()
      
      mockDataStore.getById.mockReturnValue(null)
      
      const transactionId = 'non-existent-transaction'
      const subscriptionId = 'subscription-1'
      const categoryId = 'category-1'
      
      // Act & Assert
      await expect(updateTransactionWithSubscription(transactionId, subscriptionId, categoryId))
        .rejects.toThrow('Transaction not found')
    })

    it('handles missing subscription scenarios', async () => {
      // Arrange
      const { updateTransactionWithSubscription } = useTransactionManagement()
      
      const transactionWithMissingSubscription = {
        ...mockTransactions[0],
        subscriptionId: 'non-existent-subscription'
      }
      
      mockDataStore.getById.mockReturnValue(transactionWithMissingSubscription)
      mockSubscriptionsStore.subscriptions = [] // No subscriptions
      
      const transactionId = 'transaction-1'
      const subscriptionId = 'non-existent-subscription'
      const categoryId = 'category-1'
      
      // Act - should not throw error, just skip subscription update
      await updateTransactionWithSubscription(transactionId, subscriptionId, categoryId)
      
      // Assert - transaction should still be updated
      expect(mockDataStore.updateTransaction).toHaveBeenCalled()
      // Subscription save should not be called since subscription doesn't exist
      expect(mockSubscriptionsStore.save).not.toHaveBeenCalled()
    })

    it('maintains data consistency during updates', async () => {
      // Arrange
      const { updateTransactionWithSubscription } = useTransactionManagement()
      
      const transactionId = 'transaction-1'
      const subscriptionId = 'new-subscription-1'
      const categoryId = 'entertainment-category'
      
      // Act
      const result = await updateTransactionWithSubscription(transactionId, subscriptionId, categoryId)
      
      // Assert - returned object should match what was saved
      expect(result).toEqual(
        expect.objectContaining({
          id: 'transaction-1',
          subscriptionId: 'new-subscription-1',
          categoryId: 'entertainment-category'
        })
      )
      
      // Should maintain all original transaction data
      expect(result).toEqual(
        expect.objectContaining({
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          date: '2024-01-15'
        })
      )
    })

    it('handles concurrent transaction updates', async () => {
      // Arrange
      const { updateTransactionWithSubscription } = useTransactionManagement()
      
      const updates = [
        { transactionId: 'transaction-1', subscriptionId: 'sub-1', categoryId: 'cat-1' },
        { transactionId: 'transaction-1', subscriptionId: 'sub-2', categoryId: 'cat-2' }
      ]
      
      // Act - simulate concurrent updates
      const promises = updates.map(update =>
        updateTransactionWithSubscription(update.transactionId, update.subscriptionId, update.categoryId)
      )
      
      await Promise.all(promises)
      
      // Assert - both updates should have been processed
      expect(mockDataStore.updateTransaction).toHaveBeenCalledTimes(2)
    })
  })

  describe('bulk operations', () => {
    const mockBulkUpdates = [
      { id: 'transaction-1', data: { categoryId: 'new-category-1' } },
      { id: 'transaction-2', data: { categoryId: 'new-category-2' } },
      { id: 'non-existent', data: { categoryId: 'category-3' } }
    ]

    beforeEach(() => {
      mockDataStore.getById.mockImplementation((id: string) => {
        return mockTransactions.find(t => t.id === id) || null
      })
    })

    it('processes multiple transaction updates', async () => {
      // Arrange
      const { bulkUpdateTransactions } = useTransactionManagement()
      
      const validUpdates = mockBulkUpdates.slice(0, 2) // Exclude non-existent
      
      // Act
      const results = await bulkUpdateTransactions(validUpdates)
      
      // Assert
      expect(results).toHaveLength(2)
      expect(mockDataStore.updateTransaction).toHaveBeenCalledTimes(2)
      
      expect(mockDataStore.updateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'transaction-1',
          categoryId: 'new-category-1'
        })
      )
      
      expect(mockDataStore.updateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'transaction-2',
          categoryId: 'new-category-2'
        })
      )
    })

    it('handles partial failures in bulk operations', async () => {
      // Arrange
      const { bulkUpdateTransactions } = useTransactionManagement()
      
      // Mock one update to fail
      mockDataStore.updateTransaction
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('Update failed')) // Second fails
        .mockResolvedValueOnce(undefined) // Third succeeds (if reached)
      
      const updates = [
        { id: 'transaction-1', data: { categoryId: 'category-1' } },
        { id: 'transaction-2', data: { categoryId: 'category-2' } }
      ]
      
      // Act
      const results = await bulkUpdateTransactions(updates)
      
      // Assert - should continue processing despite one failure
      expect(results).toHaveLength(1) // Only successful updates returned
      expect(mockDataStore.updateTransaction).toHaveBeenCalledTimes(2)
    })

    it('maintains transaction order during bulk updates', async () => {
      // Arrange
      const { bulkUpdateTransactions } = useTransactionManagement()
      
      const orderedUpdates = [
        { id: 'transaction-1', data: { categoryId: 'first' } },
        { id: 'transaction-2', data: { categoryId: 'second' } }
      ]
      
      // Act
      const results = await bulkUpdateTransactions(orderedUpdates)
      
      // Assert - results should maintain input order
      expect(results[0]).toEqual(
        expect.objectContaining({
          id: 'transaction-1',
          categoryId: 'first'
        })
      )
      
      expect(results[1]).toEqual(
        expect.objectContaining({
          id: 'transaction-2',
          categoryId: 'second'
        })
      )
    })

    it('provides progress feedback for bulk operations', async () => {
      // Arrange
      const { bulkUpdateTransactions } = useTransactionManagement()
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const updates = [
        { id: 'transaction-1', data: { categoryId: 'category-1' } },
        { id: 'transaction-2', data: { categoryId: 'category-2' } }
      ]
      
      // Act
      await bulkUpdateTransactions(updates)
      
      // Assert - should log bulk completion message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Bulk update complete: 2/2 transactions updated'),
        expect.anything()
      )
      
      consoleSpy.mockRestore()
    })

    it('skips non-existent transactions with warning', async () => {
      // Arrange
      const { bulkUpdateTransactions } = useTransactionManagement()
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Act
      const results = await bulkUpdateTransactions(mockBulkUpdates)
      
      // Assert
      expect(results).toHaveLength(2) // Only existing transactions processed
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Transaction non-existent not found, skipping'),
        expect.anything()
      )
      
      consoleWarnSpy.mockRestore()
    })

    it('handles empty bulk update arrays', async () => {
      // Arrange
      const { bulkUpdateTransactions } = useTransactionManagement()
      
      // Act
      const results = await bulkUpdateTransactions([])
      
      // Assert
      expect(results).toHaveLength(0)
      expect(mockDataStore.updateTransaction).not.toHaveBeenCalled()
    })

    it('merges update data with existing transaction data', async () => {
      // Arrange
      const { bulkUpdateTransactions } = useTransactionManagement()
      
      const updates = [
        { id: 'transaction-1', data: { categoryId: 'new-category', notes: 'Updated notes' } }
      ]
      
      // Act
      await bulkUpdateTransactions(updates)
      
      // Assert - should merge new data with existing transaction
      expect(mockDataStore.updateTransaction).toHaveBeenCalledWith({
        ...mockTransactions[0],
        categoryId: 'new-category',
        notes: 'Updated notes'
      })
    })
  })

  describe('error handling', () => {
    it('sets error state on pattern detection failures', async () => {
      // Arrange
      const { detectPatterns, patternDetectionError } = useTransactionManagement()
      
      const detectionError = new Error('Service unavailable')
      mockDetectionService.detectPatterns.mockImplementation(() => {
        throw detectionError
      })
      
      // Act
      try {
        await detectPatterns()
      } catch (e) {
        // Expected to throw
      }
      
      // Assert
      expect(patternDetectionError.value).toBe('Service unavailable')
    })

    it('resets loading state even when detection fails', async () => {
      // Arrange
      const { detectPatterns, patternDetectionLoading } = useTransactionManagement()
      
      mockDetectionService.detectPatterns.mockImplementation(() => {
        throw new Error('Detection failed')
      })
      
      // Act
      try {
        await detectPatterns()
      } catch (e) {
        // Expected to fail
      }
      
      // Assert
      expect(patternDetectionLoading.value).toBe(false)
    })

    it('handles transaction update failures gracefully', async () => {
      // Arrange
      const { updateTransactionWithSubscription } = useTransactionManagement()
      
      // Ensure transaction exists first, then make update fail
      mockDataStore.getById.mockResolvedValue(mockTransactions[0])
      mockDataStore.updateTransaction.mockRejectedValue(new Error('Update failed'))
      
      // Act & Assert
      await expect(updateTransactionWithSubscription('transaction-1', 'sub-1', 'cat-1'))
        .rejects.toThrow('Update failed')
    })
  })

  describe('integration scenarios', () => {
    it('completes full pattern detection workflow', async () => {
      // Arrange
      const { detectPatterns, patternDetectionLoading, patternDetectionError } = useTransactionManagement()
      
      const mockPatterns = [
        {
          merchant: 'Netflix',
          amount: 15.99,
          transactions: [mockTransactions[0]],
          confidence: 0.85,
          recurrence: 'monthly'
        }
      ]
      
      mockDetectionService.detectPatterns.mockReturnValue(mockPatterns)
      
      // Initially not loading, no error
      expect(patternDetectionLoading.value).toBe(false)
      expect(patternDetectionError.value).toBeNull()
      
      // Act
      await detectPatterns()
      
      // Assert - should have completed full workflow
      expect(mockDetectionService.detectPatterns).toHaveBeenCalledTimes(1)
      
      // Should end in clean state
      expect(patternDetectionLoading.value).toBe(false)
      expect(patternDetectionError.value).toBeNull()
    })

    it('completes transaction update with subscription sync workflow', async () => {
      // Arrange
      const { updateTransactionWithSubscription } = useTransactionManagement()
      
      const transactionWithSubscription = {
        ...mockTransactions[1],
        subscriptionId: 'existing-subscription-1'
      }
      
      mockDataStore.getById.mockReturnValue(transactionWithSubscription)
      
      // Act
      const result = await updateTransactionWithSubscription(
        'transaction-2',
        'existing-subscription-1',
        'new-category'
      )
      
      // Assert - should have updated both transaction and subscription
      expect(mockDataStore.updateTransaction).toHaveBeenCalledTimes(1)
      expect(mockSubscriptionsStore.save).toHaveBeenCalledTimes(1)
      
      expect(result).toEqual(
        expect.objectContaining({
          subscriptionId: 'existing-subscription-1',
          categoryId: 'new-category'
        })
      )
    })
  })
})

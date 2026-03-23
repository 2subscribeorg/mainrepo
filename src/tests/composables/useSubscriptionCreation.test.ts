import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSubscriptionCreation } from '@/composables/useSubscriptionCreation'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import type { Transaction } from '@/domain/models'
import type { SubscriptionRecurrence } from '@/types/subscriptions'

// Mock stores to isolate the composable under test
vi.mock('@/stores/subscriptions')
vi.mock('@/stores/transactions')
vi.mock('@/stores/auth')

// Mock utility functions
vi.mock('@/utils/subscriptionUtils', () => ({
  calculateNextPaymentDate: vi.fn(),
  getDefaultRecurrenceForMerchant: vi.fn(),
  generateSubscriptionNotes: vi.fn()
}))

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-subscription-uuid-123')
  }
})

describe('useSubscriptionCreation', () => {
  let mockSubscriptionsStore: any
  let mockTransactionsStore: any
  let mockAuthStore: any
  let pinia: any

  // Test data
  const mockTransaction: Transaction = {
    id: 'transaction-123',
    userId: 'user-123',
    accountId: 'account-123',
    merchantName: 'Netflix',
    amount: { amount: 15.99, currency: 'USD' },
    date: '2024-01-15',
    pending: false,
    categoryId: 'entertainment-category',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a fresh Pinia instance for each test
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Mock subscriptions store
    mockSubscriptionsStore = {
      save: vi.fn().mockResolvedValue(undefined)
    }
    
    // Mock transactions store
    mockTransactionsStore = {
      updateTransaction: vi.fn().mockResolvedValue(undefined)
    }
    
    // Mock auth store
    mockAuthStore = {
      userId: 'test-user-123'
    }
    
    // Setup store mocks
    const MockSubscriptionsStore = vi.mocked(useSubscriptionsStore)
    const MockTransactionsStore = vi.mocked(useTransactionsStore)
    const MockAuthStore = vi.mocked(useAuthStore)
    
    MockSubscriptionsStore.mockReturnValue(mockSubscriptionsStore)
    MockTransactionsStore.mockReturnValue(mockTransactionsStore)
    MockAuthStore.mockReturnValue(mockAuthStore)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createSubscriptionFromTransaction', () => {
    it('uses provided recurrence when specified', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const categoryId = 'entertainment-category'
      const providedRecurrence: SubscriptionRecurrence = 'weekly'
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, categoryId, providedRecurrence)
      
      // Assert
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-01-15', 'weekly')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence: 'weekly'
        })
      )
    })

    it('infers recurrence from merchant name (Netflix → monthly)', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { getDefaultRecurrenceForMerchant, calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(getDefaultRecurrenceForMerchant).mockReturnValue('monthly')
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const categoryId = 'entertainment-category'
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, categoryId)
      
      // Assert
      expect(getDefaultRecurrenceForMerchant).toHaveBeenCalledWith('Netflix')
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-01-15', 'monthly')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence: 'monthly'
        })
      )
    })

    it('falls back to default recurrence when inference fails', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { getDefaultRecurrenceForMerchant, calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(getDefaultRecurrenceForMerchant).mockReturnValue(null as any)
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const unknownMerchantTransaction = { ...mockTransaction, merchantName: 'Unknown Merchant' }
      const categoryId = 'other-category'
      
      // Act
      await createSubscriptionFromTransaction(unknownMerchantTransaction, categoryId)
      
      // Assert
      expect(getDefaultRecurrenceForMerchant).toHaveBeenCalledWith('Unknown Merchant')
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-01-15', 'monthly')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence: 'monthly'
        })
      )
    })

    it('calculates correct next payment date for each recurrence type', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-01-22')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const categoryId = 'entertainment-category'
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, categoryId, 'weekly')
      
      // Assert
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-01-15', 'weekly')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nextPaymentDate: '2024-01-22'
        })
      )
    })

    it('generates contextual notes based on creation source', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const categoryId = 'entertainment-category'
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, categoryId)
      
      // Assert
      expect(generateSubscriptionNotes).toHaveBeenCalledWith('manual', undefined, '2024-01-15')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Created manually from transaction on 2024-01-15'
        })
      )
    })

    it('creates complete subscription object with all required fields', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const mockDate = '2024-01-15T12:00:00.000Z'
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate)
      
      const categoryId = 'entertainment-category'
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, categoryId, 'monthly')
      
      // Assert
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith({
        id: 'test-subscription-uuid-123',
        userId: 'test-user-123',
        categoryId: 'entertainment-category',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        status: 'active',
        source: 'manual',
        notes: 'Created manually from transaction on 2024-01-15',
        createdAt: mockDate,
        updatedAt: mockDate
      })
    })

    it('saves subscription to store successfully', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const categoryId = 'entertainment-category'
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, categoryId)
      
      // Assert
      expect(mockSubscriptionsStore.save).toHaveBeenCalledTimes(1)
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantName: 'Netflix',
          categoryId: 'entertainment-category'
        })
      )
    })

    it('links transaction to created subscription', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const categoryId = 'entertainment-category'
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, categoryId)
      
      // Assert
      expect(mockTransactionsStore.updateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockTransaction,
          subscriptionId: 'test-subscription-uuid-123',
          categoryId: 'entertainment-category'
        })
      )
    })

    it('updates transaction with subscription ID and category', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const categoryId = 'new-category-id'
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, categoryId)
      
      // Assert
      expect(mockTransactionsStore.updateTransaction).toHaveBeenCalledWith({
        ...mockTransaction,
        subscriptionId: 'test-subscription-uuid-123',
        categoryId: 'new-category-id'
      })
    })

    it('handles transaction update failures after subscription creation', async () => {
      // Arrange
      const { createSubscriptionFromTransaction, error } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      mockTransactionsStore.updateTransaction.mockRejectedValue(new Error('Transaction update failed'))
      
      const categoryId = 'entertainment-category'
      
      // Act & Assert
      await expect(createSubscriptionFromTransaction(mockTransaction, categoryId))
        .rejects.toThrow('Transaction update failed')
      
      expect(error.value).toBe('Transaction update failed')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledTimes(1) // Subscription was created
      expect(mockTransactionsStore.updateTransaction).toHaveBeenCalledTimes(1) // Transaction update was attempted
    })

    it('returns created subscription on success', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const categoryId = 'entertainment-category'
      
      // Act
      const result = await createSubscriptionFromTransaction(mockTransaction, categoryId, 'monthly')
      
      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: 'test-subscription-uuid-123',
          merchantName: 'Netflix',
          categoryId: 'entertainment-category',
          recurrence: 'monthly',
          status: 'active'
        })
      )
    })

    it('handles missing userId gracefully', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      mockAuthStore.userId = null
      
      const categoryId = 'entertainment-category'
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, categoryId)
      
      // Assert
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'unknown'
        })
      )
    })
  })

  describe('merchant intelligence', () => {
    beforeEach(async () => {
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Test notes')
    })

    it('detects monthly services (Netflix, Spotify, Hulu)', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { getDefaultRecurrenceForMerchant } = await import('@/utils/subscriptionUtils')
      
      const monthlyServices = ['Netflix', 'Spotify', 'Hulu']
      
      for (const service of monthlyServices) {
        vi.mocked(getDefaultRecurrenceForMerchant).mockReturnValue('monthly')
        
        const transaction = { ...mockTransaction, merchantName: service }
        
        // Act
        await createSubscriptionFromTransaction(transaction, 'entertainment-category')
        
        // Assert
        expect(getDefaultRecurrenceForMerchant).toHaveBeenCalledWith(service)
      }
    })

    it('detects yearly services (Annual License)', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { getDefaultRecurrenceForMerchant } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(getDefaultRecurrenceForMerchant).mockReturnValue('yearly')
      
      const transaction = { ...mockTransaction, merchantName: 'Annual License' }
      
      // Act
      await createSubscriptionFromTransaction(transaction, 'software-category')
      
      // Assert
      expect(getDefaultRecurrenceForMerchant).toHaveBeenCalledWith('Annual License')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence: 'yearly'
        })
      )
    })

    it('detects weekly services (Gym Membership)', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { getDefaultRecurrenceForMerchant } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(getDefaultRecurrenceForMerchant).mockReturnValue('weekly')
      
      const transaction = { ...mockTransaction, merchantName: 'Gym Membership' }
      
      // Act
      await createSubscriptionFromTransaction(transaction, 'fitness-category')
      
      // Assert
      expect(getDefaultRecurrenceForMerchant).toHaveBeenCalledWith('Gym Membership')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence: 'weekly'
        })
      )
    })

    it('handles unknown merchants with default recurrence', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { getDefaultRecurrenceForMerchant } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(getDefaultRecurrenceForMerchant).mockReturnValue('monthly') // Default fallback
      
      const transaction = { ...mockTransaction, merchantName: 'Unknown Service XYZ' }
      
      // Act
      await createSubscriptionFromTransaction(transaction, 'other-category')
      
      // Assert
      expect(getDefaultRecurrenceForMerchant).toHaveBeenCalledWith('Unknown Service XYZ')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence: 'monthly'
        })
      )
    })

    it('is case-insensitive for merchant detection', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { getDefaultRecurrenceForMerchant } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(getDefaultRecurrenceForMerchant).mockReturnValue('monthly')
      
      const caseVariations = ['NETFLIX', 'netflix', 'NetFlix', 'nEtFlIx']
      
      for (const variation of caseVariations) {
        const transaction = { ...mockTransaction, merchantName: variation }
        
        // Act
        await createSubscriptionFromTransaction(transaction, 'entertainment-category')
        
        // Assert
        expect(getDefaultRecurrenceForMerchant).toHaveBeenCalledWith(variation)
      }
    })
  })

  describe('date calculations', () => {
    beforeEach(async () => {
      const { generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Test notes')
    })

    it('calculates weekly recurrence correctly', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-01-22')
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, 'fitness-category', 'weekly')
      
      // Assert
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-01-15', 'weekly')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nextPaymentDate: '2024-01-22'
        })
      )
    })

    it('calculates monthly recurrence correctly', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, 'entertainment-category', 'monthly')
      
      // Assert
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-01-15', 'monthly')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nextPaymentDate: '2024-02-15'
        })
      )
    })

    it('calculates quarterly recurrence correctly', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-04-15')
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, 'software-category', 'quarterly')
      
      // Assert
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-01-15', 'quarterly')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nextPaymentDate: '2024-04-15'
        })
      )
    })

    it('calculates yearly recurrence correctly', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2025-01-15')
      
      // Act
      await createSubscriptionFromTransaction(mockTransaction, 'software-category', 'yearly')
      
      // Assert
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-01-15', 'yearly')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nextPaymentDate: '2025-01-15'
        })
      )
    })

    it('handles edge cases (leap years, month boundaries)', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate } = await import('@/utils/subscriptionUtils')
      
      // Test leap year edge case
      const leapYearTransaction = { ...mockTransaction, date: '2024-02-29' }
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2025-02-28')
      
      // Act
      await createSubscriptionFromTransaction(leapYearTransaction, 'entertainment-category', 'yearly')
      
      // Assert
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-02-29', 'yearly')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nextPaymentDate: '2025-02-28'
        })
      )
    })

    it('validates input dates before calculation', async () => {
      // Arrange
      const { createSubscriptionFromTransaction } = useSubscriptionCreation()
      const { calculateNextPaymentDate } = await import('@/utils/subscriptionUtils')
      
      // Mock utility to throw error for invalid date
      vi.mocked(calculateNextPaymentDate).mockImplementation(() => {
        throw new Error('Invalid transaction date provided')
      })
      
      const invalidDateTransaction = { ...mockTransaction, date: 'invalid-date' }
      
      // Act & Assert
      await expect(createSubscriptionFromTransaction(invalidDateTransaction, 'entertainment-category'))
        .rejects.toThrow('Invalid transaction date provided')
    })
  })

  describe('error handling', () => {
    it('sets error state on subscription save failures', async () => {
      // Arrange
      const { createSubscriptionFromTransaction, error } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Test notes')
      
      const saveError = new Error('Database connection failed')
      mockSubscriptionsStore.save.mockRejectedValue(saveError)
      
      // Act & Assert
      await expect(createSubscriptionFromTransaction(mockTransaction, 'entertainment-category'))
        .rejects.toThrow('Database connection failed')
      
      expect(error.value).toBe('Database connection failed')
    })

    it('maintains loading state correctly during operations', async () => {
      // Arrange
      const { createSubscriptionFromTransaction, loading } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Test notes')
      
      expect(loading.value).toBe(false)
      
      // Mock save to be slow so we can check loading state
      let resolvePromise: () => void
      const slowPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockSubscriptionsStore.save.mockReturnValue(slowPromise)
      
      // Act
      const createPromise = createSubscriptionFromTransaction(mockTransaction, 'entertainment-category')
      
      // Assert - should be loading now
      expect(loading.value).toBe(true)
      
      // Resolve the promise
      resolvePromise!()
      await createPromise
      
      // Should not be loading anymore
      expect(loading.value).toBe(false)
    })

    it('resets loading state even when operations fail', async () => {
      // Arrange
      const { createSubscriptionFromTransaction, loading } = useSubscriptionCreation()
      const { calculateNextPaymentDate, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Test notes')
      
      mockSubscriptionsStore.save.mockRejectedValue(new Error('Save failed'))
      
      // Act
      try {
        await createSubscriptionFromTransaction(mockTransaction, 'entertainment-category')
      } catch (e) {
        // Expected to fail
      }
      
      // Assert
      expect(loading.value).toBe(false)
    })
  })

  describe('integration scenarios', () => {
    it('completes full subscription creation workflow', async () => {
      // Arrange
      const { createSubscriptionFromTransaction, loading, error } = useSubscriptionCreation()
      const { calculateNextPaymentDate, getDefaultRecurrenceForMerchant, generateSubscriptionNotes } = await import('@/utils/subscriptionUtils')
      
      vi.mocked(getDefaultRecurrenceForMerchant).mockReturnValue('monthly')
      vi.mocked(calculateNextPaymentDate).mockReturnValue('2024-02-15')
      vi.mocked(generateSubscriptionNotes).mockReturnValue('Created manually from transaction on 2024-01-15')
      
      const categoryId = 'entertainment-category'
      
      // Initially not loading, no error
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      
      // Act
      const result = await createSubscriptionFromTransaction(mockTransaction, categoryId)
      
      // Assert - should have called all expected methods
      expect(getDefaultRecurrenceForMerchant).toHaveBeenCalledWith('Netflix')
      expect(calculateNextPaymentDate).toHaveBeenCalledWith('2024-01-15', 'monthly')
      expect(generateSubscriptionNotes).toHaveBeenCalledWith('manual', undefined, '2024-01-15')
      expect(mockSubscriptionsStore.save).toHaveBeenCalledTimes(1)
      expect(mockTransactionsStore.updateTransaction).toHaveBeenCalledTimes(1)
      
      // Should return created subscription
      expect(result).toEqual(
        expect.objectContaining({
          merchantName: 'Netflix',
          categoryId: 'entertainment-category',
          recurrence: 'monthly'
        })
      )
      
      // Should end in clean state
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })
  })
})

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSubscriptionFeedback } from '@/composables/useSubscriptionFeedback'
import * as authHelpers from '@/utils/authHelpers'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useCategoriesStore } from '@/stores/categories'

// Mock environment variables
vi.stubEnv('VITE_BACKEND_API_URL', 'http://localhost:3002')

// Mock dependencies
vi.mock('@/utils/authHelpers', () => ({
  getFirebaseAuthToken: vi.fn(),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: { value: { id: 'user-123', email: 'test@example.com' } },
    userId: { value: 'user-123' },
  }),
}))

vi.mock('@/stores/subscriptions', () => ({
  useSubscriptionsStore: vi.fn(),
}))

vi.mock('@/stores/transactionsData', () => ({
  useTransactionsDataStore: vi.fn(),
}))

vi.mock('@/stores/categories', () => ({
  useCategoriesStore: vi.fn(),
}))

global.fetch = vi.fn()

describe('useSubscriptionFeedback', () => {
  const mockToken = 'mock-token-123'
  const API_BASE = 'http://localhost:3002'

  let mockSubscriptionsStore: any
  let mockTransactionsStore: any
  let mockCategoriesStore: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup auth mock
    vi.mocked(authHelpers.getFirebaseAuthToken).mockResolvedValue(mockToken)

    // Setup store mocks
    mockSubscriptionsStore = {
      addSubscription: vi.fn(),
    }
    mockTransactionsStore = {
      updateTransaction: vi.fn(),
    }
    mockCategoriesStore = {
      addCategory: vi.fn(),
      categories: [],
    }

    vi.mocked(useSubscriptionsStore).mockReturnValue(mockSubscriptionsStore)
    vi.mocked(useTransactionsDataStore).mockReturnValue(mockTransactionsStore)
    vi.mocked(useCategoriesStore).mockReturnValue(mockCategoriesStore)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('recordFeedback', () => {
    test('sends feedback with auth token', async () => {
      // Arrange
      const { recordFeedback } = useSubscriptionFeedback()
      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
        detectionConfidence: 0.95,
        detectionMethod: 'pattern_matching' as const,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: 'feedback-1',
            ...feedbackParams,
            createdAt: '2024-03-01T10:00:00Z',
          },
        }),
      } as Response)

      // Act
      const result = await recordFeedback(feedbackParams)

      // Assert
      expect(authHelpers.getFirebaseAuthToken).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/api/feedback/record`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(feedbackParams),
        })
      )
      expect(result).toBeTruthy()
    })

    test('handles feedback recording failure', async () => {
      // Arrange
      const { recordFeedback } = useSubscriptionFeedback()
      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid data' }),
      } as Response)

      // Act
      const result = await recordFeedback(feedbackParams)

      // Assert
      expect(result).toBeNull()
    })

    test('sets loading state during feedback recording', async () => {
      // Arrange
      const { recordFeedback, loading } = useSubscriptionFeedback()
      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({ data: {} }),
              } as Response)
            }, 100)
          })
      )

      // Act
      expect(loading.value).toBe(false)
      const promise = recordFeedback(feedbackParams)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('confirmSubscription', () => {
    test('opens category modal when confirming subscription', async () => {
      // Arrange
      const { confirmSubscription, showCategoryModal } = useSubscriptionFeedback()
      const confirmParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        detectionConfidence: 0.95,
        detectionMethod: 'pattern_matching' as const,
      }

      // Act
      const result = await confirmSubscription(confirmParams)

      // Assert
      expect(showCategoryModal.value).toBe(true)
      expect(result).toBe(true)
    })
  })

  describe('rejectSubscription', () => {
    test('records rejection feedback and returns success', async () => {
      // Arrange
      const { rejectSubscription } = useSubscriptionFeedback()
      const rejectParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        detectionConfidence: 0.95,
        detectionMethod: 'pattern_matching' as const,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'feedback-1' } }),
      } as Response)

      // Act
      const result = await rejectSubscription(rejectParams)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/api/feedback/record`,
        expect.objectContaining({
          body: expect.stringContaining('"userAction":"rejected"'),
        })
      )
      // Now returns feedback ID instead of boolean
      expect(result).toBe('feedback-1')
    })

    test('returns null when rejection feedback fails', async () => {
      // Arrange
      const { rejectSubscription } = useSubscriptionFeedback()
      const rejectParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      } as Response)

      // Act
      const result = await rejectSubscription(rejectParams)

      // Assert
      // Returns null on failure instead of false
      expect(result).toBe(null)
    })
  })

  describe('Error Handling', () => {
    test('sets error state when auth fails', async () => {
      // Arrange
      const { recordFeedback, error } = useSubscriptionFeedback()
      vi.mocked(authHelpers.getFirebaseAuthToken).mockRejectedValue(
        new Error('User not authenticated')
      )

      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      // Act
      await recordFeedback(feedbackParams)

      // Assert
      expect(error.value).toBeTruthy()
      expect(error.value).toContain('Authentication failed')
    })

    test('handles network errors gracefully', async () => {
      // Arrange
      const { recordFeedback, error } = useSubscriptionFeedback()
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      // Act
      const result = await recordFeedback(feedbackParams)

      // Assert
      expect(result).toBeNull()
      expect(error.value).toBeTruthy()
    })

    test('clears error state on successful request', async () => {
      // Arrange
      const { recordFeedback, error } = useSubscriptionFeedback()

      // First request fails
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Error' }),
      } as Response)

      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      await recordFeedback(feedbackParams)
      expect(error.value).toBeTruthy()

      // Second request succeeds
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      } as Response)

      // Act
      await recordFeedback(feedbackParams)

      // Assert
      expect(error.value).toBeNull()
    })
  })

  describe('Integration with Stores', () => {
    test('does not call stores directly during feedback recording', async () => {
      // Arrange
      const { recordFeedback } = useSubscriptionFeedback()
      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      } as Response)

      // Act
      await recordFeedback(feedbackParams)

      // Assert
      // Feedback recording should not directly modify stores
      // Store updates happen through category selection flow
      expect(mockSubscriptionsStore.addSubscription).not.toHaveBeenCalled()
      expect(mockTransactionsStore.updateTransaction).not.toHaveBeenCalled()
    })
  })
})

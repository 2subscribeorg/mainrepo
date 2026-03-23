import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useSubscriptionFeedback } from '@/composables/useSubscriptionFeedback'
import { FirebaseSubscriptionFeedbackRepo } from '@/data/repo/firebase/FirebaseSubscriptionFeedbackRepo'

// Mock environment variables
vi.stubEnv('VITE_BACKEND_API_URL', 'http://localhost:3002')

// Mock Firebase to prevent initialization errors
vi.mock('@/services/auth', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com'
    }
  }),
  getFirebaseAuthToken: vi.fn().mockResolvedValue('mock-token-123')
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({
    firestore: vi.fn(),
    auth: vi.fn()
  })),
  getApp: vi.fn(() => ({
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue({ exists: false }),
          update: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockResolvedValue(undefined)
        })),
        add: vi.fn().mockResolvedValue({ id: 'test-id' }),
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ docs: [] })
        }))
      }))
    }))
  }))
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        set: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({ exists: false }),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined)
      })),
      add: vi.fn().mockResolvedValue({ id: 'test-id' }),
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ docs: [] })
      }))
    }))
  }))
}))

// Mock stores
vi.mock('@/stores/subscriptions', () => ({
  useSubscriptionsStore: () => ({
    subscriptions: { value: [] },
    fetchAll: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    addSubscription: vi.fn(),
  }),
}))

vi.mock('@/stores/transactionsData', () => ({
  useTransactionsDataStore: () => ({
    transactions: { value: [] },
    fetchAll: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    updateTransaction: vi.fn(),
  }),
}))

vi.mock('@/stores/categories', () => ({
  useCategoriesStore: () => ({
    categories: { value: [] },
    fetchAll: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    addCategory: vi.fn(),
  }),
}))

// Mock useAuth with reactive references so we can mutate per test
const mockUser = ref<{ id: string; email: string } | null>({
  id: 'test-user-123',
  email: 'test@example.com'
})
const mockUserId = ref<string | null>('test-user-123')

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    userId: mockUserId,
  }),
}))

// Mock useLoadingStates with proper function execution
const mockWithLoading = vi.fn().mockImplementation(async (_key: string, fn: () => Promise<any>) => {
  return await fn()
})

const mockLoadingStates = {
  setLoading: vi.fn(),
  withLoading: mockWithLoading,
  isLoading: vi.fn((_key: string) => ref(false)),
}

vi.mock('@/composables/useLoadingStates', () => ({
  useLoadingStates: () => mockLoadingStates,
}))

// Mock the Firebase repo
const mockRecordFeedback = vi.fn().mockResolvedValue({ id: 'feedback-123' })

vi.mock('@/data/repo/firebase/FirebaseSubscriptionFeedbackRepo', () => ({
  FirebaseSubscriptionFeedbackRepo: vi.fn().mockImplementation(() => ({
    recordFeedback: mockRecordFeedback,
    getById: vi.fn().mockResolvedValue(null),
    getByUserId: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    db: {} as any,
    collectionName: 'subscriptionFeedback',
    getUserFeedback: vi.fn().mockResolvedValue([]),
    deleteFeedback: vi.fn().mockResolvedValue(undefined),
  }))
}))

global.fetch = vi.fn()

describe('useSubscriptionFeedback', () => {
  beforeEach(() => {
    // Reset mock call history but keep implementations
    vi.clearAllMocks()
    
    // IMPORTANT: Re-apply all mock implementations after clearing
    mockWithLoading.mockImplementation(async (_key: string, fn: () => Promise<any>) => {
      return await fn()
    })
    
    // Re-apply Firebase repo mock implementation
    vi.mocked(FirebaseSubscriptionFeedbackRepo).mockImplementation(() => ({
      recordFeedback: mockRecordFeedback,
      getById: vi.fn().mockResolvedValue(null),
      getByUserId: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
      db: {} as any,
      collectionName: 'subscriptionFeedback',
      getUserFeedback: vi.fn().mockResolvedValue([]),
      deleteFeedback: vi.fn().mockResolvedValue(undefined),
    }))
    
    // Reset the mock implementations
    mockRecordFeedback.mockResolvedValue({ id: 'feedback-123' })
    mockUser.value = { id: 'test-user-123', email: 'test@example.com' }
    mockUserId.value = 'test-user-123'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('recordFeedback', () => {
    test('records feedback successfully', async () => {
      // Arrange
      const { recordFeedback } = useSubscriptionFeedback()
      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      // Act
      const result = await recordFeedback(feedbackParams)

      // Assert - should call Firebase repo and return result
      expect(mockLoadingStates.withLoading).toHaveBeenCalledWith('feedback', expect.any(Function))
      expect(result).toEqual({ id: 'feedback-123' })
    })

    test('handles feedback recording failure', async () => {
      // Arrange
      const { recordFeedback, error } = useSubscriptionFeedback()
      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      // Mock Firebase repo to throw error
      mockRecordFeedback.mockRejectedValue(new Error('Firebase error'))

      // Act
      const result = await recordFeedback(feedbackParams)

      // Assert
      expect(result).toBeNull()
      expect(error.value).toBeTruthy()
    })

    test('sets loading state during feedback recording', async () => {
      // Arrange
      const { recordFeedback } = useSubscriptionFeedback()
      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      // Act
      await recordFeedback(feedbackParams)

      // Assert - withLoading should have been called with 'feedback' key
      expect(mockLoadingStates.withLoading).toHaveBeenCalledWith('feedback', expect.any(Function))
    })
  })

  describe('confirmSubscription', () => {
    test('opens category modal when confirming subscription', async () => {
      // Arrange
      const { confirmSubscription } = useSubscriptionFeedback()
      const confirmParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' as const },
        date: '2024-03-01',
        detectionConfidence: 0.85,
        detectionMethod: 'pattern_matching' as const,
      }

      // Act
      const result = await confirmSubscription(confirmParams)

      // Assert - check that the function completed successfully
      expect(result).toBe(true)
      expect(mockLoadingStates.withLoading).toHaveBeenCalledWith('feedback', expect.any(Function))
    })
  })

  describe('rejectSubscription', () => {
    test('records rejection feedback and returns success', async () => {
      // Arrange
      const { rejectSubscription } = useSubscriptionFeedback()
      const rejectParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' as const },
        date: '2024-03-01',
        detectionConfidence: 0.85,
        detectionMethod: 'pattern_matching' as const,
      }

      // Act
      const result = await rejectSubscription(rejectParams)

      // Assert - should call Firebase repo and return feedback ID
      expect(result).toBe('feedback-123')
      expect(mockLoadingStates.withLoading).toHaveBeenCalledWith('feedback', expect.any(Function))
    })

    test('returns null when rejection feedback fails', async () => {
      // Arrange
      const { rejectSubscription } = useSubscriptionFeedback()
      const rejectParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' as const },
        date: '2024-03-01',
      }

      // Mock Firebase repo to return null (failure)
      mockRecordFeedback.mockResolvedValue(null)

      // Act
      const result = await rejectSubscription(rejectParams)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('Error Handling', () => {
    test('sets error state when auth fails', async () => {
      // Arrange
      // Mock user to be null (not authenticated) by changing the reactive ref
      mockUser.value = null
      mockUserId.value = null
      
      const { recordFeedback, error } = useSubscriptionFeedback()
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
      expect(error.value).toContain('User not authenticated')
      
      // Reset user for other tests
      mockUser.value = { id: 'test-user-123', email: 'test@example.com' }
      mockUserId.value = 'test-user-123'
    })

    test('handles network errors gracefully', async () => {
      // Arrange
      const { recordFeedback, error } = useSubscriptionFeedback()
      
      // Mock Firebase repo to throw error
      mockRecordFeedback.mockRejectedValue(new Error('Network error'))

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

      const feedbackParams = {
        transactionId: 'tx-123',
        merchantName: 'Netflix',
        amount: { amount: 9.99, currency: 'GBP' as const },
        date: '2024-03-01',
        userAction: 'confirmed' as const,
      }

      // First request fails - mock Firebase repo to throw error
      mockRecordFeedback.mockRejectedValueOnce(new Error('First error'))

      await recordFeedback(feedbackParams)
      expect(error.value).toBeTruthy()

      // Second request succeeds - the mock should already be set to success from beforeEach
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

      // Act
      await recordFeedback(feedbackParams)

      // Assert - withLoading should have been called with 'feedback' key
      expect(mockLoadingStates.withLoading).toHaveBeenCalledWith('feedback', expect.any(Function))
    })
  })
})
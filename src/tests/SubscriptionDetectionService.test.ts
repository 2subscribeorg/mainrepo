import { describe, test, expect, beforeEach, vi } from 'vitest'
import { SubscriptionDetectionService } from '@/services/SubscriptionDetectionService'
import { PatternDetector, type RecurringPattern } from '@/services/PatternDetector'
import type { BankTransaction } from '@/domain/models'

// Mock PatternDetector to isolate the service under test
vi.mock('@/services/PatternDetector')

describe('SubscriptionDetectionService', () => {
  let service: SubscriptionDetectionService
  let mockPatternDetector: vi.Mocked<typeof PatternDetector>

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get mocked constructor and create mock instance
    const MockPatternDetector = vi.mocked(PatternDetector)
    mockPatternDetector = {
      detectPatterns: vi.fn(),
      matchesPattern: vi.fn(),
    } as any
    
    MockPatternDetector.mockImplementation(() => mockPatternDetector)
    
    service = new SubscriptionDetectionService()
  })

  describe('detectPatterns', () => {
    test('returns patterns from PatternDetector when transactions provided', () => {
      // Arrange
      const mockTransactions: BankTransaction[] = [
        {
          id: 'tx1',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'GBP' },
          date: '2024-01-15',
          accountId: 'acc1',
          userId: 'user1',
          pending: false,
          transactionType: 'purchase'
        },
        {
          id: 'tx2', 
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'GBP' },
          date: '2024-02-15',
          accountId: 'acc1',
          userId: 'user1',
          pending: false,
          transactionType: 'purchase'
        }
      ]

      const expectedPatterns: RecurringPattern[] = [
        {
          merchant: 'Netflix',
          normalizedMerchant: 'netflix',
          amount: 15.99,
          amountVariance: 0,
          frequency: 'monthly',
          confidence: 0.9,
          lastDate: '2024-02-15',
          nextDate: '2024-03-15',
          transactions: mockTransactions,
          detectionReason: 'amount_matching',
          flags: []
        }
      ]

      mockPatternDetector.detectPatterns.mockReturnValue(expectedPatterns)

      // Act
      const result = service.detectPatterns(mockTransactions)

      // Assert
      expect(mockPatternDetector.detectPatterns).toHaveBeenCalledWith(mockTransactions)
      expect(result).toEqual(expectedPatterns)
      expect(result).toHaveLength(1)
    })

    test('returns empty array when no patterns detected', () => {
      // Arrange
      const mockTransactions: BankTransaction[] = [
        {
          id: 'tx1',
          merchantName: 'One-time Purchase',
          amount: { amount: 50.00, currency: 'GBP' },
          date: '2024-01-15',
          accountId: 'acc1',
          userId: 'user1',
          pending: false,
          transactionType: 'purchase'
        }
      ]

      mockPatternDetector.detectPatterns.mockReturnValue([])

      // Act
      const result = service.detectPatterns(mockTransactions)

      // Assert
      expect(mockPatternDetector.detectPatterns).toHaveBeenCalledWith(mockTransactions)
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    test('returns empty array when transactions array is empty', () => {
      // Arrange
      const mockTransactions: BankTransaction[] = []
      mockPatternDetector.detectPatterns.mockReturnValue([])

      // Act
      const result = service.detectPatterns(mockTransactions)

      // Assert
      expect(mockPatternDetector.detectPatterns).toHaveBeenCalledWith([])
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    test('passes through PatternDetector errors without modification', () => {
      // Arrange
      const mockTransactions: BankTransaction[] = []
      const expectedError = new Error('Pattern detection failed')
      
      mockPatternDetector.detectPatterns.mockImplementation(() => {
        throw expectedError
      })

      // Act & Assert
      expect(() => service.detectPatterns(mockTransactions)).toThrow(expectedError)
      expect(mockPatternDetector.detectPatterns).toHaveBeenCalledWith(mockTransactions)
    })
  })

  describe('matchNewTransaction', () => {
    test('returns matching pattern when transaction matches existing pattern', () => {
      // Arrange
      const transaction: BankTransaction = {
        id: 'tx3',
        merchantName: 'Spotify',
        amount: { amount: 9.99, currency: 'GBP' },
        date: '2024-03-15',
        accountId: 'acc1',
        userId: 'user1',
        pending: false,
        transactionType: 'purchase'
      }

      const existingPatterns: RecurringPattern[] = [
        {
          merchant: 'Spotify',
          normalizedMerchant: 'spotify',
          amount: 9.99,
          amountVariance: 0,
          frequency: 'monthly',
          confidence: 0.85,
          lastDate: '2024-02-15',
          nextDate: '2024-03-15',
          transactions: [],
          detectionReason: 'amount_matching',
          flags: []
        }
      ]

      mockPatternDetector.matchesPattern.mockReturnValue(true)

      // Act
      const result = service.matchNewTransaction(transaction, existingPatterns)

      // Assert
      expect(mockPatternDetector.matchesPattern).toHaveBeenCalledWith(transaction, existingPatterns[0])
      expect(result).toEqual(existingPatterns[0])
    })

    test('returns null when transaction does not match any patterns', () => {
      // Arrange
      const transaction: BankTransaction = {
        id: 'tx3',
        merchantName: 'Amazon',
        amount: { amount: 25.00, currency: 'GBP' },
        date: '2024-03-15',
        accountId: 'acc1',
        userId: 'user1',
        pending: false,
        transactionType: 'purchase'
      }

      const existingPatterns: RecurringPattern[] = [
        {
          merchant: 'Netflix',
          normalizedMerchant: 'netflix',
          amount: 15.99,
          amountVariance: 0,
          frequency: 'monthly',
          confidence: 0.9,
          lastDate: '2024-02-15',
          nextDate: '2024-03-15',
          transactions: [],
          detectionReason: 'amount_matching',
          flags: []
        }
      ]

      mockPatternDetector.matchesPattern.mockReturnValue(false)

      // Act
      const result = service.matchNewTransaction(transaction, existingPatterns)

      // Assert
      expect(mockPatternDetector.matchesPattern).toHaveBeenCalledWith(transaction, existingPatterns[0])
      expect(result).toBeNull()
    })

    test('returns null when patterns array is empty', () => {
      // Arrange
      const transaction: BankTransaction = {
        id: 'tx3',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'GBP' },
        date: '2024-03-15',
        accountId: 'acc1',
        userId: 'user1',
        pending: false,
        transactionType: 'purchase'
      }

      const existingPatterns: RecurringPattern[] = []

      // Act
      const result = service.matchNewTransaction(transaction, existingPatterns)

      // Assert
      expect(mockPatternDetector.matchesPattern).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    test('checks patterns in order and returns first match', () => {
      // Arrange
      const transaction: BankTransaction = {
        id: 'tx3',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'GBP' },
        date: '2024-03-15',
        accountId: 'acc1',
        userId: 'user1',
        pending: false,
        transactionType: 'purchase'
      }

      const existingPatterns: RecurringPattern[] = [
        {
          merchant: 'Netflix',
          normalizedMerchant: 'netflix',
          amount: 15.99,
          amountVariance: 0,
          frequency: 'monthly',
          confidence: 0.7,
          lastDate: '2024-02-15',
          nextDate: '2024-03-15',
          transactions: [],
          detectionReason: 'amount_matching',
          flags: []
        },
        {
          merchant: 'Netflix',
          normalizedMerchant: 'netflix',
          amount: 15.99,
          amountVariance: 0,
          frequency: 'monthly',
          confidence: 0.9,
          lastDate: '2024-02-15',
          nextDate: '2024-03-15',
          transactions: [],
          detectionReason: 'amount_matching',
          flags: []
        }
      ]

      // First pattern doesn't match, second does
      mockPatternDetector.matchesPattern
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)

      // Act
      const result = service.matchNewTransaction(transaction, existingPatterns)

      // Assert
      expect(mockPatternDetector.matchesPattern).toHaveBeenCalledTimes(2)
      expect(mockPatternDetector.matchesPattern).toHaveBeenNthCalledWith(1, transaction, existingPatterns[0])
      expect(mockPatternDetector.matchesPattern).toHaveBeenNthCalledWith(2, transaction, existingPatterns[1])
      expect(result).toEqual(existingPatterns[1])
    })
  })

  describe('constructor', () => {
    test('creates PatternDetector with default config when no config provided', () => {
      // Arrange
      const MockPatternDetector = vi.mocked(PatternDetector)
      
      // Act
      new SubscriptionDetectionService()

      // Assert
      expect(MockPatternDetector).toHaveBeenCalledWith(undefined)
    })

    test('creates PatternDetector with custom config when provided', () => {
      // Arrange
      const customConfig = {
        minTransactions: 3,
        minConfidence: 0.8,
        intervalToleranceDays: 3,
        amountTolerancePercent: 5,
        lookbackDays: 180
      }
      const MockPatternDetector = vi.mocked(PatternDetector)
      
      // Act
      new SubscriptionDetectionService(customConfig)

      // Assert
      expect(MockPatternDetector).toHaveBeenCalledWith(customConfig)
    })
  })
})

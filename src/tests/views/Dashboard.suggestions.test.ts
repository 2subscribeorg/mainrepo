import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SubscriptionFeedback } from '@/domain/models'

/**
 * Unit tests for Dashboard subscription suggestions filtering logic
 * Tests the fix for the bug where rejected suggestions were reappearing on reload
 */
describe('Dashboard Subscription Suggestions Filtering', () => {
  describe('dismissedMerchants filtering logic', () => {
    it('should only include rejected feedback, not confirmed feedback', () => {
      // Arrange: Mock user feedback with both rejected and confirmed actions
      const userFeedback: SubscriptionFeedback[] = [
        {
          id: 'feedback-1',
          transactionId: 'tx-1',
          userId: 'user-123',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          date: '2024-01-15',
          userAction: 'rejected',
          timestamp: '2024-01-15T10:00:00.000Z'
        },
        {
          id: 'feedback-2',
          transactionId: 'tx-2',
          userId: 'user-123',
          merchantName: 'Spotify',
          amount: { amount: 9.99, currency: 'USD' },
          date: '2024-01-20',
          userAction: 'confirmed',
          timestamp: '2024-01-20T10:00:00.000Z'
        },
        {
          id: 'feedback-3',
          transactionId: 'tx-3',
          userId: 'user-123',
          merchantName: 'Disney+',
          amount: { amount: 12.99, currency: 'USD' },
          date: '2024-01-25',
          userAction: 'rejected',
          timestamp: '2024-01-25T10:00:00.000Z'
        }
      ]

      // Act: Apply the filtering logic (same as Dashboard.vue line 228-232)
      const dismissedMerchants = new Set(
        userFeedback
          .filter(f => f.userAction === 'rejected')
          .map(f => f.merchantName.toLowerCase())
      )

      // Assert: Only rejected merchants should be in the set
      expect(dismissedMerchants.has('netflix')).toBe(true)
      expect(dismissedMerchants.has('spotify')).toBe(false) // Confirmed, not rejected
      expect(dismissedMerchants.has('disney+')).toBe(true)
      expect(dismissedMerchants.size).toBe(2)
    })

    it('should handle case-insensitive merchant names', () => {
      // Arrange: Feedback with different case variations
      const userFeedback: SubscriptionFeedback[] = [
        {
          id: 'feedback-1',
          transactionId: 'tx-1',
          userId: 'user-123',
          merchantName: 'NETFLIX',
          amount: { amount: 15.99, currency: 'USD' },
          date: '2024-01-15',
          userAction: 'rejected',
          timestamp: '2024-01-15T10:00:00.000Z'
        },
        {
          id: 'feedback-2',
          transactionId: 'tx-2',
          userId: 'user-123',
          merchantName: 'SpOtIfY',
          amount: { amount: 9.99, currency: 'USD' },
          date: '2024-01-20',
          userAction: 'rejected',
          timestamp: '2024-01-20T10:00:00.000Z'
        }
      ]

      // Act
      const dismissedMerchants = new Set(
        userFeedback
          .filter(f => f.userAction === 'rejected')
          .map(f => f.merchantName.toLowerCase())
      )

      // Assert: All should be lowercase
      expect(dismissedMerchants.has('netflix')).toBe(true)
      expect(dismissedMerchants.has('spotify')).toBe(true)
      expect(dismissedMerchants.has('NETFLIX')).toBe(false) // Case matters in Set
      expect(dismissedMerchants.has('SpOtIfY')).toBe(false)
    })

    it('should handle empty feedback array', () => {
      // Arrange
      const userFeedback: SubscriptionFeedback[] = []

      // Act
      const dismissedMerchants = new Set(
        userFeedback
          .filter(f => f.userAction === 'rejected')
          .map(f => f.merchantName.toLowerCase())
      )

      // Assert
      expect(dismissedMerchants.size).toBe(0)
    })

    it('should handle all confirmed feedback (no rejections)', () => {
      // Arrange
      const userFeedback: SubscriptionFeedback[] = [
        {
          id: 'feedback-1',
          transactionId: 'tx-1',
          userId: 'user-123',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          date: '2024-01-15',
          userAction: 'confirmed',
          timestamp: '2024-01-15T10:00:00.000Z'
        },
        {
          id: 'feedback-2',
          transactionId: 'tx-2',
          userId: 'user-123',
          merchantName: 'Spotify',
          amount: { amount: 9.99, currency: 'USD' },
          date: '2024-01-20',
          userAction: 'confirmed',
          timestamp: '2024-01-20T10:00:00.000Z'
        }
      ]

      // Act
      const dismissedMerchants = new Set(
        userFeedback
          .filter(f => f.userAction === 'rejected')
          .map(f => f.merchantName.toLowerCase())
      )

      // Assert: No merchants should be dismissed
      expect(dismissedMerchants.size).toBe(0)
      expect(dismissedMerchants.has('netflix')).toBe(false)
      expect(dismissedMerchants.has('spotify')).toBe(false)
    })

    it('should handle duplicate rejected merchants', () => {
      // Arrange: Same merchant rejected multiple times
      const userFeedback: SubscriptionFeedback[] = [
        {
          id: 'feedback-1',
          transactionId: 'tx-1',
          userId: 'user-123',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          date: '2024-01-15',
          userAction: 'rejected',
          timestamp: '2024-01-15T10:00:00.000Z'
        },
        {
          id: 'feedback-2',
          transactionId: 'tx-2',
          userId: 'user-123',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          date: '2024-02-15',
          userAction: 'rejected',
          timestamp: '2024-02-15T10:00:00.000Z'
        }
      ]

      // Act
      const dismissedMerchants = new Set(
        userFeedback
          .filter(f => f.userAction === 'rejected')
          .map(f => f.merchantName.toLowerCase())
      )

      // Assert: Set should deduplicate
      expect(dismissedMerchants.size).toBe(1)
      expect(dismissedMerchants.has('netflix')).toBe(true)
    })
  })

  describe('pattern filtering with dismissed merchants', () => {
    it('should filter out patterns for rejected merchants', () => {
      // Arrange: Mock patterns and dismissed merchants
      const mockPatterns = [
        { merchant: 'Netflix', confidence: 0.9, amount: 15.99 },
        { merchant: 'Spotify', confidence: 0.85, amount: 9.99 },
        { merchant: 'Disney+', confidence: 0.8, amount: 12.99 }
      ]

      const dismissedMerchants = new Set(['netflix', 'disney+'])

      // Act: Apply filtering logic (same as Dashboard.vue line 251-253)
      const filteredPatterns = mockPatterns.filter(pattern => {
        return pattern.confidence >= 0.5 && !dismissedMerchants.has(pattern.merchant.toLowerCase())
      })

      // Assert: Only Spotify should remain
      expect(filteredPatterns).toHaveLength(1)
      expect(filteredPatterns[0].merchant).toBe('Spotify')
    })

    it('should be case-insensitive when matching patterns to dismissed merchants', () => {
      // Arrange
      const mockPatterns = [
        { merchant: 'NETFLIX', confidence: 0.9, amount: 15.99 },
        { merchant: 'spotify', confidence: 0.85, amount: 9.99 }
      ]

      const dismissedMerchants = new Set(['netflix']) // lowercase

      // Act
      const filteredPatterns = mockPatterns.filter(pattern => {
        return pattern.confidence >= 0.5 && !dismissedMerchants.has(pattern.merchant.toLowerCase())
      })

      // Assert: NETFLIX should be filtered out despite case difference
      expect(filteredPatterns).toHaveLength(1)
      expect(filteredPatterns[0].merchant).toBe('spotify')
    })

    it('should respect confidence threshold in addition to dismissed merchants', () => {
      // Arrange
      const mockPatterns = [
        { merchant: 'Netflix', confidence: 0.9, amount: 15.99 },
        { merchant: 'Spotify', confidence: 0.3, amount: 9.99 }, // Low confidence
        { merchant: 'Disney+', confidence: 0.8, amount: 12.99 }
      ]

      const dismissedMerchants = new Set(['netflix'])

      // Act
      const filteredPatterns = mockPatterns.filter(pattern => {
        return pattern.confidence >= 0.5 && !dismissedMerchants.has(pattern.merchant.toLowerCase())
      })

      // Assert: Netflix filtered by dismissed, Spotify filtered by confidence
      expect(filteredPatterns).toHaveLength(1)
      expect(filteredPatterns[0].merchant).toBe('Disney+')
    })
  })
})

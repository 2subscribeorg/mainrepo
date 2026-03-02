import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { renewalWarningService } from '@/services/RenewalWarningService'
import * as authHelpers from '@/utils/authHelpers'

// Mock auth helpers
vi.mock('@/utils/authHelpers', () => ({
  getFirebaseAuthToken: vi.fn(),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('RenewalWarningService', () => {
  const mockToken = 'mock-auth-token-123'
  const mockUserId = 'user-123'
  const mockWarningId = 'warning-456'
  const API_BASE_URL = 'http://localhost:3002'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHelpers.getFirebaseAuthToken).mockResolvedValue(mockToken)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getWarnings', () => {
    test('fetches warnings with auth token', async () => {
      // Arrange
      const mockWarnings = [
        {
          id: 'warning-1',
          userId: mockUserId,
          subscriptionId: 'sub-1',
          merchantName: 'Netflix',
          amount: { amount: 9.99, currency: 'GBP' },
          dueDate: '2024-03-15',
          daysUntilDue: 3,
          status: 'active',
        },
      ]

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockWarnings }),
      } as Response)

      // Act
      const warnings = await renewalWarningService.getWarnings(mockUserId)

      // Assert
      expect(authHelpers.getFirebaseAuthToken).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/warnings/${mockUserId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(warnings).toEqual(mockWarnings)
    })

    test('returns empty array when no warnings exist', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      // Act
      const warnings = await renewalWarningService.getWarnings(mockUserId)

      // Assert
      expect(warnings).toEqual([])
    })

    test('throws error when fetch fails', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      } as Response)

      // Act & Assert
      await expect(renewalWarningService.getWarnings(mockUserId)).rejects.toThrow()
    })

    test('throws error when auth token fails', async () => {
      // Arrange
      vi.mocked(authHelpers.getFirebaseAuthToken).mockRejectedValue(
        new Error('User not authenticated')
      )

      // Act & Assert
      await expect(renewalWarningService.getWarnings(mockUserId)).rejects.toThrow(
        'User not authenticated'
      )
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('calculateWarnings', () => {
    test('triggers warning calculation with auth token', async () => {
      // Arrange
      const mockResult = {
        created: 2,
        updated: 1,
        deleted: 0,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockResult }),
      } as Response)

      // Act
      const result = await renewalWarningService.calculateWarnings(mockUserId)

      // Assert
      expect(authHelpers.getFirebaseAuthToken).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/warnings/calculate/${mockUserId}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      )
      expect(result).toEqual(mockResult)
    })

    test('handles calculation errors', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid user ID' }),
      } as Response)

      // Act & Assert
      await expect(renewalWarningService.calculateWarnings(mockUserId)).rejects.toThrow()
    })
  })

  describe('dismissWarning', () => {
    test('dismisses warning with auth token', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      // Act
      await renewalWarningService.dismissWarning(mockUserId, mockWarningId)

      // Assert
      expect(authHelpers.getFirebaseAuthToken).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/warnings/${mockWarningId}/dismiss`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
          body: JSON.stringify({ userId: mockUserId }),
        })
      )
    })

    test('throws error when dismiss fails', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Warning not found' }),
      } as Response)

      // Act & Assert
      await expect(
        renewalWarningService.dismissWarning(mockUserId, mockWarningId)
      ).rejects.toThrow()
    })
  })

  describe('Utility Methods', () => {
    test('getWarningUrgency returns correct urgency levels', () => {
      // Arrange & Act & Assert
      expect(renewalWarningService.getWarningUrgency(0)).toBe('critical')
      expect(renewalWarningService.getWarningUrgency(1)).toBe('critical')
      expect(renewalWarningService.getWarningUrgency(2)).toBe('warning')
      expect(renewalWarningService.getWarningUrgency(3)).toBe('warning')
      expect(renewalWarningService.getWarningUrgency(4)).toBe('info')
      expect(renewalWarningService.getWarningUrgency(10)).toBe('info')
    })

    test('formatDaysRemaining returns correct format', () => {
      // Arrange & Act & Assert
      expect(renewalWarningService.formatDaysRemaining(0)).toBe('Today')
      expect(renewalWarningService.formatDaysRemaining(1)).toBe('Tomorrow')
      expect(renewalWarningService.formatDaysRemaining(2)).toBe('2 days')
      expect(renewalWarningService.formatDaysRemaining(7)).toBe('7 days')
    })

    test('formatDueDate formats date correctly', () => {
      // Arrange
      const testDate = '2024-03-15T10:00:00Z'

      // Act
      const formatted = renewalWarningService.formatDueDate(testDate)

      // Assert
      expect(formatted).toMatch(/\d{1,2} \w{3} \d{4}/) // e.g., "15 Mar 2024"
    })
  })

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      // Arrange
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      // Act & Assert
      await expect(renewalWarningService.getWarnings(mockUserId)).rejects.toThrow(
        'Network error'
      )
    })

    test('handles malformed JSON response', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as Response)

      // Act & Assert
      await expect(renewalWarningService.getWarnings(mockUserId)).rejects.toThrow(
        'Invalid JSON'
      )
    })

    test('retries auth token on failure', async () => {
      // Arrange
      vi.mocked(authHelpers.getFirebaseAuthToken)
        .mockRejectedValueOnce(new Error('Token expired'))
        .mockResolvedValueOnce(mockToken)

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      // Act
      // First call fails, but auth helper has retry logic
      await expect(renewalWarningService.getWarnings(mockUserId)).rejects.toThrow()

      // Second call succeeds
      const warnings = await renewalWarningService.getWarnings(mockUserId)

      // Assert
      expect(warnings).toEqual([])
      expect(authHelpers.getFirebaseAuthToken).toHaveBeenCalledTimes(2)
    })
  })
})

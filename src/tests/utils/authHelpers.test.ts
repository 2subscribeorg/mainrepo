import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { getFirebaseAuthToken, getFirebaseUser, isUserAuthenticated } from '@/utils/authHelpers'
import * as firebaseConfig from '@/config/firebase'

// Mock Firebase config
vi.mock('@/config/firebase', () => ({
  getFirebaseAuth: vi.fn(),
}))

describe('authHelpers', () => {
  let mockAuth: any
  let mockUser: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock user
    mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('mock-token-123'),
    }

    // Create mock auth
    mockAuth = {
      currentUser: mockUser,
    }

    // Setup default mock
    vi.mocked(firebaseConfig.getFirebaseAuth).mockReturnValue(mockAuth)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getFirebaseAuthToken', () => {
    test('returns token when user is authenticated', async () => {
      // Arrange - user already set in beforeEach

      // Act
      const token = await getFirebaseAuthToken()

      // Assert
      expect(token).toBe('mock-token-123')
      expect(mockUser.getIdToken).toHaveBeenCalledTimes(1)
    })

    test('retries and succeeds when user becomes available', async () => {
      // Arrange - user not available initially
      mockAuth.currentUser = null
      
      // User becomes available after first check
      setTimeout(() => {
        mockAuth.currentUser = mockUser
      }, 50)

      // Act
      const token = await getFirebaseAuthToken(3, 100)

      // Assert
      expect(token).toBe('mock-token-123')
      expect(mockUser.getIdToken).toHaveBeenCalledTimes(1)
    })

    test('throws error after max retries when user not authenticated', async () => {
      // Arrange
      mockAuth.currentUser = null

      // Act & Assert
      await expect(getFirebaseAuthToken(3, 50)).rejects.toThrow(
        'User not authenticated. Please sign in again.'
      )
    })

    test('throws error when getIdToken fails', async () => {
      // Arrange
      mockUser.getIdToken.mockRejectedValue(new Error('Token expired'))

      // Act & Assert
      await expect(getFirebaseAuthToken()).rejects.toThrow(
        'Failed to get authentication token. Please try again.'
      )
    })

    test('retries when getIdToken fails initially but succeeds later', async () => {
      // Arrange
      mockUser.getIdToken
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('mock-token-123')

      // Act
      const token = await getFirebaseAuthToken(3, 50)

      // Assert
      expect(token).toBe('mock-token-123')
      expect(mockUser.getIdToken).toHaveBeenCalledTimes(2)
    })

    test('uses custom retry parameters', async () => {
      // Arrange
      mockAuth.currentUser = null
      const startTime = Date.now()

      // Act & Assert
      await expect(getFirebaseAuthToken(2, 200)).rejects.toThrow()
      
      const elapsed = Date.now() - startTime
      // Should have waited at least 200ms (1 retry with 200ms delay)
      expect(elapsed).toBeGreaterThanOrEqual(200)
    })
  })

  describe('getFirebaseUser', () => {
    test('returns user when authenticated', async () => {
      // Arrange - user already set in beforeEach

      // Act
      const user = await getFirebaseUser()

      // Assert
      expect(user).toBe(mockUser)
      expect(user?.uid).toBe('test-user-123')
    })

    test('returns null when user not authenticated after retries', async () => {
      // Arrange
      mockAuth.currentUser = null

      // Act
      const user = await getFirebaseUser(3, 50)

      // Assert
      expect(user).toBeNull()
    })

    test('retries and returns user when user becomes available', async () => {
      // Arrange
      mockAuth.currentUser = null
      
      setTimeout(() => {
        mockAuth.currentUser = mockUser
      }, 50)

      // Act
      const user = await getFirebaseUser(3, 100)

      // Assert
      expect(user).toBe(mockUser)
    })

    test('returns user immediately if available on first check', async () => {
      // Arrange
      const startTime = Date.now()

      // Act
      const user = await getFirebaseUser(3, 100)

      // Assert
      expect(user).toBe(mockUser)
      const elapsed = Date.now() - startTime
      // Should not have waited since user was available immediately
      expect(elapsed).toBeLessThan(50)
    })
  })

  describe('isUserAuthenticated', () => {
    test('returns true when user is authenticated', async () => {
      // Arrange - user already set in beforeEach

      // Act
      const isAuth = await isUserAuthenticated()

      // Assert
      expect(isAuth).toBe(true)
    })

    test('returns false when user is not authenticated', async () => {
      // Arrange
      mockAuth.currentUser = null

      // Act
      const isAuth = await isUserAuthenticated(3, 50)

      // Assert
      expect(isAuth).toBe(false)
    })

    test('returns true when user becomes available after retry', async () => {
      // Arrange
      mockAuth.currentUser = null
      
      setTimeout(() => {
        mockAuth.currentUser = mockUser
      }, 50)

      // Act
      const isAuth = await isUserAuthenticated(3, 100)

      // Assert
      expect(isAuth).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    test('handles zero retries', async () => {
      // Arrange
      mockAuth.currentUser = null

      // Act & Assert
      await expect(getFirebaseAuthToken(0, 100)).rejects.toThrow()
    })

    test('handles very short retry delays', async () => {
      // Arrange
      mockAuth.currentUser = null

      // Act & Assert
      await expect(getFirebaseAuthToken(2, 1)).rejects.toThrow()
    })

    test('handles getFirebaseAuth throwing error', async () => {
      // Arrange
      vi.mocked(firebaseConfig.getFirebaseAuth).mockImplementation(() => {
        throw new Error('Firebase not initialized')
      })

      // Act & Assert
      await expect(getFirebaseAuthToken()).rejects.toThrow('Firebase not initialized')
    })
  })
})

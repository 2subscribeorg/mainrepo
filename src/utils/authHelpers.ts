import { getFirebaseAuth } from '@/config/firebase'

/**
 * Centralized helper to get Firebase auth token with retry logic
 * This prevents Firebase auth timing issues across all composables
 * 
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryDelay - Delay between retries in ms (default: 100)
 * @returns Firebase ID token
 * @throws Error if user is not authenticated after retries
 */
export async function getFirebaseAuthToken(
  maxRetries: number = 3,
  retryDelay: number = 100
): Promise<string> {
  const auth = getFirebaseAuth()
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const user = auth.currentUser
    
    if (user) {
      try {
        return await user.getIdToken()
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw new Error('Failed to get authentication token. Please try again.')
        }
      }
    }
    
    // Wait before retry (except on last attempt)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
  
  throw new Error('User not authenticated. Please sign in again.')
}

/**
 * Get current Firebase user with retry logic
 * Useful for checking auth state before making requests
 * 
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryDelay - Delay between retries in ms (default: 100)
 * @returns Firebase User object or null
 */
export async function getFirebaseUser(
  maxRetries: number = 3,
  retryDelay: number = 100
) {
  const auth = getFirebaseAuth()
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const user = auth.currentUser
    
    if (user) {
      return user
    }
    
    // Wait before retry (except on last attempt)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
  
  return null
}

/**
 * Check if user is authenticated with retry logic
 * 
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryDelay - Delay between retries in ms (default: 100)
 * @returns true if authenticated, false otherwise
 */
export async function isUserAuthenticated(
  maxRetries: number = 3,
  retryDelay: number = 100
): Promise<boolean> {
  const user = await getFirebaseUser(maxRetries, retryDelay)
  return user !== null
}

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User as FirebaseUser } from 'firebase/auth'
import { rateLimiter, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'
import { authRateLimiter } from '@/utils/authRateLimiter'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth'
import { getFirebaseAuth, getFirebaseDb } from '@/config/firebase'
import { syncUserToFirestore, createUserProfile } from '@/services/UserSyncService'
import { emailVerificationService } from '@/services/EmailVerificationService'
import { useLoadingStates } from '@/composables/useLoadingStates'
import { logger } from '@/utils/logger'

/**
 * SECURITY: Secure error message handler for authentication
 * Prevents information disclosure about user existence
 */
function getSecureAuthMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Firebase auth error codes that reveal user existence
    const userExistenceErrors = [
      'auth/user-not-found',
      'auth/wrong-password', 
      'auth/email-already-in-use',
      'auth/user-disabled',
      'auth/invalid-credential'
    ]
    
    // Check if error reveals user existence
    const revealsUserExistence = userExistenceErrors.some(errCode => 
      message.includes(errCode.toLowerCase())
    )
    
    if (revealsUserExistence) {
      // Return generic message that doesn't reveal if user exists
      return 'Invalid email or password. Please try again.'
    }
    
    // Handle other Firebase auth errors generically
    if (message.includes('auth/invalid-email')) {
      return 'Invalid email address. Please check and try again.'
    }
    
    if (message.includes('auth/weak-password')) {
      return 'Password does not meet security requirements.'
    }
    
    if (message.includes('auth/too-many-requests')) {
      return 'Too many attempts. Please try again later.'
    }
    
    if (message.includes('auth/network-request-failed')) {
      return 'Network error. Please check your connection and try again.'
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }
  }
  
  // Fallback for any other errors
  return 'Authentication failed. Please try again.'
}

export interface User {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
  emailVerified?: boolean
  role?: string
  permissions?: string[]
}

const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'

export const useAuthStore = defineStore('auth', () => {
  // Initialize with mock user for MOCK mode only
  const user = ref<User | null>(
    isFirebaseMode ? null : {
      id: 'mock-user-1',
      name: 'Demo User',
      email: 'demo@2subscribe.app',
      isSuperAdmin: false,
    }
  )

  const error = ref<string | null>(null)
  
  // Consolidated loading states
  const { withLoading, isLoading } = useLoadingStates()
  const loading = isLoading('auth')

  const isAuthenticated = computed(() => user.value !== null)
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin || false)
  const userId = computed(() => user.value?.id || null)
  const userEmail = computed(() => user.value?.email || undefined)

  // Track if listener has been initialized to prevent duplicates
  const listenerInitialized = ref(false)
  
  // Track initial auth state resolution
  const initialAuthCheckComplete = ref(false)
  const initialAuthCheckPromise = ref<Promise<void> | null>(null)
  const initialAuthCheckResolver = ref<(() => void) | null>(null)
  
  // Track pending auth state changes with promises
  // Key is user ID (or 'null' for sign out), value is resolver function
  const authStateResolvers = ref(new Map<string, (user: User | null) => void>())

  /**
   * Initialize Firebase auth listener
   * Automatically updates user state when auth changes
   * Safe to call multiple times - only initializes once
   */
  function initAuthListener() {
    if (!isFirebaseMode) {
      // In mock mode, auth check is immediately complete
      initialAuthCheckComplete.value = true
      if (initialAuthCheckResolver.value) {
        initialAuthCheckResolver.value()
      }
      return
    }
    
    // Prevent multiple listener registrations
    if (listenerInitialized.value) {
      logger.debug('Auth listener already initialized, skipping')
      return
    }

    // Create promise to track initial auth check
    if (!initialAuthCheckPromise.value) {
      initialAuthCheckPromise.value = new Promise((resolve) => {
        initialAuthCheckResolver.value = resolve
      })
    }

    logger.debug('Initializing Firebase auth listener...')
    const auth = getFirebaseAuth()
    onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        logger.debug('Auth state changed', { uid: firebaseUser ? firebaseUser.uid : 'null' })
        
        if (firebaseUser) {
          try {
            // Get ID token with timeout to prevent hanging
            // Use Promise.race to implement timeout
            logger.debug('Fetching ID token and custom claims...')
            const idTokenPromise = firebaseUser.getIdTokenResult()
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Token fetch timeout')), 5000)
            )
            
            const idTokenResult = await Promise.race([idTokenPromise, timeoutPromise]) as any
            const customClaims = idTokenResult.claims
            logger.debug('Custom claims received', { claims: customClaims })
            
            // Determine user role from custom claims
            let role = 'user'
            if (customClaims.admin === true && customClaims.superAdmin === true) {
              role = 'superAdmin'
            } else if (customClaims.admin === true) {
              role = 'admin'
            }

            user.value = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              isSuperAdmin: customClaims.admin === true && customClaims.superAdmin === true,
              emailVerified: firebaseUser.emailVerified,
              role,
              permissions: customClaims.permissions as string[] || [],
            }
            logger.debug('User object created successfully')
          } catch (err) {
            // If getting custom claims fails, create basic user object
            logger.warn('Failed to get custom claims, using basic auth', { error: err })
            user.value = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              isSuperAdmin: false,
              emailVerified: firebaseUser.emailVerified,
              role: 'user',
              permissions: [],
            }
          }
          
          // Resolve any pending promises waiting for this user
          // This MUST happen even if custom claims failed
          logger.debug('Looking for resolver for user', { uid: firebaseUser.uid })
          const resolver = authStateResolvers.value.get(firebaseUser.uid)
          if (resolver && user.value) {
            logger.debug('Resolver found, calling it with user data')
            resolver(user.value)
            authStateResolvers.value.delete(firebaseUser.uid)
            logger.success('Resolver completed successfully')
          } else {
            if (!resolver) {
              logger.debug('No resolver found for this user - likely already authenticated or page refresh')
            }
          }
          
          // Sync user to Firestore in the background (non-blocking)
          syncUserToFirestore(firebaseUser).catch((err) => {
            logger.error('Failed to sync user to Firestore', { error: err })
          })
        } else {
          user.value = null
          
          // Resolve any pending promises waiting for sign out
          const resolver = authStateResolvers.value.get('null')
          if (resolver) {
            resolver(null)
            authStateResolvers.value.delete('null')
          }
        }
        
        // Mark initial auth check as complete on first state change
        if (!initialAuthCheckComplete.value) {
          initialAuthCheckComplete.value = true
          if (initialAuthCheckResolver.value) {
            logger.debug('Initial auth check complete')
            initialAuthCheckResolver.value()
            initialAuthCheckResolver.value = null
          }
        }
      } catch (error) {
        logger.error('Critical error in auth state listener', { error })
        // Even on error, try to resolve pending promises to avoid hanging
        if (firebaseUser) {
          const resolver = authStateResolvers.value.get(firebaseUser.uid)
          if (resolver) {
            logger.warn('Rejecting pending resolver due to auth listener error')
            authStateResolvers.value.delete(firebaseUser.uid)
            // Call resolver with null so the waiting promise rejects cleanly
            resolver(null)
          }
        }
        
        // Complete initial auth check even on error
        if (!initialAuthCheckComplete.value) {
          initialAuthCheckComplete.value = true
          if (initialAuthCheckResolver.value) {
            logger.warn('Initial auth check completed with error')
            initialAuthCheckResolver.value()
            initialAuthCheckResolver.value = null
          }
        }
      }
    })
    
    listenerInitialized.value = true
    logger.success('Firebase auth listener initialized successfully')
  }

  /**
   * Sign in with email and password
   */
  async function signIn(email: string, password: string): Promise<User> {
    const rateLimitCheck = authRateLimiter.canAttemptLogin(email)
    if (!rateLimitCheck.allowed) {
      error.value = rateLimitCheck.message || 'Too many login attempts'
      throw new Error(rateLimitCheck.message)
    }

    if (!isFirebaseMode) {
      return await withLoading('auth', async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        const mockUser: User = {
          id: 'mock-user-1',
          name: 'Demo User',
          email: email,
          isSuperAdmin: email === 'admin@2subscribe.app'
        }
        user.value = mockUser
        return mockUser
      })
    }

    if (!listenerInitialized.value) {
      initAuthListener()
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return await withLoading('auth', async () => {
      error.value = null

      try {
        const auth = getFirebaseAuth()
        logger.debug('Attempting sign in with Firebase...')
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        logger.debug('Firebase sign in successful, waiting for auth state update...')
        
        return new Promise<User>((resolve, reject) => {
          authStateResolvers.value.set(userCredential.user.uid, (updatedUser) => {
            if (updatedUser) {
              authRateLimiter.recordLoginAttempt(email, true)
              logger.success('Sign in complete with user data')
              resolve(updatedUser)
            } else {
              reject(new Error('Failed to get user data after sign in'))
            }
          })
          
          setTimeout(() => {
            if (user.value && user.value.id === userCredential.user.uid) {
              if (authStateResolvers.value.has(userCredential.user.uid)) {
                authRateLimiter.recordLoginAttempt(email, true)
                authStateResolvers.value.delete(userCredential.user.uid)
                resolve(user.value)
              }
            }
          }, 100)
          
          setTimeout(() => {
            if (authStateResolvers.value.has(userCredential.user.uid)) {
              authStateResolvers.value.delete(userCredential.user.uid)
              logger.error('Sign in timed out', { 
                currentUserId: user.value?.id, 
                expectedUserId: userCredential.user.uid 
              })
              reject(new Error('Sign in timeout - please try again'))
            }
          }, 15000)
        })
      } catch (e) {
        authRateLimiter.recordLoginAttempt(email, false)
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        logger.error('Sign in failed', { error: e })
        throw new Error(secureMessage)
      }
    })
  }

  /**
   * Sign up with email and password
   */
  async function signUp(email: string, password: string, sendVerification = false): Promise<{ success: boolean; needsVerification: boolean; user?: User }> {
    const rateLimitKey = `signup:${email}`
    if (!rateLimiter.check(rateLimitKey, RATE_LIMITS.SIGNUP.maxAttempts, RATE_LIMITS.SIGNUP.windowMs)) {
      const message = getRateLimitMessage(rateLimitKey, RATE_LIMITS.SIGNUP)
      error.value = message
      throw new Error(message)
    }

    if (!isFirebaseMode) {
      return await withLoading('auth', async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        const mockUser: User = {
          id: 'mock-user-2',
          name: 'New Demo User',
          email: email,
          isSuperAdmin: false
        }
        user.value = mockUser
        return { success: true, needsVerification: false, user: mockUser }
      })
    }

    return await withLoading('auth', async () => {
      error.value = null

      try {
        const auth = getFirebaseAuth()
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        await createUserProfile(userCredential.user)
        
        if (sendVerification) {
          await emailVerificationService.sendVerificationEmail(userCredential.user)
          await signOut(auth)
          return { success: true, needsVerification: true }
        }
        
        if (user.value && user.value.id === userCredential.user.uid) {
          return { success: true, needsVerification: false, user: user.value }
        }

        return new Promise((resolve, reject) => {
          authStateResolvers.value.set(userCredential.user.uid, (updatedUser) => {
            if (updatedUser) {
              resolve({ success: true, needsVerification: false, user: updatedUser })
            } else {
              reject(new Error('Failed to get user data after sign up'))
            }
          })
          
          setTimeout(() => {
            if (authStateResolvers.value.has(userCredential.user.uid)) {
              authStateResolvers.value.delete(userCredential.user.uid)
              if (user.value && user.value.id === userCredential.user.uid) {
                resolve({ success: true, needsVerification: false, user: user.value })
              } else {
                reject(new Error('Sign up timeout - please try again'))
              }
            }
          }, 10000)
        })
      } catch (e) {
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        throw new Error(secureMessage)
      }
    })
  }

  /**
   * Sign out
   */
  async function logout() {
    if (!isFirebaseMode) {
      user.value = null
      return
    }

    return await withLoading('auth', async () => {
      error.value = null
      try {
        const auth = getFirebaseAuth()
        await signOut(auth)
        user.value = null
        // Clear resolvers on logout
        authStateResolvers.value.clear()
      } catch (e) {
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        throw new Error(secureMessage)
      }
    })
  }

  /**
   * Send password reset email
   */
  async function sendPasswordReset(email: string) {
    const rateLimitKey = `password-reset:${email}`
    if (!rateLimiter.check(rateLimitKey, RATE_LIMITS.PASSWORD_RESET.maxAttempts, RATE_LIMITS.PASSWORD_RESET.windowMs)) {
      const message = getRateLimitMessage(rateLimitKey, RATE_LIMITS.PASSWORD_RESET)
      return { success: false, message }
    }

    if (!isFirebaseMode) {
      return { success: false, message: 'Password reset not available in Mock mode' }
    }

    return await withLoading('auth', async () => {
      error.value = null
      try {
        const auth = getFirebaseAuth()
        await sendPasswordResetEmail(auth, email)
        return { success: true, message: 'Password reset email sent' }
      } catch (e) {
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        return { success: false, message: secureMessage }
      }
    })
  }

  /**
   * Reauthenticate user
   */
  async function reauthenticate(currentPassword: string) {
    if (!isFirebaseMode) {
      return { success: false, message: 'Reauthentication not available in Mock mode' }
    }

    try {
      const auth = getFirebaseAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser || !currentUser.email) {
        throw new Error('No user logged in')
      }

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
      await reauthenticateWithCredential(currentUser, credential)
      return { success: true, message: 'Reauthentication successful' }
    } catch (e) {
      const secureMessage = getSecureAuthMessage(e)
      return { success: false, message: secureMessage }
    }
  }

  /**
   * Change user email
   */
  async function changeEmail(newEmail: string, currentPassword: string) {
    if (!isFirebaseMode) {
      return { success: false, message: 'Email change not available in Mock mode' }
    }

    return await withLoading('auth', async () => {
      error.value = null
      try {
        const auth = getFirebaseAuth()
        const currentUser = auth.currentUser
        
        if (!currentUser || !currentUser.email) {
          throw new Error('No authenticated user found')
        }

        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
        await reauthenticateWithCredential(currentUser, credential)
        
        await firebaseUpdateEmail(currentUser, newEmail)
        
        if (user.value) {
          user.value.email = newEmail
        }
        
        return { success: true, message: 'Email updated successfully' }
      } catch (e) {
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        return { success: false, message: secureMessage }
      }
    })
  }

  /**
   * Change user password
   */
  async function changePassword(currentPassword: string, newPassword: string) {
    const rateLimitKey = `password-change:${user.value?.id || 'unknown'}`
    if (!rateLimiter.check(rateLimitKey, RATE_LIMITS.PASSWORD_CHANGE.maxAttempts, RATE_LIMITS.PASSWORD_CHANGE.windowMs)) {
      const message = getRateLimitMessage(rateLimitKey, RATE_LIMITS.PASSWORD_CHANGE)
      return { success: false, message }
    }

    if (!isFirebaseMode) {
      return { success: false, message: 'Password change not available in Mock mode' }
    }

    return await withLoading('auth', async () => {
      error.value = null
      try {
        if (newPassword.length < 8) {
          return { success: false, message: 'Password must be at least 8 characters long' }
        }
        
        const hasUpperCase = /[A-Z]/.test(newPassword)
        const hasLowerCase = /[a-z]/.test(newPassword)
        const hasNumber = /[0-9]/.test(newPassword)
        
        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
          return { 
            success: false, 
            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
          }
        }
        
        const reauth = await reauthenticate(currentPassword)
        if (!reauth.success) {
          throw new Error(reauth.message)
        }

        const auth = getFirebaseAuth()
        const currentUser = auth.currentUser
        
        if (!currentUser) {
          throw new Error('No user logged in')
        }

        await firebaseUpdatePassword(currentUser, newPassword)
        await currentUser.getIdToken(true)
        
        return { success: true, message: 'Password updated successfully' }
      } catch (e) {
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        return { success: false, message: secureMessage }
      }
    })
  }

  /**
   * Delete user account
   */
  async function deleteAccount(currentPassword: string) {
    if (!isFirebaseMode) {
      user.value = null
      return { success: true, message: 'Account deleted (Mock)' }
    }

    return await withLoading('auth', async () => {
      error.value = null
      try {
        const reauth = await reauthenticate(currentPassword)
        if (!reauth.success) {
          throw new Error(reauth.message)
        }

        const auth = getFirebaseAuth()
        const currentUser = auth.currentUser
        
        if (!currentUser) {
          throw new Error('No user logged in')
        }

        const userIdToDelete = currentUser.uid
        const db = getFirebaseDb()
        const collections = ['subscriptions', 'transactions', 'categories', 'bankAccounts', 'bankConnections']
        
        for (const collectionName of collections) {
          const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore')
          const q = query(collection(db, collectionName), where('userId', '==', userIdToDelete))
          const snapshot = await getDocs(q)
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
          await Promise.all(deletePromises)
        }

        await deleteUser(currentUser)
        user.value = null
        
        return { success: true, message: 'Account deleted successfully' }
      } catch (e) {
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        return { success: false, message: secureMessage }
      }
    })
  }

  /**
   * Toggle super admin (Mock mode only)
   */
  function toggleSuperAdmin() {
    if (user.value) {
      user.value.isSuperAdmin = !user.value.isSuperAdmin
    }
  }

  /**
   * Wait for initial auth state check to complete
   */
  async function waitForInitialAuthCheck(): Promise<void> {
    if (initialAuthCheckComplete.value) {
      return Promise.resolve()
    }
    
    if (!initialAuthCheckPromise.value) {
      initialAuthCheckPromise.value = new Promise((resolve) => {
        initialAuthCheckResolver.value = resolve
      })
    }
    
    return Promise.race([
      initialAuthCheckPromise.value,
      new Promise<void>((resolve) => setTimeout(resolve, 8000))
    ])
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isSuperAdmin,
    userId,
    userEmail,
    initAuthListener,
    waitForInitialAuthCheck,
    signIn,
    signUp,
    logout,
    sendPasswordReset,
    changeEmail,
    changePassword,
    deleteAccount,
    toggleSuperAdmin,
  }
})

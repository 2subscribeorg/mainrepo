import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User as FirebaseUser } from 'firebase/auth'
import { rateLimiter, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'
import { authRateLimiter } from '@/utils/authRateLimiter'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  multiFactor,
  type MultiFactorResolver,
  type MultiFactorInfo,
  type ApplicationVerifier,
} from 'firebase/auth'
import { getFirebaseAuth, getFirebaseDb } from '@/config/firebase'
import { syncUserToFirestore, createUserProfile } from '@/services/UserSyncService'
import { emailVerificationService } from '@/services/EmailVerificationService'
import { passwordResetService } from '@/services/PasswordResetService'
import { useLoadingStates } from '@/composables/useLoadingStates'
import { logger } from '@/utils/logger'
import { revenueCat } from '@/services/revenueCat'

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
  let listenerInitialized = false
  
  // Track initial auth state resolution
  let initialAuthCheckComplete = false
  let initialAuthCheckPromise: Promise<void> | null = null
  let initialAuthCheckResolver: (() => void) | null = null
  
  // Track pending auth state changes with promises
  // Key is user ID (or 'null' for sign out), value is resolver function
  const authStateResolvers = new Map<string, (user: User | null) => void>()

  const pendingMfaResolver = ref<MultiFactorResolver | null>(null)
  const pendingMfaVerificationId = ref<string | null>(null)
  const pendingEnrollVerificationId = ref<string | null>(null)

  /**
   * Initialize Firebase auth listener
   * Automatically updates user state when auth changes
   * Safe to call multiple times - only initializes once
   */
  function initAuthListener() {
    if (!isFirebaseMode) {
      // In mock mode, auth check is immediately complete
      initialAuthCheckComplete = true
      if (initialAuthCheckResolver) {
        initialAuthCheckResolver()
      }
      return
    }
    
    // Prevent multiple listener registrations
    if (listenerInitialized) {
      logger.debug('Auth listener already initialized, skipping')
      return
    }

    // Create promise to track initial auth check
    if (!initialAuthCheckPromise) {
      initialAuthCheckPromise = new Promise((resolve) => {
        initialAuthCheckResolver = resolve
      })
    }

    logger.debug('Initializing Firebase auth listener...')
    const auth = getFirebaseAuth()
    onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        logger.debug(`Auth state changed, firebaseUser: ${firebaseUser ? firebaseUser.uid : 'null'}`)
        
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
            logger.debug('Custom claims received:', customClaims)
            
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
            // Configure RevenueCat here
            await revenueCat.configure(firebaseUser.uid)
          } catch (err) {
            // If getting custom claims fails, create basic user object
            logger.warn('Failed to get custom claims, using basic auth:', err)
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
          logger.debug(`Looking for resolver for user: ${firebaseUser.uid}`)
          const resolver = authStateResolvers.get(firebaseUser.uid)
          if (resolver && user.value) {
            logger.debug('Resolver found, calling it with user data')
            resolver(user.value)
            authStateResolvers.delete(firebaseUser.uid)
            logger.success('Resolver completed successfully')
          } else {
            if (!resolver) {
              logger.debug('No resolver found for this user - likely already authenticated or page refresh')
            }
            if (!user.value) {
              logger.warn('User value not set, cannot resolve')
            }
          }
          
          // Sync user to Firestore in the background (non-blocking)
          // Don't await this to avoid delaying sign-in completion
          syncUserToFirestore(firebaseUser).catch((err) => {
            logger.error('Failed to sync user to Firestore:', err)
          })
        } else {
          user.value = null
          
          // Resolve any pending promises waiting for sign out
          const resolver = authStateResolvers.get('null')
          if (resolver) {
            resolver(null)
            authStateResolvers.delete('null')
          }
        }
        
        // Mark initial auth check as complete on first state change
        if (!initialAuthCheckComplete) {
          initialAuthCheckComplete = true
          if (initialAuthCheckResolver) {
            logger.debug('Initial auth check complete')
            initialAuthCheckResolver()
            initialAuthCheckResolver = null
          }
        }
      } catch (error) {
        logger.error('Critical error in auth state listener:', error)
        // Even on error, try to resolve pending promises to avoid hanging
        if (firebaseUser) {
          const resolver = authStateResolvers.get(firebaseUser.uid)
          if (resolver) {
            logger.warn('Rejecting pending resolver due to auth listener error')
            authStateResolvers.delete(firebaseUser.uid)
            // Call resolver with null so the waiting promise rejects cleanly
            resolver(null)
          }
        }
        
        // Complete initial auth check even on error
        if (!initialAuthCheckComplete) {
          initialAuthCheckComplete = true
          if (initialAuthCheckResolver) {
            logger.warn('Initial auth check completed with error')
            initialAuthCheckResolver()
            initialAuthCheckResolver = null
          }
        }
      }
    })
    
    listenerInitialized = true
    logger.success('Firebase auth listener initialized successfully')
  }

  /**
   * Sign in with email and password (Firebase only)
   * Returns a promise that resolves when auth state is updated
   */
  async function signIn(email: string, password: string): Promise<User> {
    // Enhanced rate limiting with progressive lockout - prevent brute force attacks
    const rateLimitCheck = authRateLimiter.canAttemptLogin(email)
    if (!rateLimitCheck.allowed) {
      error.value = rateLimitCheck.message || 'Too many login attempts'
      throw new Error(rateLimitCheck.message)
    }

    if (!isFirebaseMode) {
      // Mock mode - simulate delay and return mock user
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

    // Ensure auth listener is initialized before attempting sign in
    if (!listenerInitialized) {
      logger.warn('Auth listener not initialized, initializing now...')
      initAuthListener()
      // Give listener a moment to set up
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return await withLoading('auth', async () => {
      error.value = null

      try {
        const auth = getFirebaseAuth()
        logger.debug('Attempting sign in with Firebase...')
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        logger.debug('Firebase sign in successful, waiting for auth state update...')
        
        // Return promise that resolves when onAuthStateChanged fires
        return new Promise<User>((resolve, reject) => {
          // Set up resolver FIRST, before any async operations
          authStateResolvers.set(userCredential.user.uid, (updatedUser) => {
            if (updatedUser) {
              // Record successful login
              authRateLimiter.recordLoginAttempt(email, true)
              logger.success('Sign in complete with user data')
              resolve(updatedUser)
            } else {
              reject(new Error('Failed to get user data after sign in'))
            }
          })
          
          // Use nextTick to check if auth state already updated (handles race condition)
          setTimeout(() => {
            // Check if user is already in store (auth state already updated)
            // This handles race condition where onAuthStateChanged fires very quickly
            if (user.value && user.value.id === userCredential.user.uid) {
              logger.debug('User already in store from auth state change, resolving immediately')
              if (authStateResolvers.has(userCredential.user.uid)) {
                authRateLimiter.recordLoginAttempt(email, true)
                authStateResolvers.delete(userCredential.user.uid)
                resolve(user.value)
              }
            }
          }, 100) // Give auth state listener 100ms to fire
          
          // Timeout after 15 seconds to prevent hanging
          // Increased from 10s to accommodate token fetching timeout (5s) + buffer
          setTimeout(() => {
            if (authStateResolvers.has(userCredential.user.uid)) {
              authStateResolvers.delete(userCredential.user.uid)
              logger.error('Sign in timed out - auth state listener did not respond in time')
              logger.error('Current user value:', user.value)
              logger.error('Expected user ID:', userCredential.user.uid)
              reject(new Error('Sign in timeout - please try again'))
            }
          }, 15000)
        })
      } catch (e: unknown) {
        if ((e as any)?.code === 'auth/multi-factor-auth-required') {
          pendingMfaResolver.value = getMultiFactorResolver(getFirebaseAuth(), e as any)
          const mfaErr = new Error('MFA_REQUIRED')
          ;(mfaErr as any).code = 'MFA_REQUIRED'
          throw mfaErr
        }

        // Record failed login attempt
        authRateLimiter.recordLoginAttempt(email, false)

        // SECURITY: Never expose Firebase error messages that reveal user existence
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        logger.error('Sign in failed:', e)
        throw new Error(secureMessage)
      }
    })
  }

  /**
   * Sign up with email and password (Firebase only)
   * Optionally sends email verification if sendVerification is true
   * Returns a promise that resolves when auth state is updated
   */
  async function signUp(email: string, password: string, sendVerification = false): Promise<{ success: boolean; needsVerification: boolean; user?: User }> {
    // Rate limiting - prevent signup spam
    const rateLimitKey = `signup:${email}`
    if (!rateLimiter.check(rateLimitKey, RATE_LIMITS.SIGNUP.maxAttempts, RATE_LIMITS.SIGNUP.windowMs)) {
      const message = getRateLimitMessage(rateLimitKey, RATE_LIMITS.SIGNUP)
      error.value = message
      throw new Error(message)
    }

    if (!isFirebaseMode) {
      // Mock mode - simulate delay and return success
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
        
        // Create user profile in Firestore
        await createUserProfile(userCredential.user)
        
        // Send verification email if requested
        if (sendVerification) {
          const verificationResult = await emailVerificationService.sendVerificationEmail(userCredential.user)
          if (!verificationResult.success) {
            throw new Error(verificationResult.error || 'Failed to send verification email')
          }

          // Keep the session active so the verification screen can reload/resend.
          // Route guards prevent access to the app until emailVerified becomes true.
          return { success: true, needsVerification: true }
        }
        
        // onAuthStateChanged fires immediately after createUserWithEmailAndPassword,
        // which means it may have already run BEFORE we get here (after awaiting
        // createUserProfile). Check if user state is already set to avoid a
        // race condition that causes the 10-second timeout every time.
        if (user.value && user.value.id === userCredential.user.uid) {
          return { success: true, needsVerification: false, user: user.value }
        }

        // Return promise that resolves when onAuthStateChanged fires
        return new Promise((resolve, reject) => {
          authStateResolvers.set(userCredential.user.uid, (updatedUser) => {
            if (updatedUser) {
              resolve({ success: true, needsVerification: false, user: updatedUser })
            } else {
              reject(new Error('Failed to get user data after sign up'))
            }
          })
          
          // Timeout after 10 seconds to prevent hanging
          setTimeout(() => {
            if (authStateResolvers.has(userCredential.user.uid)) {
              authStateResolvers.delete(userCredential.user.uid)
              // Last-chance check: user may be set even if resolver was missed
              if (user.value && user.value.id === userCredential.user.uid) {
                resolve({ success: true, needsVerification: false, user: user.value })
              } else {
                reject(new Error('Sign up timeout - please try again'))
              }
            }
          }, 10000)
        })
      } catch (e) {
        // SECURITY: Never expose Firebase error messages that reveal user existence
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        throw new Error(secureMessage)
      }
    })
  }

  /**
   * Sign out (Firebase only)
   */
  async function logout() {
    if (!isFirebaseMode) {
      return
    }

    return await withLoading('auth', async () => {
      error.value = null
      try {
        const auth = getFirebaseAuth()
        await signOut(auth)
        await revenueCat.logOut()
        user.value = null
      } catch (e) {
        // SECURITY: Never expose Firebase error messages
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        throw new Error(secureMessage)
      }
    })
  }

  /**
   * Send password reset email (Firebase only)
   */
  async function sendPasswordReset(email: string) {
    // Rate limiting - prevent password reset spam
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
        const result = await passwordResetService.sendPasswordResetEmail(email)
        if (!result.success) {
          error.value = result.message
        }
        return result
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to send password reset email'
        error.value = message
        return { success: false, message }
      }
    })
  }

  /**
   * Reauthenticate user (needed before changing email/password)
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
      // SECURITY: Never expose Firebase error messages
      const secureMessage = getSecureAuthMessage(e)
      return { success: false, message: secureMessage }
    }
  }

  /**
   * Change user email (Firebase only, requires reauthentication)
   */
  async function changeEmail(newEmail: string, currentPassword: string) {
    if (!isFirebaseMode) {
      return { success: false, message: 'Email change not available in Mock mode' }
    }

    return await withLoading('auth', async () => {
      error.value = null
      try {
        // Reauthenticate first (Firebase security requirement)
        const auth = getFirebaseAuth()
        const currentUser = auth.currentUser
        
        if (!currentUser || !currentUser.email) {
          throw new Error('No authenticated user found')
        }

        // Reauthenticate with current password
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
        await reauthenticateWithCredential(currentUser, credential)
        
        // Update email
        await firebaseUpdateEmail(currentUser, newEmail)
        
        // Update user state
        if (user.value) {
          user.value.email = newEmail
        }
        
        return { success: true, message: 'Email updated successfully' }
      } catch (e) {
        // SECURITY: Never expose Firebase error messages
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        return { success: false, message: secureMessage }
      }
    })
  }

  /**
   * Change user password (Firebase only, requires reauthentication)
   */
  async function changePassword(currentPassword: string, newPassword: string) {
    // Rate limiting - prevent password change abuse
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
        
        // Validate new password strength (Firebase minimum is 6, but we enforce 8)
        if (newPassword.length < 8) {
          return { success: false, message: 'Password must be at least 8 characters long' }
        }
        
        // Additional password strength checks
        const hasUpperCase = /[A-Z]/.test(newPassword)
        const hasLowerCase = /[a-z]/.test(newPassword)
        const hasNumber = /[0-9]/.test(newPassword)
        
        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
          return { 
            success: false, 
            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
          }
        }
        
        // Reauthenticate first (Firebase security requirement)
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
        
        // Force token refresh to ensure new credentials are active
        await currentUser.getIdToken(true)
        
        return { success: true, message: 'Password updated successfully' }
      } catch (e) {
        // SECURITY: Never expose Firebase error messages
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        return { success: false, message: secureMessage }
      }
    })
  }

  /**
   * Delete user account and all associated data (Firebase only)
   */
  async function deleteAccount(currentPassword: string) {
    if (!isFirebaseMode) {
      return { success: false, message: 'Account deletion not available in Mock mode' }
    }

    return await withLoading('auth', async () => {
      error.value = null
      try {
        // Reauthenticate first (Firebase security requirement)
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

        // Delete all user data from Firestore
        const db = getFirebaseDb()
        
        // Delete user's collections
        const collections = ['subscriptions', 'transactions', 'categories', 'bankAccounts', 'bankConnections']
        
        for (const collectionName of collections) {
          const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore')
          const q = query(collection(db, collectionName), where('userId', '==', userIdToDelete))
          const snapshot = await getDocs(q)
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
      }

      // Delete the Firebase Auth user account
      await deleteUser(currentUser)
      
      // Clear local state
      await revenueCat.logOut()
      user.value = null
      
        return { success: true, message: 'Account deleted successfully' }
      } catch (e) {
        // SECURITY: Never expose Firebase error messages
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
   * This is used by route guards to prevent redirecting before Firebase has checked for an existing session
   */
  async function waitForInitialAuthCheck(): Promise<void> {
    if (initialAuthCheckComplete) {
      return Promise.resolve()
    }
    
    if (!initialAuthCheckPromise) {
      // Create the promise if it doesn't exist yet
      initialAuthCheckPromise = new Promise((resolve) => {
        initialAuthCheckResolver = resolve
      })
    }
    
    // Wait up to 8 seconds for Firebase to confirm auth state.
    // 2 seconds was too short for cold Railway/Firebase connections.
    return Promise.race([
      initialAuthCheckPromise,
      new Promise<void>((resolve) => setTimeout(resolve, 8000))
    ])
  }

  async function sendMfaChallengeCode(appVerifier: ApplicationVerifier): Promise<void> {
    if (!pendingMfaResolver.value) throw new Error('No pending MFA challenge')
    const auth = getFirebaseAuth()
    const phoneAuthProvider = new PhoneAuthProvider(auth)
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      {
        multiFactorHint: pendingMfaResolver.value.hints[0],
        session: pendingMfaResolver.value.session,
      },
      appVerifier
    )
    pendingMfaVerificationId.value = verificationId
  }

  async function completeMfaSignIn(otp: string): Promise<User> {
    if (!pendingMfaResolver.value || !pendingMfaVerificationId.value) {
      throw new Error('No pending MFA sign-in')
    }
    const credential = PhoneAuthProvider.credential(pendingMfaVerificationId.value, otp)
    const assertion = PhoneMultiFactorGenerator.assertion(credential)
    const result = await pendingMfaResolver.value.resolveSignIn(assertion)

    pendingMfaResolver.value = null
    pendingMfaVerificationId.value = null

    return new Promise<User>((resolve, reject) => {
      authStateResolvers.set(result.user.uid, (updatedUser) => {
        if (updatedUser) resolve(updatedUser)
        else reject(new Error('Failed to get user data after MFA sign-in'))
      })
      setTimeout(() => {
        if (authStateResolvers.has(result.user.uid)) {
          authStateResolvers.delete(result.user.uid)
          if (user.value) resolve(user.value)
          else reject(new Error('MFA sign-in timeout'))
        }
      }, 15000)
    })
  }

  async function sendMfaEnrollmentCode(phoneNumber: string, appVerifier: ApplicationVerifier): Promise<void> {
    const auth = getFirebaseAuth()
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No authenticated user')

    const multiFactorUser = multiFactor(currentUser)
    const session = await multiFactorUser.getSession()

    const phoneAuthProvider = new PhoneAuthProvider(auth)
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      { phoneNumber, session },
      appVerifier
    )
    pendingEnrollVerificationId.value = verificationId
  }

  async function completeMfaEnrollment(otp: string): Promise<void> {
    if (!pendingEnrollVerificationId.value) throw new Error('No pending MFA enrollment')
    const auth = getFirebaseAuth()
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No authenticated user')

    const credential = PhoneAuthProvider.credential(pendingEnrollVerificationId.value, otp)
    const assertion = PhoneMultiFactorGenerator.assertion(credential)
    await multiFactor(currentUser).enroll(assertion, 'Phone')
    pendingEnrollVerificationId.value = null
  }

  async function unenrollMfa(): Promise<void> {
    const auth = getFirebaseAuth()
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No authenticated user')
    const multiFactorUser = multiFactor(currentUser)
    for (const factor of multiFactorUser.enrolledFactors) {
      await multiFactorUser.unenroll(factor)
    }
  }

  function getMfaEnrolledFactors(): MultiFactorInfo[] {
    const auth = getFirebaseAuth()
    const currentUser = auth.currentUser
    if (!currentUser) return []
    return multiFactor(currentUser).enrolledFactors
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
    sendMfaChallengeCode,
    completeMfaSignIn,
    sendMfaEnrollmentCode,
    completeMfaEnrollment,
    unenrollMfa,
    getMfaEnrolledFactors,
  }
})

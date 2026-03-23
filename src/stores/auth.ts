import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User as FirebaseUser } from 'firebase/auth'
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
  const { setLoading, withLoading, isLoading } = useLoadingStates()
  const loading = isLoading('auth')

  const isAuthenticated = computed(() => user.value !== null)
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin || false)
  const userId = computed(() => user.value?.id || null)
  const userEmail = computed(() => user.value?.email || undefined)

  // Track if listener has been initialized to prevent duplicates
  let listenerInitialized = false
  
  // Track pending auth state changes with promises
  // Key is user ID (or 'null' for sign out), value is resolver function
  const authStateResolvers = new Map<string, (user: User | null) => void>()

  /**
   * Initialize Firebase auth listener
   * Automatically updates user state when auth changes
   * Safe to call multiple times - only initializes once
   */
  function initAuthListener() {
    if (!isFirebaseMode) return
    
    // Prevent multiple listener registrations
    if (listenerInitialized) {
      return
    }

    const auth = getFirebaseAuth()
    onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Sync user to Firestore on every auth state change
        await syncUserToFirestore(firebaseUser)
        
        // Get ID token to check custom claims
        const idTokenResult = await firebaseUser.getIdTokenResult()
        const customClaims = idTokenResult.claims
        
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
        
        // Resolve any pending promises waiting for this user
        const resolver = authStateResolvers.get(firebaseUser.uid)
        if (resolver) {
          resolver(user.value)
          authStateResolvers.delete(firebaseUser.uid)
        }
      } else {
        user.value = null
        
        // Resolve any pending promises waiting for sign out
        const resolver = authStateResolvers.get('null')
        if (resolver) {
          resolver(null)
          authStateResolvers.delete('null')
        }
      }
    })
    
    listenerInitialized = true
  }

  /**
   * Sign in with email and password (Firebase only)
   * Returns a promise that resolves when auth state is updated
   */
  async function signIn(email: string, password: string): Promise<User> {
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

    return await withLoading('auth', async () => {
      error.value = null

      try {
        const auth = getFirebaseAuth()
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        
        // Return promise that resolves when onAuthStateChanged fires
        return new Promise<User>((resolve, reject) => {
          authStateResolvers.set(userCredential.user.uid, (updatedUser) => {
            if (updatedUser) {
              resolve(updatedUser)
            } else {
              reject(new Error('Failed to get user data after sign in'))
            }
          })
          
          // Timeout after 10 seconds to prevent hanging
          setTimeout(() => {
            if (authStateResolvers.has(userCredential.user.uid)) {
              authStateResolvers.delete(userCredential.user.uid)
              reject(new Error('Sign in timeout - please try again'))
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
   * Sign up with email and password (Firebase only)
   * Optionally sends email verification if sendVerification is true
   * Returns a promise that resolves when auth state is updated
   */
  async function signUp(email: string, password: string, sendVerification = false): Promise<{ success: boolean; needsVerification: boolean; user?: User }> {
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
          await emailVerificationService.sendVerificationEmail(userCredential.user)
          // Sign out user until they verify
          await signOut(auth)
          return { success: true, needsVerification: true }
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
              reject(new Error('Sign up timeout - please try again'))
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
        // SECURITY: Never expose Firebase error messages that reveal user existence
        const secureMessage = getSecureAuthMessage(e)
        error.value = secureMessage
        return { success: false, message: secureMessage }
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

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isSuperAdmin,
    userId,
    userEmail,
    initAuthListener,
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

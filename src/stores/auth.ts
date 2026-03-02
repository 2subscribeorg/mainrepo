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

  const loading = ref(false)
  const error = ref<string | null>(null)

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
      console.debug('Auth listener already initialized, skipping')
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
        console.log('🔐 User signed in:', firebaseUser.email, 'Admin:', customClaims.admin, 'SuperAdmin:', customClaims.superAdmin)
        
        // Resolve any pending promises waiting for this user
        const resolver = authStateResolvers.get(firebaseUser.uid)
        if (resolver) {
          resolver(user.value)
          authStateResolvers.delete(firebaseUser.uid)
        }
      } else {
        user.value = null
        console.log('🔐 User signed out')
        
        // Resolve any pending promises waiting for sign out
        const resolver = authStateResolvers.get('null')
        if (resolver) {
          resolver(null)
          authStateResolvers.delete('null')
        }
      }
    })
    
    listenerInitialized = true
    console.log('✅ Auth listener initialized')
  }

  /**
   * Sign in with email and password (Firebase only)
   * Returns a promise that resolves when auth state is updated
   */
  async function signIn(email: string, password: string): Promise<User> {
    if (!isFirebaseMode) {
      console.warn('signIn() only works in Firebase mode')
      throw new Error('signIn() only works in Firebase mode')
    }

    loading.value = true
    error.value = null
    try {
      const auth = getFirebaseAuth()
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Return promise that resolves when onAuthStateChanged fires
      return new Promise<User>((resolve, reject) => {
        authStateResolvers.set(userCredential.user.uid, (updatedUser) => {
          loading.value = false
          if (updatedUser) {
            resolve(updatedUser)
          } else {
            reject(new Error('User state not updated after sign in'))
          }
        })
        
        // Timeout after 10 seconds to prevent hanging
        setTimeout(() => {
          if (authStateResolvers.has(userCredential.user.uid)) {
            authStateResolvers.delete(userCredential.user.uid)
            loading.value = false
            reject(new Error('Auth state update timeout'))
          }
        }, 10000)
      })
    } catch (e) {
      loading.value = false
      error.value = e instanceof Error ? e.message : 'Failed to sign in'
      throw e
    }
  }

  /**
   * Sign up with email and password (Firebase only)
   * Optionally sends email verification if sendVerification is true
   * Returns a promise that resolves when auth state is updated
   */
  async function signUp(email: string, password: string, sendVerification = false): Promise<{ success: boolean; needsVerification: boolean; user?: User }> {
    if (!isFirebaseMode) {
      console.warn('signUp() only works in Firebase mode')
      return { success: false, needsVerification: false }
    }

    loading.value = true
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
        loading.value = false
        return { success: true, needsVerification: true }
      }
      
      // Return promise that resolves when onAuthStateChanged fires
      return new Promise((resolve, reject) => {
        authStateResolvers.set(userCredential.user.uid, (updatedUser) => {
          loading.value = false
          if (updatedUser) {
            resolve({ success: true, needsVerification: false, user: updatedUser })
          } else {
            reject(new Error('User state not updated after sign up'))
          }
        })
        
        // Timeout after 10 seconds to prevent hanging
        setTimeout(() => {
          if (authStateResolvers.has(userCredential.user.uid)) {
            authStateResolvers.delete(userCredential.user.uid)
            loading.value = false
            reject(new Error('Auth state update timeout'))
          }
        }, 10000)
      })
    } catch (e) {
      loading.value = false
      error.value = e instanceof Error ? e.message : 'Failed to sign up'
      throw e
    }
  }

  /**
   * Sign out (Firebase only)
   */
  async function logout() {
    if (!isFirebaseMode) {
      console.warn('logout() only works in Firebase mode')
      return
    }

    loading.value = true
    error.value = null
    try {
      const auth = getFirebaseAuth()
      await signOut(auth)
      user.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to logout'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Send password reset email (Firebase only)
   */
  async function sendPasswordReset(email: string) {
    if (!isFirebaseMode) {
      console.warn('sendPasswordReset() only works in Firebase mode')
      return { success: false, message: 'Password reset not available in Mock mode' }
    }

    loading.value = true
    error.value = null
    try {
      const auth = getFirebaseAuth()
      await sendPasswordResetEmail(auth, email)
      return { success: true, message: 'Password reset email sent successfully' }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send password reset email'
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
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

      console.log('🔐 Reauthenticating user:', currentUser.email)
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
      await reauthenticateWithCredential(currentUser, credential)
      console.log('✅ Reauthentication successful')
      return { success: true, message: 'Reauthentication successful' }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to reauthenticate'
      console.error('❌ Reauthentication failed:', message)
      return { success: false, message }
    }
  }

  /**
   * Change user email (Firebase only, requires reauthentication)
   */
  async function changeEmail(newEmail: string, currentPassword: string) {
    if (!isFirebaseMode) {
      console.warn('changeEmail() only works in Firebase mode')
      return { success: false, message: 'Email change not available in Mock mode' }
    }

    loading.value = true
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

      await firebaseUpdateEmail(currentUser, newEmail)
      
      // Update local user state
      if (user.value) {
        user.value.email = newEmail
      }

      return { success: true, message: 'Email updated successfully' }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update email'
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Change user password (Firebase only, requires reauthentication)
   */
  async function changePassword(currentPassword: string, newPassword: string) {
    if (!isFirebaseMode) {
      console.warn('changePassword() only works in Firebase mode')
      return { success: false, message: 'Password change not available in Mock mode' }
    }

    loading.value = true
    error.value = null
    try {
      console.log('🔐 Starting password change process...')
      
      // Reauthenticate first (Firebase security requirement)
      console.log('🔐 Step 1: Reauthenticating with current password...')
      const reauth = await reauthenticate(currentPassword)
      if (!reauth.success) {
        console.error('❌ Reauthentication failed:', reauth.message)
        throw new Error(reauth.message)
      }
      console.log('✅ Reauthentication successful')

      const auth = getFirebaseAuth()
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        throw new Error('No user logged in')
      }

      console.log('🔐 Step 2: Updating password in Firebase...')
      await firebaseUpdatePassword(currentUser, newPassword)
      console.log('✅ Password updated successfully in Firebase')
      
      // Force token refresh to ensure new credentials are active
      console.log('🔐 Step 3: Refreshing authentication token...')
      await currentUser.getIdToken(true)
      console.log('✅ Token refreshed')
      
      return { success: true, message: 'Password updated successfully' }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update password'
      console.error('❌ Password change failed:', message)
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete user account and all associated data (Firebase only)
   */
  async function deleteAccount(currentPassword: string) {
    if (!isFirebaseMode) {
      console.warn('deleteAccount() only works in Firebase mode')
      return { success: false, message: 'Account deletion not available in Mock mode' }
    }

    loading.value = true
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
      const message = e instanceof Error ? e.message : 'Failed to delete account'
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
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

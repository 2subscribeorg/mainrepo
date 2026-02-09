import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getAuth as getFirebaseAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth'
import { getFirebaseAuth } from '@/config/firebase'
import { syncUserToFirestore, createUserProfile } from '@/services/UserSyncService'

export interface User {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
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
  const userEmail = computed(() => user.value?.email || null)

  /**
   * Initialize Firebase auth listener
   * Automatically updates user state when auth changes
   */
  function initAuthListener() {
    if (!isFirebaseMode) return

    const auth = getFirebaseAuth()
    onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Sync user to Firestore on every auth state change
        await syncUserToFirestore(firebaseUser)
        
        // Get ID token to check custom claims
        const idTokenResult = await firebaseUser.getIdTokenResult()
        const customClaims = idTokenResult.claims
        
        user.value = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          isSuperAdmin: customClaims.admin === true && customClaims.superAdmin === true,
        }
        console.log('🔐 User signed in:', firebaseUser.email, 'Admin:', customClaims.admin, 'SuperAdmin:', customClaims.superAdmin)
      } else {
        user.value = null
        console.log('🔐 User signed out')
      }
    })
  }

  /**
   * Sign in with email and password (Firebase only)
   */
  async function signIn(email: string, password: string) {
    if (!isFirebaseMode) {
      console.warn('signIn() only works in Firebase mode')
      return
    }

    loading.value = true
    error.value = null
    try {
      const auth = getFirebaseAuth()
      await signInWithEmailAndPassword(auth, email, password)
      // Don't manually set user - let initAuthListener handle it via onAuthStateChanged
      // This ensures consistent state management
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to sign in'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign up with email and password (Firebase only)
   */
  async function signUp(email: string, password: string) {
    if (!isFirebaseMode) {
      console.warn('signUp() only works in Firebase mode')
      return
    }

    loading.value = true
    error.value = null
    try {
      const auth = getFirebaseAuth()
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Create user profile in Firestore
      await createUserProfile(userCredential.user)
      
      // Don't manually set user - let initAuthListener handle it via onAuthStateChanged
      // This ensures consistent state management
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to sign up'
      throw e
    } finally {
      loading.value = false
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

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
      await reauthenticateWithCredential(currentUser, credential)
      return { success: true, message: 'Reauthentication successful' }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to reauthenticate'
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

      await updateEmail(currentUser, newEmail)
      
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

      await updatePassword(currentUser, newPassword)
      return { success: true, message: 'Password updated successfully' }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update password'
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
      const { deleteFirestore } = await import('firebase/firestore')
      const { getFirebaseFirestore } = await import('@/config/firebase')
      const db = getFirebaseFirestore()
      
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

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

/**
 * Authentication composable
 * Provides easy access to auth state and methods
 * 
 * @example
 * ```ts
 * const { user, isAuthenticated, signIn, signOut } = useAuth()
 * 
 * await signIn('user@example.com', 'password123')
 * ```
 */
export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  // State
  const user = computed(() => authStore.user)
  const loading = computed(() => authStore.loading)
  const error = computed(() => authStore.error)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isSuperAdmin = computed(() => authStore.isSuperAdmin)
  const userId = computed(() => authStore.userId)
  const userEmail = computed(() => authStore.userEmail)

  /**
   * Sign in with email and password
   */
  async function signIn(email: string, password: string) {
    try {
      await authStore.signIn(email, password)
      
      // Wait for auth listener to update user state
      // Firebase's onAuthStateChanged is asynchronous
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return { success: true, error: null }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Failed to sign in'
      }
    }
  }

  /**
   * Sign up with email and password
   */
  async function signUp(email: string, password: string) {
    try {
      await authStore.signUp(email, password)
      
      // Wait for auth listener to update user state
      // Firebase's onAuthStateChanged is asynchronous
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return { success: true, error: null }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Failed to sign up'
      }
    }
  }

  /**
   * Sign out and redirect to login
   */
  async function signOut(redirectToLogin = true) {
    try {
      await authStore.logout()
      if (redirectToLogin) {
        router.push('/login')
      }
      return { success: true, error: null }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Failed to sign out'
      }
    }
  }

  /**
   * Initialize auth listener (Firebase mode only)
   * Call this once in App.vue
   */
  function initAuthListener() {
    authStore.initAuthListener()
  }

  /**
   * Send password reset email
   */
  async function resetPassword(email: string) {
    try {
      const result = await authStore.sendPasswordReset(email)
      return result
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : 'Failed to send reset email'
      }
    }
  }

  /**
   * Change user email
   */
  async function updateEmail(newEmail: string, currentPassword: string) {
    try {
      const result = await authStore.changeEmail(newEmail, currentPassword)
      return result
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : 'Failed to update email'
      }
    }
  }

  /**
   * Change user password
   */
  async function updatePassword(currentPassword: string, newPassword: string) {
    try {
      const result = await authStore.changePassword(currentPassword, newPassword)
      return result
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : 'Failed to update password'
      }
    }
  }

  /**
   * Delete user account and all associated data
   */
  async function deleteAccount(currentPassword: string) {
    try {
      const result = await authStore.deleteAccount(currentPassword)
      if (result.success) {
        // Redirect to login after successful deletion
        router.push('/login')
      }
      return result
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : 'Failed to delete account'
      }
    }
  }

  /**
   * Check if user has permission
   * For now, just checks if authenticated
   * Can be extended for role-based access control
   */
  function hasPermission(permission?: string): boolean {
    if (!isAuthenticated.value) return false
    if (!permission) return true
    
    // TODO: Implement permission checking
    // For now, super admins have all permissions
    return isSuperAdmin.value
  }

  return {
    // State
    user,
    loading,
    error,
    isAuthenticated,
    isSuperAdmin,
    userId,
    userEmail,
    // Actions
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateEmail,
    updatePassword,
    deleteAccount,
    initAuthListener,
    hasPermission,
  }
}

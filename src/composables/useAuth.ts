import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { Permission, getPermissionsForRole, roleHasPermission } from '@/types/permissions'

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
   * Waits for auth state to be updated before resolving
   */
  async function signIn(email: string, password: string) {
    try {
      // Store now returns promise that resolves when auth state is ready
      await authStore.signIn(email, password)
      
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
   * Optionally sends email verification if sendVerification is true
   * Waits for auth state to be updated before resolving
   */
  async function signUp(email: string, password: string, sendVerification = false) {
    try {
      // Store now returns promise that resolves when auth state is ready
      const result = await authStore.signUp(email, password, sendVerification)
      
      return { 
        success: true, 
        error: null, 
        needsVerification: result.needsVerification 
      }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Failed to sign up',
        needsVerification: false
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
   * Check if user has a specific permission
   * Uses role-based access control with Firebase custom claims
   * 
   * @param permission - Permission enum value to check
   * @returns true if user has the permission, false otherwise
   */
  function hasPermission(permission?: Permission | string): boolean {
    if (!isAuthenticated.value) return false
    if (!permission) return true
    
    const currentUser = user.value
    if (!currentUser) return false

    // Check custom permissions from Firebase claims first (highest priority)
    if (currentUser.permissions && currentUser.permissions.includes(permission as string)) {
      return true
    }

    // Check role-based permissions
    const userRole = currentUser.role || 'user'
    
    // If permission is a Permission enum, check against role permissions
    if (Object.values(Permission).includes(permission as Permission)) {
      return roleHasPermission(userRole, permission as Permission)
    }

    // Fallback: super admins have all permissions
    return currentUser.isSuperAdmin
  }

  /**
   * Check if user has any of the specified permissions
   */
  function hasAnyPermission(...permissions: (Permission | string)[]): boolean {
    return permissions.some(p => hasPermission(p))
  }

  /**
   * Check if user has all of the specified permissions
   */
  function hasAllPermissions(...permissions: (Permission | string)[]): boolean {
    return permissions.every(p => hasPermission(p))
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
    // Permissions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}

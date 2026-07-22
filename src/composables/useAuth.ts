import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { Permission, roleHasPermission } from '@/types/permissions'

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

  function getMfaErrorMessage(e: unknown, fallback: string) {
    const code = (e as { code?: string })?.code
    const message = e instanceof Error ? e.message : ''
    const source = `${code || ''} ${message}`.toLowerCase()

    if (source.includes('auth/requires-recent-login')) {
      return 'Please confirm your password before changing two-factor authentication.'
    }
    if (source.includes('auth/invalid-phone-number') || source.includes('auth/missing-phone-number')) {
      return 'Enter a valid phone number with country code, e.g. +919985520424.'
    }
    if (source.includes('auth/invalid-verification-code')) {
      return 'Invalid verification code. Check the SMS and try again.'
    }
    if (source.includes('auth/code-expired')) {
      return 'This verification code expired. Send a new code and try again.'
    }
    if (source.includes('auth/too-many-requests') || source.includes('auth/quota-exceeded')) {
      return 'SMS verification is temporarily limited. Please try again later.'
    }
    if (
      source.includes('auth/captcha-check-failed') ||
      source.includes('auth/invalid-app-credential') ||
      source.includes('auth/missing-app-credential')
    ) {
      return 'Phone verification could not confirm this app. Try again or check Firebase app verification setup.'
    }
    if (source.includes('auth/network-request-failed')) {
      return 'Network error. Please check your connection and try again.'
    }

    return message || fallback
  }
  /**
   * Sign in with email and password
   * Waits for auth state to be updated before resolving
   */
  async function signIn(email: string, password: string) {
    try {
      await authStore.signIn(email, password)
      return { success: true, error: null, mfaRequired: false }
    } catch (e) {
      if (e instanceof Error && (e as any).code === 'MFA_REQUIRED') {
        return { success: false, error: null, mfaRequired: true }
      }
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Failed to sign in',
        mfaRequired: false,
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


  async function reauthenticate(currentPassword: string) {
    try {
      return await authStore.reauthenticate(currentPassword)
    } catch (e) {
      return {
        success: false,
        message: getMfaErrorMessage(e, 'Failed to confirm password')
      }
    }
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

  async function sendMfaChallengeCode(appVerifier: unknown) {
    try {
      await authStore.sendMfaChallengeCode(appVerifier as any)
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: getMfaErrorMessage(e, 'Failed to send code') }
    }
  }

  async function completeMfaSignIn(otp: string) {
    try {
      await authStore.completeMfaSignIn(otp)
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: getMfaErrorMessage(e, 'Invalid code') }
    }
  }

  async function sendMfaEnrollmentCode(phoneNumber: string, appVerifier: unknown) {
    try {
      await authStore.sendMfaEnrollmentCode(phoneNumber, appVerifier as any)
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: getMfaErrorMessage(e, 'Failed to send code') }
    }
  }

  async function completeMfaEnrollment(otp: string) {
    try {
      await authStore.completeMfaEnrollment(otp)
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: getMfaErrorMessage(e, 'Invalid code') }
    }
  }

  async function unenrollMfa() {
    try {
      await authStore.unenrollMfa()
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: getMfaErrorMessage(e, 'Failed to disable 2FA') }
    }
  }

  function getMfaEnrolledFactors() {
    return authStore.getMfaEnrolledFactors()
  }

  function hasPermission(permission?: Permission | string): boolean {
    if (!isAuthenticated.value) return false
    if (!permission) return true

    const currentUser = user.value
    if (!currentUser) return false

    if (currentUser.permissions && currentUser.permissions.includes(permission as string)) {
      return true
    }

    const userRole = currentUser.role || 'user'

    if (Object.values(Permission).includes(permission as Permission)) {
      return roleHasPermission(userRole, permission as Permission)
    }

    return currentUser.isSuperAdmin
  }

  function hasAnyPermission(...permissions: (Permission | string)[]): boolean {
    return permissions.some(p => hasPermission(p))
  }

  function hasAllPermissions(...permissions: (Permission | string)[]): boolean {
    return permissions.every(p => hasPermission(p))
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isSuperAdmin,
    userId,
    userEmail,
    signIn,
    signUp,
    signOut,
    reauthenticate,
    resetPassword,
    updateEmail,
    updatePassword,
    deleteAccount,
    initAuthListener,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    sendMfaChallengeCode,
    completeMfaSignIn,
    sendMfaEnrollmentCode,
    completeMfaEnrollment,
    unenrollMfa,
    getMfaEnrolledFactors,
  }
}

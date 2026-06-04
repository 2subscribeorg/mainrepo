import { useAuth } from './useAuth'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/utils/logger'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { getFirebaseAuth } from '@/config/firebase'
import { isAppBootstrapped, bootstrapApp } from '@/config/bootstrap'
import { isEmailVerificationRequired } from '@/config/authFlow'

/**
 * Authentication guard for routes
 * Redirects to login if user is not authenticated
 * Optionally enforces email verification based on environment variable
 * 
 * @example
 * ```ts
 * // In router:
 * {
 *   path: '/subscriptions',
 *   component: Subscriptions,
 *   beforeEnter: requireAuth
 * }
 * ```
 */
export async function requireAuth(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  // Ensure app is bootstrapped before checking auth
  if (!isAppBootstrapped()) {
    logger.warn('Auth guard called before bootstrap complete - waiting...')
    await bootstrapApp()
  }

  const { isAuthenticated } = useAuth()
  
  // Wait for initial auth state to be resolved (prevents redirect on page refresh)
  const authStore = useAuthStore()
  await authStore.waitForInitialAuthCheck()

  // Skip auth check in Mock mode for development
  if (import.meta.env.VITE_DATA_BACKEND === 'MOCK') {
    next()
    return
  }

  if (!isAuthenticated.value) {
    // Double-check directly with Firebase before redirecting — the store
    // reactive state can lag behind on first load / cold start
    try {
      const firebaseAuth = getFirebaseAuth()
      if (firebaseAuth.currentUser) {
        // Firebase says user is logged in — let them through
        next()
        return
      }
    } catch {
      // Firebase not available, fall through to redirect
    }
    // Redirect to login and save intended destination
    logger.debug('User not authenticated, redirecting to login')
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // Optional: Enforce email verification if enabled
  const requireEmailVerification = isEmailVerificationRequired()
  
  if (requireEmailVerification) {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    
    if (user && !user.emailVerified && to.path !== '/verify-email') {
      next('/verify-email')
      return
    }
  }

  next()
}

/**
 * Redirect to home if already authenticated
 * Useful for login/signup pages
 * 
 * @example
 * ```ts
 * // In router:
 * {
 *   path: '/login',
 *   component: Auth,
 *   beforeEnter: redirectIfAuthenticated
 * }
 * ```
 */
export async function redirectIfAuthenticated(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  if (!isAppBootstrapped()) {
    await bootstrapApp()
  }

  const authStore = useAuthStore()
  await authStore.waitForInitialAuthCheck()

  const { isAuthenticated } = useAuth()

  if (isAuthenticated.value) {
    if (isEmailVerificationRequired()) {
      try {
        const auth = getFirebaseAuth()
        if (auth.currentUser && !auth.currentUser.emailVerified && to.path !== '/verify-email') {
          next('/verify-email')
          return
        }
      } catch {
        // Firebase not ready, fall back to the store auth state below.
      }
    }

    next('/')
  } else {
    next()
  }
}

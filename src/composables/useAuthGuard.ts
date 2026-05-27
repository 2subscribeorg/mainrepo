import { useAuth } from './useAuth'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/utils/logger'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { getFirebaseAuth } from '@/config/firebase'
import { isAppBootstrapped, bootstrapApp } from '@/config/bootstrap'

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
  const authCheckCompleted = await authStore.waitForInitialAuthCheck()

  // If auth check timed out, redirect to login for safety
  if (!authCheckCompleted) {
    logger.warn('Auth check timed out, redirecting to login for safety')
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

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
  const requireEmailVerification = import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === 'true'
  
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
export function redirectIfAuthenticated(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated.value) {
    next('/')
  } else {
    next()
  }
}

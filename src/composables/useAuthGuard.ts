import { useAuth } from './useAuth'
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
    console.warn('Auth guard called before bootstrap complete - waiting...')
    await bootstrapApp()
  }

  const { isAuthenticated } = useAuth()

  // Skip auth check in Mock mode for development
  if (import.meta.env.VITE_DATA_BACKEND === 'MOCK') {
    next()
    return
  }

  if (!isAuthenticated.value) {
    // Redirect to login and save intended destination
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

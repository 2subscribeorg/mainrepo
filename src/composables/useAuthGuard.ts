import { useAuth } from './useAuth'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'

/**
 * Authentication guard for routes
 * Redirects to login if user is not authenticated
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
export function requireAuth(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
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
  } else {
    next()
  }
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

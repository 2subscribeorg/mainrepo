import { useAuth } from './useAuth'
import { useAuthStore } from '@/stores/auth'
import { useOnboardingStore } from '@/stores/onboarding'
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
        // Firebase says user is logged in — check email verification before letting through
        if (isEmailVerificationRequired() && !firebaseAuth.currentUser.emailVerified && to.path !== '/verify-email') {
          next('/verify-email')
          return
        }
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
/**
 * Guard for the /verify-email route.
 * - Not authenticated → redirect to /login
 * - Already verified → redirect to /
 * - Unverified and verification not required → redirect to /
 */
export async function requireVerifyEmailRoute(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  if (!isAppBootstrapped()) {
    await bootstrapApp()
  }

  if (import.meta.env.VITE_DATA_BACKEND === 'MOCK') {
    next('/')
    return
  }

  try {
    const firebaseAuth = getFirebaseAuth()
    const user = firebaseAuth.currentUser

    if (!user) {
      next('/login')
      return
    }

    if (user.emailVerified) {
      next('/')
      return
    }

    if (!isEmailVerificationRequired()) {
      next('/')
      return
    }

    next()
  } catch {
    next('/login')
  }
}

export async function redirectIfAuthenticated(
  _to: RouteLocationNormalized,
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
      // Use store's emailVerified (set by onAuthStateChanged — always available
      // after waitForInitialAuthCheck resolves). Fall back to firebaseAuth.currentUser
      // if the store object doesn't have it for some reason.
      const storeUser = authStore.user
      const isVerified = storeUser?.emailVerified ?? (() => {
        try { return getFirebaseAuth().currentUser?.emailVerified ?? false } catch { return false }
      })()

      if (!isVerified) {
        next('/verify-email')
        return
      }
    }

    // Check onboarding status for returning authenticated users
    const onboardingStore = useOnboardingStore()
    if (import.meta.env.VITE_DATA_BACKEND !== 'MOCK' && !onboardingStore.onboardingCompleted) {
      await onboardingStore.checkOnboardingStatus()
      if (!onboardingStore.onboardingCompleted) {
        next('/onboarding')
        return
      }
    }

    next('/')
  } else {
    next()
  }
}

/**
 * Onboarding guard — redirects to /onboarding if the authenticated user
 * hasn't completed the setup wizard yet. Must run AFTER requireAuth.
 */
export async function requireOnboarding(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  // Skip onboarding enforcement in Mock mode
  if (import.meta.env.VITE_DATA_BACKEND === 'MOCK') {
    next()
    return
  }

  const onboardingStore = useOnboardingStore()

  // Check Firestore if we haven't loaded the status yet
  if (!onboardingStore.onboardingCompleted) {
    await onboardingStore.checkOnboardingStatus()
  }

  if (!onboardingStore.onboardingCompleted) {
    next('/onboarding')
    return
  }

  next()
}

import { createRouter, createWebHistory } from 'vue-router'
import { requireAuth, redirectIfAuthenticated, requireVerifyEmailRoute, requireOnboarding } from '@/composables/useAuthGuard'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Welcome carousel (pre-auth, first launch only)
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('@/views/WelcomeCarousel.vue'),
    },
    // Auth Routes (public)
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Auth.vue'),
      beforeEnter: redirectIfAuthenticated,
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('@/pages/VerifyEmail.vue'),
      beforeEnter: requireVerifyEmailRoute,
    },
    {
      path: '/verify-email/confirm',
      name: 'verify-email-confirm',
      component: () => import('@/pages/AuthAction.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/pages/AuthAction.vue'),
    },
    {
      path: '/delete-account-request',
      name: 'delete-account-request',
      component: () => import('@/pages/DeleteAccountRequest.vue'),
    },
    {
      path: '/delete-account-confirm',
      name: 'delete-account-confirm',
      component: () => import('@/pages/DeleteAccountConfirm.vue'),
    },
    // Protected Routes (require authentication)
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
      beforeEnter: [requireAuth, requireOnboarding],
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('@/views/Categories.vue'),
      beforeEnter: [requireAuth, requireOnboarding],
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import('@/views/Transactions.vue'),
      beforeEnter: [requireAuth, requireOnboarding],
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
      beforeEnter: [requireAuth, requireOnboarding],
    },
    {
      path: '/platform-subscription',
      name: 'platform-subscription',
      component: () => import('@/views/PlatformSubscription.vue'),
      beforeEnter: [requireAuth, requireOnboarding],
    },
    // Onboarding wizard (authenticated, not yet completed)
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/views/Onboarding.vue'),
      beforeEnter: requireAuth,
    },
    // Catch-all route - must be last
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
})

// Global error handler for route loading
router.onError(() => {
  // Router error handled
})

export default router

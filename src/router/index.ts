import { createRouter, createWebHistory } from 'vue-router'
import { requireAuth, redirectIfAuthenticated } from '@/composables/useAuthGuard'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
    },
    // Protected Routes (require authentication)
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
      beforeEnter: requireAuth,
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('@/views/Categories.vue'),
      beforeEnter: requireAuth,
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import('@/views/Transactions.vue'),
      beforeEnter: requireAuth,
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
      beforeEnter: requireAuth,
    },
    {
      path: '/platform-subscription',
      name: 'platform-subscription',
      component: () => import('@/views/PlatformSubscription.vue'),
      beforeEnter: requireAuth,
    },
    // UI Preview (no auth required)
    {
      path: '/preview/dashboard',
      name: 'dashboard-preview',
      component: () => import('@/views/DashboardPreview.vue'),
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
router.onError((error) => {
  console.error('Router error:', error)
})

export default router

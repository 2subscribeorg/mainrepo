import { createRouter, createWebHistory } from 'vue-router'
import { requireAuth, redirectIfAuthenticated } from '@/composables/useAuthGuard'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import { useBankTransactionsStore } from '@/stores/bankTransactions'

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
    {
      path: '/subscriptions/:id',
      name: 'subscription-details',
      component: () => import('@/views/SubscriptionDetails.vue'),
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

// Navigation-Aware Resets: clear sensitive bank data when leaving bank-related routes
const BANK_SENSITIVE_ROUTE_NAMES = ['dashboard', 'settings', 'transactions']

router.afterEach((to, from) => {
  const leavingBankContext = BANK_SENSITIVE_ROUTE_NAMES.includes(from.name as string)
  const enteringBankContext = BANK_SENSITIVE_ROUTE_NAMES.includes(to.name as string)

  if (leavingBankContext && !enteringBankContext) {
    const bankAccounts = useBankAccountsStore()
    const bankTransactions = useBankTransactionsStore()
    bankAccounts.reset()
    bankTransactions.reset()
  }
})

// Global error handler for route loading
router.onError(() => {
  // Router error handled
})

export default router

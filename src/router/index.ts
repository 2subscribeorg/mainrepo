import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
    },
    {
      path: '/subscriptions',
      name: 'subscriptions',
      component: () => import('@/views/Subscriptions.vue'),
    },
    {
      path: '/subscriptions/:id',
      name: 'subscription-detail',
      component: () => import('@/views/SubscriptionDetail.vue'),
    },
    {
      path: '/budgets',
      name: 'budgets',
      component: () => import('@/views/Budgets.vue'),
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('@/views/Categories.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/Admin.vue'),
      beforeEnter: () => {
        const authStore = useAuthStore()
        if (!authStore.isSuperAdmin) {
          return { name: 'dashboard' }
        }
      },
    },
  ],
})

export default router

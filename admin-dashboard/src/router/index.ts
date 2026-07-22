import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/Users.vue'),
        },
        {
          path: 'users/:userId',
          name: 'UserEdit',
          component: () => import('@/views/UserEdit.vue'),
        },
        {
          path: 'subscriptions',
          name: 'Subscriptions',
          component: () => import('@/views/Subscriptions.vue'),
        },
        {
          path: 'subscriptions/:userId',
          name: 'SubscriptionDetail',
          component: () => import('@/views/SubscriptionDetail.vue'),
        },
        {
          path: 'admin-users',
          name: 'AdminUsers',
          component: () => import('@/views/AdminUsers.vue'),
        },
        {
          path: 'admin-users/:adminId',
          name: 'AdminDetail',
          component: () => import('@/views/AdminDetail.vue'),
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/Settings.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  await authStore.waitForAuth()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router

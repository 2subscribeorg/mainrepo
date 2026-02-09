<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-blue-600">2Subscribe</h1>
          </div>
          
          <div class="flex items-center gap-4">
            <!-- User Profile Component -->
            <UserProfile />
            
          </div>
        </div>
      </div>
    </header>

    <!-- Notifications Banner -->
    <div v-if="notificationsStore.unreadCount > 0" class="bg-yellow-50 border-b border-yellow-200">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div v-for="notification in unreadNotifications" :key="notification.id" class="mb-2 last:mb-0">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium text-yellow-900">{{ notification.title }}</p>
              <p class="text-sm text-yellow-700">{{ notification.message }}</p>
            </div>
            <button
              class="ml-4 text-yellow-600 hover:text-yellow-800 transition-colors"
              @click="notificationsStore.markAsRead(notification.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="bg-white border-b">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex space-x-8 overflow-x-auto">
          <router-link
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors"
            :class="
              $route.path === link.path || $route.path.startsWith(link.path + '/')
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            "
          >
            {{ link.label }}
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotificationsStore } from '@/stores/notifications'
import UserProfile from '@/components/settings/UserProfile.vue'

const notificationsStore = useNotificationsStore()

// Environment flags
const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'
const isProduction = import.meta.env.PROD

const navLinks = computed(() => {
  const links = [
    { path: '/', label: 'Dashboard' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/categories', label: 'Categories' },
    { path: '/settings', label: 'Settings' },
  ]


  return links
})

const unreadNotifications = computed(() => 
  notificationsStore.notifications.filter((n) => !n.read)
)
</script>

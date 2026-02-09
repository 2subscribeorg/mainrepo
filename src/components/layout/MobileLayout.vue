<template>
  <div class="mobile-shell flex min-h-screen flex-col text-text-primary">
    <header class="sticky top-0 z-sticky bg-surface-overlay backdrop-blur-md shadow-lg border-b border-border-light">
      <div class="flex items-center justify-between gap-4" style="padding: var(--space-4) var(--space-5) var(--space-3) var(--space-5);">
        <div class="flex items-center" style="gap: var(--space-3);">
          <button
            v-if="showBack"
            class="flex items-center justify-center rounded-full bg-surface-elevated text-text-secondary touch-target"
            @click="handleBack"
          >
            <span class="sr-only">Go back</span>
            ←
          </button>
          <div>
            <p class="text-xs uppercase tracking-wide text-text-muted">{{ subtitle }}</p>
            <h1 class="text-2xl font-semibold text-text-primary">{{ title }}</h1>
          </div>
        </div>
        <div class="flex items-center" style="gap: var(--space-3);">
          <slot name="header-actions">
            <UserProfile />
          </slot>
        </div>
      </div>

      <div v-if="showNotificationBanner" style="padding: 0 var(--space-5) var(--space-3) var(--space-5);">
        <div
          v-for="notification in unreadNotifications"
          :key="notification.id"
          class="mb-2 rounded-2xl border border-warning-border bg-warning-bg text-sm text-warning-text" style="padding: var(--space-3) var(--space-4);"
        >
          <div class="flex items-start justify-between" style="gap: var(--space-3);">
            <div>
              <p class="font-semibold">{{ notification.title }}</p>
              <p class="text-warning-text-emphasis">{{ notification.message }}</p>
            </div>
            <button
              class="text-warning-text hover:text-warning-text-emphasis"
              @click="notificationsStore.markAsRead(notification.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto" style="padding: var(--space-5) var(--space-4);">
      <slot />
    </main>

    <nav
      v-if="showBottomNav"
      class="mobile-bottom-nav sticky bottom-0 z-sticky border-t border-border-medium bg-surface-overlay-dark backdrop-blur-md"
    >
      <div class="grid grid-cols-4 gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <router-link
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="flex flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium transition-fast" style="padding: var(--space-2) var(--space-3);"
          :class="
            isActive(link.path)
              ? 'bg-primary text-white shadow-lg'
              : 'text-text-secondary hover:bg-interactive-hover'
          "
        >
          <span>{{ link.label }}</span>
          <span
            v-if="link.badge"
            class="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          >
            {{ link.badge }}
          </span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UserProfile from '@/components/settings/UserProfile.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'

interface NavLink {
  path: string
  label: string
  badge?: string
}

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    showBack?: boolean
    showBottomNav?: boolean
  }>(),
  {
    title: '2Subscribe',
    subtitle: 'Subscriptions',
    showBack: false,
    showBottomNav: true,
  }
)

const emit = defineEmits<{
  (e: 'back'): void
}>()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()


const navLinks = computed(() => {
  const links: NavLink[] = [
    { path: '/', label: 'Home' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/categories', label: 'Categories' },
    { path: '/settings', label: 'Settings' },
  ]


  return links
})

const showNotificationBanner = computed(() => notificationsStore.unreadCount > 0)

const unreadNotifications = computed(() =>
  notificationsStore.notifications.filter((n) => !n.read).slice(0, 3)
)

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function handleBack() {
  emit('back')
  router.back()
}
</script>

<template>
  <div class="user-profile">
    <!-- User Info -->
    <div v-if="isAuthenticated" class="flex items-center gap-3">
      <!-- User Avatar -->
      <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
        {{ userInitials }}
      </div>

      <!-- User Details -->
      <div class="hidden sm:block">
        <p class="text-sm font-medium text-text-primary">
          {{ user?.name || 'User' }}
        </p>
        <p class="text-xs text-text-secondary">
          {{ user?.email }}
        </p>
      </div>

      <!-- Logout Button -->
      <button
        @click="handleLogout"
        :disabled="loading"
        class="sign-out-button"
        title="Sign out"
      >
        <span v-if="loading">...</span>
        <span v-else>Sign Out</span>
      </button>
    </div>

    <!-- Not Authenticated -->
    <div v-else>
      <router-link
        to="/login"
        class="sign-in-button"
      >
        Sign In
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { user, isAuthenticated, signOut, loading } = useAuth()

const userInitials = computed(() => {
  if (!user.value) return '?'
  const name = user.value.name || user.value.email
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

async function handleLogout() {
  const { success } = await signOut()
  if (!success) {
    alert('Failed to sign out')
  }
}
</script>

<style scoped>
.user-profile {
  @apply flex items-center;
}

.sign-in-button {
  @apply inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors;
  background-color: var(--color-primary);
  color: #fff;
}

.sign-in-button:hover {
  background-color: color-mix(in srgb, var(--color-primary) 85%, white);
}

.sign-out-button {
  @apply ml-2 px-3 py-1 text-sm rounded-md transition-colors disabled:opacity-50;
  color: var(--color-text-primary);
  border: 1px solid rgba(15, 23, 42, 0.08);
  background-color: transparent;
}

.sign-out-button:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}
</style>

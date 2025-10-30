import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>({
    id: 'mock-user-1',
    name: 'Demo User',
    email: 'demo@2subscribe.app',
    isSuperAdmin: false,
  })

  const isAuthenticated = computed(() => user.value !== null)
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin || false)

  function toggleSuperAdmin() {
    if (user.value) {
      user.value.isSuperAdmin = !user.value.isSuperAdmin
    }
  }

  return {
    user,
    isAuthenticated,
    isSuperAdmin,
    toggleSuperAdmin,
  }
})

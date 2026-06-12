import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import axios from 'axios'

interface AdminUser {
  id: string
  email: string
  displayName: string
  isSuperAdmin: boolean
  permissions: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin || false)
  const permissions = computed(() => user.value?.permissions || [])

  function initAuthListener(): void {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken()
          const baseURL = import.meta.env.VITE_API_BASE_URL
          const { data } = await axios.post(
            `${baseURL}/api/admin/auth/verify`,
            {},
            { headers: { Authorization: `Bearer ${idToken}` } }
          )
          user.value = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: data.data?.displayName || '',
            isSuperAdmin: (data.data?.permissions || []).includes('super_admin'),
            permissions: data.data?.permissions || [],
          }
        } catch {
          await signOut(auth)
          user.value = null
        }
      } else {
        user.value = null
      }
      loading.value = false
    })
  }

  function waitForAuth(): Promise<void> {
    return new Promise((resolve) => {
      if (!loading.value) {
        resolve()
        return
      }
      const unwatch = watch(loading, (val) => {
        if (!val) {
          unwatch()
          resolve()
        }
      })
    })
  }

  async function login(email: string, password: string): Promise<boolean> {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const idToken = await credential.user.getIdToken()
    let perms: string[] = []
    let displayName = ''
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL
      const { data } = await axios.post(
        `${baseURL}/api/admin/auth/verify`,
        {},
        { headers: { Authorization: `Bearer ${idToken}` } }
      )
      perms = data.data?.permissions || []
      displayName = data.data?.displayName || ''
    } catch {
      await signOut(auth)
      return false
    }

    user.value = {
      id: credential.user.uid,
      email: credential.user.email || '',
      displayName,
      isSuperAdmin: perms.includes('super_admin'),
      permissions: perms,
    }

    return true
  }

  async function logout(): Promise<void> {
    await signOut(auth)
  }

  function patchUser(updates: Partial<AdminUser>): void {
    if (user.value) user.value = { ...user.value, ...updates }
  }

  return {
    user,
    loading,
    isAuthenticated,
    isSuperAdmin,
    permissions,
    initAuthListener,
    waitForAuth,
    login,
    logout,
    patchUser,
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

interface AdminUser {
  id: string
  email: string
  isSuperAdmin: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin || false)

  function initAuthListener(): void {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult()
        const claims = idTokenResult.claims

        user.value = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          isSuperAdmin: claims.admin === true && claims.superAdmin === true,
        }
      } else {
        user.value = null
      }
      loading.value = false
    })
  }

  async function login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logout(): Promise<void> {
    await signOut(auth)
  }

  return {
    user,
    loading,
    isAuthenticated,
    isSuperAdmin,
    initAuthListener,
    login,
    logout,
  }
})

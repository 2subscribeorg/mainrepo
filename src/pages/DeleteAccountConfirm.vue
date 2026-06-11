<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-surface rounded-2xl shadow-xl p-8">

        <!-- Loading: verifying token on mount -->
        <div v-if="state === 'loading'" class="text-center space-y-4">
          <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p class="text-text-secondary">Verifying your request...</p>
        </div>

        <!-- Invalid / missing token -->
        <div v-else-if="state === 'invalid'" class="text-center space-y-4">
          <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 class="text-xl font-bold text-text-primary">Invalid Link</h1>
          <p class="text-sm text-text-secondary">{{ errorMessage }}</p>
          <router-link
            to="/delete-account-request"
            class="inline-block text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Submit a new request →
          </router-link>
        </div>

        <!-- Confirmation prompt -->
        <div v-else-if="state === 'confirm'" class="space-y-6">
          <div class="text-center">
            <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-text-primary mb-2">Delete Account</h1>
            <p class="text-text-secondary text-sm">
              This will permanently delete your account and all associated data.
              <strong class="text-text-primary">This cannot be undone.</strong>
            </p>
          </div>

          <p v-if="errorMessage" class="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {{ errorMessage }}
          </p>

          <div class="space-y-3">
            <button
              @click="confirmDeletion"
              :disabled="deleting"
              class="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ deleting ? 'Deleting...' : 'Yes, permanently delete my account' }}
            </button>
            <router-link
              to="/"
              class="block text-center text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel, keep my account
            </router-link>
          </div>
        </div>

        <!-- Success -->
        <div v-else-if="state === 'deleted'" class="text-center space-y-4">
          <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-xl font-bold text-text-primary">Account Deleted</h1>
          <p class="text-sm text-text-secondary">
            Your account has been scheduled for deletion. You have been signed out and will not be able to log in again.
          </p>
          <p class="text-xs text-text-muted">Redirecting to login...</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { getFirebaseAuth } from '@/config/firebase'

type PageState = 'loading' | 'invalid' | 'confirm' | 'deleted'

const route = useRoute()
const router = useRouter()
const state = ref<PageState>('loading')
const errorMessage = ref('')
const deleting = ref(false)
const token = ref('')

const API_BASE = import.meta.env.VITE_BACKEND_API_URL

onMounted(() => {
  const rawToken = route.query.token
  if (!rawToken || typeof rawToken !== 'string' || !/^[a-f0-9]+$/.test(rawToken)) {
    errorMessage.value = 'This link is invalid or has expired. Please submit a new deletion request.'
    state.value = 'invalid'
    return
  }
  token.value = rawToken
  state.value = 'confirm'
})

async function confirmDeletion() {
  deleting.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(`${API_BASE}/public/account/delete-confirm/${token.value}`, {
      method: 'GET',
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (response.status === 400) {
        errorMessage.value = data?.error?.message || 'This link is invalid or has expired.'
        state.value = 'invalid'
      } else {
        errorMessage.value = data?.error?.message || 'Something went wrong. Please try again.'
      }
      return
    }

    state.value = 'deleted'

    // Sign out the local Firebase session and redirect to login
    try {
      await signOut(getFirebaseAuth())
    } catch {
      // Sign out failure is non-critical — account is already disabled on the server
    }

    setTimeout(() => {
      router.replace('/login')
    }, 2500)
  } catch {
    errorMessage.value = 'Something went wrong. Please try again.'
  } finally {
    deleting.value = false
  }
}
</script>

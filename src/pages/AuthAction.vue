<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-surface rounded-2xl shadow-xl p-8">
        <!-- Loading -->
        <div v-if="status === 'loading'" class="text-center">
          <div class="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p class="text-text-secondary">Verifying your email…</p>
        </div>

        <!-- Email verification success -->
        <div v-else-if="status === 'verify-success'" class="text-center">
          <div class="mx-auto w-16 h-16 bg-success-bg rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-text-primary mb-2">Email Verified</h1>
          <p class="text-text-secondary mb-6">Your email has been verified successfully.</p>
          <button
            @click="router.push('/login')"
            class="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Continue to Sign In
          </button>
        </div>

        <!-- Reset password form -->
        <div v-else-if="status === 'reset-form'">
          <h1 class="text-2xl font-bold text-text-primary mb-2 text-center">Set a New Password</h1>
          <p class="text-text-secondary text-center mb-6">Enter a new password for your account.</p>

          <div
            v-if="formError"
            class="mb-4 p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm"
          >
            {{ formError }}
          </div>

          <form @submit.prevent="submitNewPassword" class="space-y-4">
            <div>
              <label for="new-password" class="block text-sm font-medium text-text-secondary mb-1">
                New Password
              </label>
              <input
                id="new-password"
                v-model="newPassword"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
                :disabled="submitting"
              />
            </div>
            <div>
              <label for="confirm-password" class="block text-sm font-medium text-text-secondary mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
                :disabled="submitting"
              />
            </div>
            <button
              type="submit"
              :disabled="submitting || !newPassword || !confirmPassword"
              class="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ submitting ? 'Updating…' : 'Update Password' }}
            </button>
          </form>
        </div>

        <!-- Reset success -->
        <div v-else-if="status === 'reset-success'" class="text-center">
          <div class="mx-auto w-16 h-16 bg-success-bg rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-text-primary mb-2">Password Updated</h1>
          <p class="text-text-secondary mb-6">You can now sign in with your new password.</p>
          <button
            @click="router.push('/login')"
            class="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to Sign In
          </button>
        </div>

        <!-- Error -->
        <div v-else class="text-center">
          <div class="mx-auto w-16 h-16 bg-error-bg rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-error-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-text-primary mb-2">Link Invalid or Expired</h1>
          <p class="text-text-secondary mb-6">{{ errorMessage }}</p>
          <button
            @click="router.push('/login')"
            class="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { validatePassword } from '@/utils/passwordValidation'

const route = useRoute()
const router = useRouter()
const baseUrl = import.meta.env.VITE_BACKEND_API_URL

type Status = 'loading' | 'verify-success' | 'reset-form' | 'reset-success' | 'error'

const status = ref<Status>('loading')
const errorMessage = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const formError = ref('')
const submitting = ref(false)

let token = ''

function extractErrorMessage(body: any, fallback: string): string {
  return body?.error?.message || fallback
}

async function submitNewPassword() {
  formError.value = ''

  if (newPassword.value !== confirmPassword.value) {
    formError.value = 'Passwords do not match'
    return
  }

  const passwordErrors = validatePassword(newPassword.value)
  if (passwordErrors.length > 0) {
    formError.value = passwordErrors[0]
    return
  }

  submitting.value = true
  try {
    const response = await fetch(`${baseUrl}/auth/reset-password-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: newPassword.value }),
    })
    const body = await response.json().catch(() => null)

    if (!response.ok) {
      formError.value = extractErrorMessage(body, 'This link is invalid or has expired.')
      return
    }

    status.value = 'reset-success'
  } catch {
    formError.value = 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  token = String(route.query.token || '')

  if (!token) {
    status.value = 'error'
    errorMessage.value = 'This link is missing required information.'
    return
  }

  if (route.name === 'reset-password') {
    status.value = 'reset-form'
    return
  }

  try {
    const response = await fetch(`${baseUrl}/auth/verify-email-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const body = await response.json().catch(() => null)

    if (!response.ok) {
      status.value = 'error'
      errorMessage.value = extractErrorMessage(body, 'This link is invalid or has expired.')
      return
    }

    status.value = 'verify-success'
  } catch {
    status.value = 'error'
    errorMessage.value = 'Something went wrong. Please try again.'
  }
})
</script>

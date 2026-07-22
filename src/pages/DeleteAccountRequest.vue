<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-surface rounded-2xl shadow-xl p-8">
        <div class="text-center mb-6">
          <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-text-primary mb-2">Delete Account</h1>
          <p class="text-text-secondary">
            Enter your email to request account deletion. We'll send a verification link.
          </p>
        </div>

        <form v-if="!submitted" class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">Email address</label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="your@email.com"
              class="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-surface text-text-primary placeholder:text-text-muted"
            />
          </div>

          <p v-if="errorMessage" class="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Sending...' : 'Send Verification Email' }}
          </button>

          <router-link
            to="/login"
            class="block text-center text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Back to sign in
          </router-link>
        </form>

        <div v-else class="text-center space-y-4">
          <div class="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p class="text-text-primary font-semibold">Check your inbox</p>
          <p class="text-sm text-text-secondary">
            If an account exists for <span class="font-medium text-text-primary">{{ email }}</span>,
            we've sent a link to confirm the deletion.
          </p>
          <router-link
            to="/login"
            class="block text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Back to sign in
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const errorMessage = ref('')

const API_BASE = import.meta.env.VITE_BACKEND_API_URL

async function handleSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(`${API_BASE}/public/account/delete-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      errorMessage.value = data?.error?.message || 'Failed to send verification email. Please try again.'
      return
    }

    submitted.value = true
  } catch {
    errorMessage.value = 'Failed to send verification email. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

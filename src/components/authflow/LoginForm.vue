<template>
  <FormErrorBoundary preserve-form-data>
    <div class="login-form">
      <h2 class="text-2xl font-bold mb-6 text-text-primary">Sign In</h2>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="mb-4 p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm"
      >
        {{ errorMessage }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Email Input -->
      <div>
        <label for="email" class="block text-sm font-medium text-text-secondary mb-1">
          Email
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          inputmode="email"
          required
          autocomplete="email"
          placeholder="you@example.com"
          class="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
          :disabled="loading"
        />
      </div>

      <!-- Password Input -->
      <div>
        <label for="password" class="block text-sm font-medium text-text-secondary mb-1">
          Password
        </label>
        <div class="relative">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
            placeholder="••••••••"
            class="w-full px-4 py-2 pr-10 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
            :disabled="loading"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            :disabled="loading"
          >
            <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.9 0 1.74-.13 2.5-.35"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="loading || !email || !password"
        class="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        <span v-if="loading">Signing in...</span>
        <span v-else>Sign In</span>
      </button>
    </form>

    <!-- Forgot Password Link -->
    <div class="mt-4 text-center text-sm text-text-secondary">
      <button
        @click="$emit('forgot-password')"
        class="text-primary hover:text-primary/90 font-medium transition-colors"
        type="button"
      >
        Forgot password?
      </button>
    </div>

    <!-- Sign Up Link -->
    <div class="mt-2 text-center text-sm text-text-secondary">
      Don't have an account?
      <button
        @click="$emit('switch-to-signup')"
        class="text-primary hover:text-primary/90 font-medium transition-colors"
        type="button"
      >
        Sign up
      </button>
    </div>
    </div>
  </FormErrorBoundary>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import FormErrorBoundary from '@/components/ui/FormErrorBoundary.vue'

// Emits
defineEmits<{
  'switch-to-signup': []
  'forgot-password': []
}>()

// Composables
const { signIn, loading } = useAuth()
const router = useRouter()

// Form state
const email = ref('')
const password = ref('')
const errorMessage = ref<string | null>(null)
const showPassword = ref(false)

async function handleSubmit() {
  errorMessage.value = null

  const { success, error } = await signIn(email.value, password.value)

  if (success) {
    // Redirect to dashboard
    router.push('/')
  } else {
    errorMessage.value = error || 'Failed to sign in'
  }
}
</script>

<style scoped>
.login-form {
  max-width: 28rem;
  margin: 0 auto;
  padding: 1.5rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
</style>

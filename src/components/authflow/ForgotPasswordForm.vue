<template>
  <div class="forgot-password-form">
    <h2 class="text-2xl font-bold mb-6 text-text-primary">Reset Password</h2>

    <!-- Success Message -->
    <div
      v-if="successMessage"
      class="mb-4 p-3 bg-success-bg border border-success-border text-success-text rounded-lg text-sm"
    >
      ✅ {{ successMessage }}
    </div>

    <!-- Error Message -->
    <div
      v-if="errorMessage"
      class="mb-4 p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm"
    >
      {{ errorMessage }}
    </div>

    <!-- Form -->
    <form v-if="!successMessage" @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Email Input -->
      <div>
        <label for="reset-email" class="block text-sm font-medium text-text-secondary mb-1">
          Email Address
        </label>
        <input
          id="reset-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="you@example.com"
          class="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
          :disabled="loading"
        />
        <p class="mt-1 text-xs text-text-muted">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="loading || !email"
        class="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        <span v-if="loading">Sending...</span>
        <span v-else>Send Reset Link</span>
      </button>
    </form>

    <!-- Back to Login -->
    <div class="mt-4 text-center text-sm text-text-secondary">
      <button
        @click="$emit('back-to-login')"
        class="text-primary hover:text-primary/90 font-medium"
        type="button"
      >
        ← Back to Sign In
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

// Emits
defineEmits<{
  'back-to-login': []
}>()

// Composables
const { resetPassword, loading } = useAuth()

// Form state
const email = ref('')
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

async function handleSubmit() {
  errorMessage.value = null
  successMessage.value = null

  const { success, message } = await resetPassword(email.value)

  if (success) {
    successMessage.value = message || 'Password reset email sent! Please check your inbox.'
  } else {
    errorMessage.value = message || 'Failed to send reset email'
  }
}
</script>

<style scoped>
.forgot-password-form {
  @apply max-w-md mx-auto p-6 bg-white rounded-lg shadow-md;
}
</style>

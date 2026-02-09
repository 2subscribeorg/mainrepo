<template>
  <div class="signup-form">
    <h2 class="text-2xl font-bold mb-6 text-text-primary">Create Account</h2>

    <!-- Error Message -->
    <div
      v-if="errorMessage"
      class="mb-4 p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm"
    >
      {{ errorMessage }}
    </div>

    <!-- Validation Errors -->
    <div
      v-if="validationErrors.length > 0"
      class="mb-4 p-3 bg-warning-bg border border-warning-border text-warning-text rounded-lg text-sm"
    >
      <ul class="list-disc list-inside space-y-1">
        <li v-for="error in validationErrors" :key="error">{{ error }}</li>
      </ul>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Email Input -->
      <div>
        <label for="signup-email" class="block text-sm font-medium text-text-secondary mb-1">
          Email
        </label>
        <input
          id="signup-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="you@example.com"
          class="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
          :disabled="loading"
          @blur="validateEmail"
        />
      </div>

      <!-- Password Input -->
      <div>
        <label for="signup-password" class="block text-sm font-medium text-text-secondary mb-1">
          Password
        </label>
        <input
          id="signup-password"
          v-model="password"
          type="password"
          required
          autocomplete="new-password"
          placeholder="••••••••"
          class="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
          :disabled="loading"
          @input="validatePassword"
        />
        <p class="mt-1 text-xs text-text-muted">
          Password must be at least 8 characters
        </p>
      </div>

      <!-- Confirm Password Input -->
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
          placeholder="••••••••"
          class="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
          :disabled="loading"
          @input="validateConfirmPassword"
        />
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="loading || !isFormValid"
        class="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        <span v-if="loading">Creating account...</span>
        <span v-else>Sign Up</span>
      </button>
    </form>

    <!-- Sign In Link -->
    <div class="mt-4 text-center text-sm text-text-secondary">
      Already have an account?
      <button
        @click="$emit('switch-to-login')"
        class="text-primary hover:text-primary/90 font-medium"
        type="button"
      >
        Sign in
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

// Emits
defineEmits<{
  'switch-to-login': []
}>()

// Composables
const { signUp, loading } = useAuth()
const router = useRouter()

// Form state
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref<string | null>(null)
const validationErrors = ref<string[]>([])

// Validation
function validateEmail() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    return 'Please enter a valid email address'
  }
  return null
}

function validatePassword() {
  const errors: string[] = []
  
  if (password.value.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  
  if (password.value.length < 12 && !/\d/.test(password.value)) {
    errors.push('Consider adding numbers for better security')
  }
  
  return errors
}

function validateConfirmPassword() {
  if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
    return 'Passwords do not match'
  }
  return null
}

function validateForm(): boolean {
  const errors: string[] = []
  
  const emailError = validateEmail()
  if (emailError) errors.push(emailError)
  
  const passwordErrors = validatePassword()
  errors.push(...passwordErrors)
  
  const confirmError = validateConfirmPassword()
  if (confirmError) errors.push(confirmError)
  
  validationErrors.value = errors
  return errors.length === 0
}

const isFormValid = computed(() => {
  return email.value && 
         password.value && 
         confirmPassword.value && 
         password.value === confirmPassword.value &&
         password.value.length >= 8
})

async function handleSubmit() {
  errorMessage.value = null
  validationErrors.value = []

  // Validate form
  if (!validateForm()) {
    return
  }

  const { success, error } = await signUp(email.value, password.value)

  if (success) {
    // Redirect to dashboard
    router.push('/')
  } else {
    errorMessage.value = error || 'Failed to create account'
  }
}
</script>

<style scoped>
.signup-form {
  @apply max-w-md mx-auto p-6 bg-white rounded-lg shadow-md;
}
</style>

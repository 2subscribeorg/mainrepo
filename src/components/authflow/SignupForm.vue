<template>
  <FormErrorBoundary preserve-form-data>
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
          inputmode="email"
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
        <div class="relative">
          <input
            id="signup-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="new-password"
            placeholder="••••••••"
            class="w-full px-4 py-2 pr-10 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
            :disabled="loading"
            @input="validatePassword"
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
        <PasswordStrengthIndicator :password="password" />
        <!-- Live password validation errors -->
        <div
          v-if="livePasswordErrors.length > 0 && password.length > 0"
          class="mt-2 p-2 bg-error-bg border border-error-border text-error-text rounded-lg text-xs"
        >
          <ul class="list-disc list-inside space-y-0.5">
            <li v-for="error in livePasswordErrors" :key="error">{{ error }}</li>
          </ul>
        </div>
      </div>

      <!-- Confirm Password Input -->
      <div>
        <label for="confirm-password" class="block text-sm font-medium text-text-secondary mb-1">
          Confirm Password
        </label>
        <div class="relative">
          <input
            id="confirm-password"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            required
            autocomplete="new-password"
            placeholder="••••••••"
            class="w-full px-4 py-2 pr-10 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
            :disabled="loading"
            @input="validateConfirmPassword"
          />
          <button
            type="button"
            @click="showConfirmPassword = !showConfirmPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            :disabled="loading"
          >
            <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        <!-- Live confirm password error -->
        <p
          v-if="liveConfirmError && confirmPassword.length > 0"
          class="mt-1.5 text-xs text-error-text"
        >
          {{ liveConfirmError }}
        </p>
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
  </FormErrorBoundary>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator.vue'
import { validatePassword as validatePasswordStrength, isPasswordValid } from '@/utils/passwordValidation'
import FormErrorBoundary from '@/components/ui/FormErrorBoundary.vue'

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
const livePasswordErrors = ref<string[]>([])
const liveConfirmError = ref<string | null>(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Validation
function validateEmail() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    return 'Please enter a valid email address'
  }
  return null
}

function validatePassword() {
  const errors = validatePasswordStrength(password.value)
  livePasswordErrors.value = errors
  return errors
}

function validateConfirmPassword() {
  if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
    liveConfirmError.value = 'Passwords do not match'
    return 'Passwords do not match'
  }
  liveConfirmError.value = null
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
         isPasswordValid(password.value)
})

async function handleSubmit() {
  errorMessage.value = null
  validationErrors.value = []

  // Validate form
  if (!validateForm()) {
    return
  }

  // Check if email verification is required
  const requireVerification = import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === 'true'
  
  const result = await signUp(email.value, password.value, requireVerification)

  if (result?.success) {
    if (result.needsVerification) {
      // Redirect to verification page
      router.push('/verify-email')
    } else {
      // Redirect to dashboard
      router.push('/')
    }
  } else {
    errorMessage.value = result?.error || 'Failed to create account'
  }
}
</script>

<style scoped>
.signup-form {
  @apply max-w-md mx-auto p-6 bg-white rounded-lg shadow-md;
}
</style>

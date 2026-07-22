<template>
  <FormErrorBoundary preserve-form-data>
    <div class="login-form">

      <template v-if="step === 'credentials'">
        <h2 class="text-2xl font-bold mb-6 text-text-primary">Sign In</h2>

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

          <button
            type="submit"
            :disabled="loading || !email || !password"
            class="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <span v-if="loading">Signing in...</span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <div class="mt-4 text-center text-sm text-text-secondary">
          <button @click="$emit('forgot-password')" class="text-primary hover:text-primary/90 font-medium transition-colors" type="button">
            Forgot password?
          </button>
        </div>

        <div class="mt-2 text-center text-sm text-text-secondary">
          Don't have an account?
          <button @click="$emit('switch-to-signup')" class="text-primary hover:text-primary/90 font-medium transition-colors" type="button">
            Sign up
          </button>
        </div>
      </template>

      <template v-else-if="step === 'mfa'">
        <h2 class="text-2xl font-bold mb-2 text-text-primary">Verify your identity</h2>
        <p class="text-sm text-text-secondary mb-6">
          <span v-if="mfaSending">Sending code to your phone...</span>
          <span v-else>Enter the verification code sent to your phone.</span>
        </p>

        <div
          v-if="errorMessage"
          class="mb-4 p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm"
        >
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleMfaSubmit" class="space-y-4">
          <div>
            <label for="otp" class="block text-sm font-medium text-text-secondary mb-1">Verification code</label>
            <input
              id="otp"
              v-model="otp"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              autocomplete="one-time-code"
              placeholder="123456"
              class="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary tracking-widest text-center text-lg"
              :disabled="loading || mfaSending"
            />
          </div>

          <button
            type="submit"
            :disabled="loading || mfaSending || otp.length < 6"
            class="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <span v-if="loading">Verifying...</span>
            <span v-else>Verify</span>
          </button>
        </form>

        <div class="mt-4 text-center text-sm text-text-secondary">
          <button @click="resetToCredentials" class="text-primary hover:text-primary/90 font-medium transition-colors" type="button">
            Back to sign in
          </button>
        </div>
      </template>

      <div ref="recaptchaContainer" class="hidden" />

    </div>
  </FormErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import { createRecaptchaVerifier } from '@/config/firebase'
import FormErrorBoundary from '@/components/ui/FormErrorBoundary.vue'
import type { RecaptchaVerifier } from 'firebase/auth'

defineEmits<{
  'switch-to-signup': []
  'forgot-password': []
}>()

const { signIn, sendMfaChallengeCode, completeMfaSignIn, loading } = useAuth()
const router = useRouter()

const step = ref<'credentials' | 'mfa'>('credentials')
const email = ref('')
const password = ref('')
const otp = ref('')
const errorMessage = ref<string | null>(null)
const showPassword = ref(false)
const mfaSending = ref(false)
const recaptchaContainer = ref<HTMLElement | null>(null)
let recaptchaVerifier: RecaptchaVerifier | null = null

async function handleSubmit() {
  errorMessage.value = null
  const result = await signIn(email.value, password.value)

  if (result.success) {
    router.push('/')
  } else if (result.mfaRequired) {
    step.value = 'mfa'
    await sendSmsChallenge()
  } else {
    errorMessage.value = result.error || 'Failed to sign in'
  }
}

async function sendSmsChallenge() {
  mfaSending.value = true
  errorMessage.value = null
  try {
    if (!recaptchaContainer.value) throw new Error('reCAPTCHA container not ready')
    recaptchaVerifier = createRecaptchaVerifier(recaptchaContainer.value)
    const { success, error } = await sendMfaChallengeCode(recaptchaVerifier)
    if (!success) errorMessage.value = error
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Failed to send verification code'
  } finally {
    mfaSending.value = false
  }
}

async function handleMfaSubmit() {
  errorMessage.value = null
  const { success, error } = await completeMfaSignIn(otp.value)
  if (success) {
    router.push('/')
  } else {
    errorMessage.value = error || 'Invalid verification code'
    otp.value = ''
  }
}

function resetToCredentials() {
  step.value = 'credentials'
  otp.value = ''
  errorMessage.value = null
  recaptchaVerifier?.clear()
  recaptchaVerifier = null
}

onUnmounted(() => {
  recaptchaVerifier?.clear()
})
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

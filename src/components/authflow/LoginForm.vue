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

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label for="email" class="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="you@example.com"
              class="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :disabled="loading"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-text-secondary mb-1">Password</label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="Password"
                class="w-full px-4 py-2 pr-10 border border-border-light rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
                :disabled="loading"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                :disabled="loading"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <EyeOff v-if="showPassword" :size="20" />
                <Eye v-else :size="20" />
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
          <button class="text-primary hover:text-primary/90 font-medium transition-colors" type="button" @click="$emit('forgot-password')">
            Forgot password?
          </button>
        </div>

        <div class="mt-2 text-center text-sm text-text-secondary">
          Don't have an account?
          <button class="text-primary hover:text-primary/90 font-medium transition-colors" type="button" @click="$emit('switch-to-signup')">
            Sign up
          </button>
        </div>
      </template>

      <template v-else-if="step === 'mfa'">
        <h2 class="text-2xl font-bold mb-2 text-text-primary">Verify your identity</h2>
        <p class="text-sm text-text-secondary mb-6">
          <span v-if="mfaSending">Sending code to your phone...</span>
          <span v-else-if="mfaCodeSent">Enter the verification code sent to your phone.</span>
          <span v-else>Send a verification code to continue.</span>
        </p>

        <div
          v-if="errorMessage"
          class="mb-4 p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm"
        >
          {{ errorMessage }}
        </div>

        <form class="space-y-4" @submit.prevent="handleMfaSubmit">
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
              :disabled="loading || mfaSending || !mfaCodeSent"
            />
          </div>

          <button
            type="submit"
            :disabled="loading || mfaSending || !mfaCodeSent || otp.length < 6"
            class="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <span v-if="loading">Verifying...</span>
            <span v-else>Verify</span>
          </button>
        </form>

        <div class="mt-4 text-center text-sm text-text-secondary space-y-2">
          <button
            class="text-primary hover:text-primary/90 font-medium transition-colors block w-full disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            :disabled="loading || mfaSending"
            @click="sendSmsChallenge"
          >
            {{ mfaCodeSent ? 'Resend code' : 'Send verification code' }}
          </button>
          <button class="text-primary hover:text-primary/90 font-medium transition-colors" type="button" @click="resetToCredentials">
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
import { Eye, EyeOff } from 'lucide-vue-next'
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
const mfaCodeSent = ref(false)
const recaptchaContainer = ref<HTMLElement | null>(null)
let recaptchaVerifier: RecaptchaVerifier | null = null

function getSignInErrorMessage(code: string): string {
  switch (code.toUpperCase()) {
    case 'ACCOUNT_BANNED':
    case 'ACCOUNT_DISABLED':
      return 'Your account has been deactivated. Please contact support.'
    case 'ACCOUNT_DEACTIVATED':
      return 'Your account has been deactivated by an administrator. Please contact support.'
    case 'ACCOUNT_DELETED_BANNED':
      return 'This account no longer exists and this email address cannot be reused. Please contact support.'
    case 'ACCOUNT_NOT_FOUND':
      return 'No account found with this email address.'
    case 'WRONG_PASSWORD':
      return 'Incorrect email or password.'
    case 'TOO_MANY_REQUESTS':
      return 'Too many sign-in attempts. Please wait a few minutes and try again.'
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection and try again.'
    case 'SESSION_EXPIRED':
      return 'Your session has expired. Please sign in again.'
    case 'SIGN_IN_FAILED':
    default:
      return code.length > 30 ? code : 'Sign in failed. Please try again.'
  }
}

async function handleSubmit() {
  errorMessage.value = null
  const result = await signIn(email.value, password.value)

  if (result.success) {
    router.push('/')
  } else if (result.mfaRequired) {
    step.value = 'mfa'
    mfaCodeSent.value = false
    await sendSmsChallenge()
  } else {
    errorMessage.value = getSignInErrorMessage(result.error || 'SIGN_IN_FAILED')
  }
}

function clearRecaptcha() {
  recaptchaVerifier?.clear()
  recaptchaVerifier = null
}

async function sendSmsChallenge() {
  mfaSending.value = true
  errorMessage.value = null
  mfaCodeSent.value = false
  try {
    if (!recaptchaContainer.value) throw new Error('reCAPTCHA container not ready')
    clearRecaptcha()
    recaptchaVerifier = createRecaptchaVerifier(recaptchaContainer.value)
    const { success, error } = await sendMfaChallengeCode(recaptchaVerifier)
    if (success) {
      mfaCodeSent.value = true
    } else {
      errorMessage.value = error
      clearRecaptcha()
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Failed to send verification code'
    clearRecaptcha()
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
  mfaCodeSent.value = false
  clearRecaptcha()
}

onUnmounted(clearRecaptcha)
</script>

<style scoped>
.login-form {
  max-width: 28rem;
  margin: 0 auto;
  padding: 1.5rem;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
</style>

<template>
  <div class="border border-border-light rounded-lg p-4">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h4 class="font-medium text-text-primary">Two-Factor Authentication</h4>
        <p class="text-sm text-text-secondary mt-0.5">
          Add an extra layer of security with SMS verification.
        </p>
      </div>
      <span
        :class="isEnrolled
          ? 'bg-success-bg text-success-text border-success-border'
          : 'bg-surface-elevated text-text-muted border-border-light'"
        class="text-xs font-medium px-2.5 py-1 rounded-full border"
      >
        {{ isEnrolled ? 'Enabled' : 'Disabled' }}
      </span>
    </div>

    <template v-if="isEnrolled">
      <p class="text-sm text-text-secondary mb-4">
        Verification codes will be sent to
        <span class="font-medium text-text-primary">{{ maskedPhoneNumber }}</span>.
      </p>
      <div v-if="successMessage" class="mb-3 p-3 bg-success-bg border border-success-border text-success-text rounded-lg text-sm">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="mb-3 p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm">
        {{ errorMessage }}
      </div>
      <form class="space-y-3" @submit.prevent="handleDisable">
        <div>
          <label for="disable-password" class="block text-sm font-medium text-text-secondary mb-1">
            Current password
          </label>
          <input
            id="disable-password"
            v-model="disablePassword"
            type="password"
            autocomplete="current-password"
            placeholder="Confirm your password"
            class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
            :disabled="loading"
          />
        </div>
        <button
          type="submit"
          :disabled="loading || !disablePassword"
          class="w-full border border-error-border text-error-text py-2 px-4 rounded-md hover:bg-error-bg/50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          <span v-if="loading">Disabling...</span>
          <span v-else>Disable 2FA</span>
        </button>
      </form>
    </template>

    <template v-else>
      <div v-if="successMessage" class="mb-3 p-3 bg-success-bg border border-success-border text-success-text rounded-lg text-sm">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="mb-3 p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm">
        {{ errorMessage }}
      </div>

      <template v-if="enrollStep === 'phone'">
        <form class="space-y-3" @submit.prevent="handleSendCode">
          <div>
            <label for="enroll-password" class="block text-sm font-medium text-text-secondary mb-1">
              Current password
            </label>
            <input
              id="enroll-password"
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              placeholder="Confirm your password"
              class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :disabled="loading"
            />
          </div>
          <div>
            <label for="phone" class="block text-sm font-medium text-text-secondary mb-1">
              Phone number
            </label>
            <input
              id="phone"
              v-model="phoneNumber"
              type="tel"
              placeholder="+919985520424"
              autocomplete="tel"
              class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :disabled="loading"
            />
            <p class="mt-1 text-xs text-text-muted">Include country code, e.g. +91 for India. SMS delivery requires the Firebase billing plan to be enabled.</p>
          </div>
          <button
            type="submit"
            :disabled="loading || !canSendCode"
            class="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <span v-if="loading">Sending code...</span>
            <span v-else>Send verification code</span>
          </button>
        </form>
      </template>

      <template v-else-if="enrollStep === 'otp'">
        <p class="text-sm text-text-secondary mb-3">
          Enter the 6-digit code sent to <span class="font-medium text-text-primary">{{ normalizedPhoneNumber }}</span>.
        </p>
        <form class="space-y-3" @submit.prevent="handleVerifyCode">
          <div>
            <label for="enroll-otp" class="block text-sm font-medium text-text-secondary mb-1">
              Verification code
            </label>
            <input
              id="enroll-otp"
              v-model="otp"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              autocomplete="one-time-code"
              placeholder="123456"
              class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary tracking-widest text-center text-lg"
              :disabled="loading"
            />
          </div>
          <button
            type="submit"
            :disabled="loading || otp.trim().length < 6"
            class="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <span v-if="loading">Verifying...</span>
            <span v-else>Enable 2FA</span>
          </button>
          <button
            type="button"
            class="w-full text-sm text-text-secondary hover:text-text-primary transition-colors"
            :disabled="loading"
            @click="resetEnrollment()"
          >
            Use a different number
          </button>
        </form>
      </template>
    </template>

    <div ref="recaptchaContainer" class="hidden" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { createRecaptchaVerifier } from '@/config/firebase'
import type { RecaptchaVerifier } from 'firebase/auth'

const {
  reauthenticate,
  sendMfaEnrollmentCode,
  completeMfaEnrollment,
  unenrollMfa,
  getMfaEnrolledFactors,
} = useAuth()

const enrollStep = ref<'phone' | 'otp'>('phone')
const currentPassword = ref('')
const disablePassword = ref('')
const phoneNumber = ref('')
const otp = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const recaptchaContainer = ref<HTMLElement | null>(null)
let recaptchaVerifier: RecaptchaVerifier | null = null

const enrolledFactors = ref(getMfaEnrolledFactors())
const isEnrolled = computed(() => enrolledFactors.value.length > 0)
const normalizedPhoneNumber = computed(() => phoneNumber.value.trim().replace(/\s+/g, ''))
const canSendCode = computed(() => currentPassword.value.length > 0 && isValidPhoneNumber(normalizedPhoneNumber.value))

const maskedPhoneNumber = computed(() => {
  const hint = enrolledFactors.value[0]
  const phone = (hint as any)?.phoneNumber as string | undefined
  if (!phone) return 'your phone'
  return phone.replace(/(\+\d{1,3})\d+(\d{4})$/, '$1*****$2')
})

function isValidPhoneNumber(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value)
}

function refreshEnrolledFactors() {
  enrolledFactors.value = getMfaEnrolledFactors()
}

function clearRecaptcha() {
  recaptchaVerifier?.clear()
  recaptchaVerifier = null
}

async function confirmRecentLogin(password: string) {
  const result = await reauthenticate(password)
  if (!result.success) {
    errorMessage.value = result.message || 'Please confirm your password before changing two-factor authentication.'
    return false
  }
  return true
}

onMounted(refreshEnrolledFactors)

onUnmounted(clearRecaptcha)

function mapMfaError(e: unknown): string {
  const code = (e as any)?.code as string | undefined
  switch (code) {
    case 'auth/requires-recent-login':
      return 'Your session has expired. Please sign out and sign back in, then try again.'
    case 'auth/invalid-phone-number':
      return 'Invalid phone number. Make sure to include the country code, e.g. +919985520424.'
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded. Please try again later or use a test number.'
    case 'auth/captcha-check-failed':
    case 'auth/recaptcha-not-enabled':
      return 'reCAPTCHA verification failed. On a physical device, make sure the SHA-1 fingerprint is registered in Firebase Console.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes before trying again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.'
    default:
      return e instanceof Error ? e.message : 'Failed to send code. Please try again.'
  }
}

async function handleSendCode() {
  errorMessage.value = null
  successMessage.value = null

  if (!currentPassword.value) {
    errorMessage.value = 'Enter your current password before enabling 2FA.'
    return
  }

  if (!isValidPhoneNumber(normalizedPhoneNumber.value)) {
    errorMessage.value = 'Enter a valid phone number with country code, e.g. +919985520424.'
    return
  }

  loading.value = true
  try {
    const isFreshLogin = await confirmRecentLogin(currentPassword.value)
    if (!isFreshLogin) return

    if (!recaptchaContainer.value) throw new Error('reCAPTCHA container not ready')
    clearRecaptcha()
    recaptchaVerifier = createRecaptchaVerifier(recaptchaContainer.value)

    const { success, error } = await sendMfaEnrollmentCode(normalizedPhoneNumber.value, recaptchaVerifier)
    if (success) {
      enrollStep.value = 'otp'
      successMessage.value = `Verification code sent to ${normalizedPhoneNumber.value}.`
    } else {
      errorMessage.value = error || 'Failed to send code.'
      clearRecaptcha()
    }
  } catch (e) {
    errorMessage.value = mapMfaError(e)
    clearRecaptcha()
  } finally {
    loading.value = false
  }
}

async function handleVerifyCode() {
  errorMessage.value = null
  successMessage.value = null

  const code = otp.value.trim()
  if (code.length < 6) {
    errorMessage.value = 'Enter the 6-digit verification code.'
    return
  }

  loading.value = true
  try {
    const { success, error } = await completeMfaEnrollment(code)
    if (success) {
      successMessage.value = 'Two-factor authentication enabled.'
      currentPassword.value = ''
      refreshEnrolledFactors()
      resetEnrollment({ clearMessages: false })
    } else {
      errorMessage.value = error
      otp.value = ''
    }
  } catch (e) {
    const code = (e as any)?.code as string | undefined
    if (code === 'auth/invalid-verification-code') {
      errorMessage.value = 'Incorrect code. Please check the SMS and try again.'
    } else if (code === 'auth/code-expired') {
      errorMessage.value = 'Code has expired. Go back and request a new one.'
    } else {
      errorMessage.value = e instanceof Error ? e.message : 'Invalid verification code.'
    }
    otp.value = ''
  } finally {
    loading.value = false
  }
}

async function handleDisable() {
  errorMessage.value = null
  successMessage.value = null

  if (!disablePassword.value) {
    errorMessage.value = 'Enter your current password before disabling 2FA.'
    return
  }

  loading.value = true
  try {
    const isFreshLogin = await confirmRecentLogin(disablePassword.value)
    if (!isFreshLogin) return

    const { success, error } = await unenrollMfa()
    if (success) {
      successMessage.value = 'Two-factor authentication disabled.'
      disablePassword.value = ''
      refreshEnrolledFactors()
    } else {
      errorMessage.value = error
    }
  } finally {
    loading.value = false
  }
}

function resetEnrollment(options: { clearMessages?: boolean } = {}) {
  enrollStep.value = 'phone'
  phoneNumber.value = ''
  otp.value = ''
  if (options.clearMessages !== false) {
    errorMessage.value = null
    successMessage.value = null
  }
  clearRecaptcha()
}
</script>

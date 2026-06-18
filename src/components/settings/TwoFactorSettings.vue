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
      <button
        type="button"
        :disabled="loading"
        class="w-full border border-error-border text-error-text py-2 px-4 rounded-md hover:bg-error-bg/50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        @click="handleDisable"
      >
        <span v-if="loading">Disabling...</span>
        <span v-else>Disable 2FA</span>
      </button>
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
            <label for="phone" class="block text-sm font-medium text-text-secondary mb-1">
              Phone number
            </label>
            <input
              id="phone"
              v-model="phoneNumber"
              type="tel"
              placeholder="+447700900000"
              autocomplete="tel"
              class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :disabled="loading"
            />
            <p class="mt-1 text-xs text-text-muted">Include country code, e.g. +44 for UK.</p>
          </div>
          <button
            type="submit"
            :disabled="loading || !phoneNumber.trim()"
            class="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <span v-if="loading">Sending code...</span>
            <span v-else>Send verification code</span>
          </button>
        </form>
      </template>

      <template v-else-if="enrollStep === 'otp'">
        <p class="text-sm text-text-secondary mb-3">
          Enter the 6-digit code sent to <span class="font-medium text-text-primary">{{ phoneNumber }}</span>.
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
            :disabled="loading || otp.length < 6"
            class="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <span v-if="loading">Verifying...</span>
            <span v-else>Enable 2FA</span>
          </button>
          <button
            type="button"
            class="w-full text-sm text-text-secondary hover:text-text-primary transition-colors"
            @click="resetEnrollment"
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

const { sendMfaEnrollmentCode, completeMfaEnrollment, unenrollMfa, getMfaEnrolledFactors } = useAuth()

const enrollStep = ref<'phone' | 'otp'>('phone')
const phoneNumber = ref('')
const otp = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const recaptchaContainer = ref<HTMLElement | null>(null)
let recaptchaVerifier: RecaptchaVerifier | null = null

const enrolledFactors = ref(getMfaEnrolledFactors())

const isEnrolled = computed(() => enrolledFactors.value.length > 0)

const maskedPhoneNumber = computed(() => {
  const hint = enrolledFactors.value[0]
  const phone = (hint as any)?.phoneNumber as string | undefined
  if (!phone) return 'your phone'
  return phone.replace(/(\+\d{1,3})\d+(\d{4})$/, '$1•••••$2')
})

function refreshEnrolledFactors() {
  enrolledFactors.value = getMfaEnrolledFactors()
}

onMounted(refreshEnrolledFactors)

onUnmounted(() => {
  recaptchaVerifier?.clear()
})

async function handleSendCode() {
  errorMessage.value = null
  if (!phoneNumber.value.trim()) return
  loading.value = true
  try {
    if (!recaptchaContainer.value) throw new Error('reCAPTCHA container not ready')
    recaptchaVerifier?.clear()
    recaptchaVerifier = createRecaptchaVerifier(recaptchaContainer.value)
    const { success, error } = await sendMfaEnrollmentCode(phoneNumber.value.trim(), recaptchaVerifier)
    if (success) {
      enrollStep.value = 'otp'
    } else {
      errorMessage.value = error
      recaptchaVerifier?.clear()
      recaptchaVerifier = null
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Failed to send code'
    recaptchaVerifier?.clear()
    recaptchaVerifier = null
  } finally {
    loading.value = false
  }
}

async function handleVerifyCode() {
  errorMessage.value = null
  loading.value = true
  try {
    const { success, error } = await completeMfaEnrollment(otp.value)
    if (success) {
      successMessage.value = 'Two-factor authentication enabled.'
      refreshEnrolledFactors()
      resetEnrollment()
    } else {
      errorMessage.value = error
      otp.value = ''
    }
  } finally {
    loading.value = false
  }
}

async function handleDisable() {
  errorMessage.value = null
  successMessage.value = null
  loading.value = true
  try {
    const { success, error } = await unenrollMfa()
    if (success) {
      successMessage.value = 'Two-factor authentication disabled.'
      refreshEnrolledFactors()
    } else {
      errorMessage.value = error
    }
  } finally {
    loading.value = false
  }
}

function resetEnrollment() {
  enrollStep.value = 'phone'
  otp.value = ''
  errorMessage.value = null
  recaptchaVerifier?.clear()
  recaptchaVerifier = null
}
</script>

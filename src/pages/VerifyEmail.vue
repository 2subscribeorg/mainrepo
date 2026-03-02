<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-surface rounded-2xl shadow-xl p-8">
        <div class="text-center mb-6">
          <div class="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-text-primary mb-2">Verify Your Email</h1>
          <p class="text-text-secondary">
            We've sent a verification email to
          </p>
          <p class="text-primary font-semibold mt-1">{{ userEmail }}</p>
        </div>

        <div v-if="message" :class="messageClass" class="mb-6 p-4 rounded-xl text-sm">
          {{ message }}
        </div>

        <div class="space-y-4">
          <p class="text-sm text-text-secondary text-center">
            Please check your inbox and click the verification link to activate your account.
          </p>

          <button
            @click="checkVerification"
            :disabled="isChecking"
            class="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isChecking ? 'Checking...' : "I've Verified My Email" }}
          </button>

          <button
            @click="resendEmail"
            :disabled="isResending || cooldownSeconds > 0"
            class="w-full bg-surface-elevated text-text-primary py-3 rounded-xl font-semibold hover:bg-surface-elevated/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ resendButtonText }}
          </button>

          <button
            @click="signOut"
            class="w-full text-text-secondary py-2 text-sm hover:text-text-primary transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div class="mt-6 pt-6 border-t border-border-light">
          <p class="text-xs text-text-muted text-center">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getFirebaseAuth } from '@/config/firebase'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { emailVerificationService } from '@/services/EmailVerificationService'

const router = useRouter()
const auth = getFirebaseAuth()

const userEmail = ref('')
const message = ref('')
const messageType = ref<'success' | 'error' | ''>('')
const isChecking = ref(false)
const isResending = ref(false)
const cooldownSeconds = ref(0)

let cooldownInterval: number | null = null

const messageClass = computed(() => {
  if (messageType.value === 'success') {
    return 'bg-success-bg text-success-text'
  }
  if (messageType.value === 'error') {
    return 'bg-error-bg text-error-text'
  }
  return ''
})

const resendButtonText = computed(() => {
  if (isResending.value) return 'Sending...'
  if (cooldownSeconds.value > 0) return `Resend in ${cooldownSeconds.value}s`
  return 'Resend Verification Email'
})

async function checkVerification() {
  const user = auth.currentUser
  if (!user) {
    showMessage('Please sign in again', 'error')
    router.push('/login')
    return
  }

  isChecking.value = true
  message.value = ''

  const isVerified = await emailVerificationService.reloadAndCheckVerification(user)

  if (isVerified) {
    showMessage('Email verified successfully!', 'success')
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  } else {
    showMessage('Email not verified yet. Please check your inbox.', 'error')
  }

  isChecking.value = false
}

async function resendEmail() {
  const user = auth.currentUser
  if (!user) {
    showMessage('Please sign in again', 'error')
    router.push('/login')
    return
  }

  isResending.value = true
  message.value = ''

  const result = await emailVerificationService.sendVerificationEmail(user)

  if (result.success) {
    showMessage('Verification email sent! Please check your inbox.', 'success')
    startCooldown()
  } else {
    showMessage(result.error || 'Failed to send email', 'error')
  }

  isResending.value = false
}

async function signOut() {
  try {
    await firebaseSignOut(auth)
    router.push('/login')
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

function showMessage(text: string, type: 'success' | 'error') {
  message.value = text
  messageType.value = type
}

function startCooldown() {
  cooldownSeconds.value = 60
  cooldownInterval = window.setInterval(() => {
    cooldownSeconds.value--
    if (cooldownSeconds.value <= 0 && cooldownInterval) {
      clearInterval(cooldownInterval)
      cooldownInterval = null
    }
  }, 1000)
}

onMounted(() => {
  const user = auth.currentUser
  if (!user) {
    router.push('/login')
    return
  }

  userEmail.value = user.email || ''

  if (user.emailVerified) {
    router.push('/dashboard')
  }
})

onUnmounted(() => {
  if (cooldownInterval) {
    clearInterval(cooldownInterval)
  }
})
</script>

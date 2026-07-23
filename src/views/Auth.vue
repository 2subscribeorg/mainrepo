<template>
  <div class="auth-page min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo/Header -->
      <div class="text-center">
        <h1 class="text-4xl font-bold text-white">2Subscribe</h1>
        <p class="mt-2 text-white/80">Manage your subscriptions effortlessly</p>
      </div>

      <!-- Force-logout reason banner -->
      <div
        v-if="forcedOutMessage && mode === 'login'"
        class="mb-4 p-3 bg-warning-bg border border-warning-border text-warning-text rounded-lg text-sm text-center"
      >
        {{ forcedOutMessage }}
      </div>

      <!-- Login, Signup, or Forgot Password Form -->
      <ErrorBoundary component="AuthForms">
        <div class="mt-8">
          <LoginForm
            v-if="mode === 'login'"
            @switch-to-signup="mode = 'signup'"
            @forgot-password="mode = 'forgot'"
          />
          <SignupForm
            v-else-if="mode === 'signup'"
            @switch-to-login="mode = 'login'"
          />
          <ForgotPasswordForm
            v-else-if="mode === 'forgot'"
            @back-to-login="mode = 'login'"
          />
        </div>
      </ErrorBoundary>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoginForm from '@/components/authflow/LoginForm.vue'
import SignupForm from '@/components/authflow/SignupForm.vue'
import ForgotPasswordForm from '@/components/authflow/ForgotPasswordForm.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import { useOnboardingStore } from '@/stores/onboarding'

const route = useRoute()
const router = useRouter()
const onboardingStore = useOnboardingStore()

const mode = ref<'login' | 'signup' | 'forgot'>(
  (route.query.mode as string) === 'signup' ? 'signup' : 'login'
)

onMounted(() => {
  if (!onboardingStore.carouselSeen) {
    router.replace('/welcome')
  }
})

const forcedOutMessage = computed(() => {
  const reason = route.query.reason as string | undefined
  if (reason === 'banned')          return 'Your account has been suspended. Please contact support.'
  if (reason === 'deactivated')     return 'Your account has been deactivated. Please contact support.'
  if (reason === 'deleted')         return 'Your account no longer exists.'
  if (reason === 'session_expired') return 'Your session has expired. Please sign in again.'
  return null
})

// When the header "Sign In" button sets ?mode=login, sync the mode
watch(() => route.query.mode, (m) => {
  if (m === 'login') mode.value = 'login'
  else if (m === 'signup') mode.value = 'signup'
})

// Keep URL in sync when mode changes internally (e.g. "Sign in" link inside form)
watch(mode, (m) => {
  router.replace({ query: m === 'login' ? {} : { mode: m } })
})
</script>

<style scoped>
.auth-page {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, #4A2FB0) 100%);
}
</style>

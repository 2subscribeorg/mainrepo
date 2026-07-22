<template>
  <div class="auth-page min-h-screen bg-surface flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo/Header -->
      <div class="text-center">
        <h1 class="text-4xl font-bold text-primary">2Subscribe</h1>
        <p class="mt-2 text-text-secondary">Manage your subscriptions effortlessly</p>
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

      <!-- Mode Toggle (Alternative) -->
      <div class="text-center text-sm text-text-muted">
        <p v-if="isFirebaseMode">
          Using Firebase Authentication
        </p>
        <p v-else>
          Using Mock Authentication (Development Mode)
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LoginForm from '@/components/authflow/LoginForm.vue'
import SignupForm from '@/components/authflow/SignupForm.vue'
import ForgotPasswordForm from '@/components/authflow/ForgotPasswordForm.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'

const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'
const mode = ref<'login' | 'signup' | 'forgot'>('login')
</script>

<style scoped>
.auth-page {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark, #4f46e5) 100%);
}
</style>

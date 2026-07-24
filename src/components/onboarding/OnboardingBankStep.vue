<template>
  <div class="onboarding-step">
    <!-- Icon -->
    <div class="flex justify-center mb-6">
      <div class="flex items-center justify-center w-20 h-20 rounded-3xl" :class="onboardingStore.bankConnected ? 'bg-success-bg' : 'bg-primary/10'">
        <component :is="onboardingStore.bankConnected ? CheckCircle : Building2" :size="40" :class="onboardingStore.bankConnected ? 'text-success' : 'text-primary'" />
      </div>
    </div>

    <h2 class="text-2xl font-bold text-text-primary text-center mb-2">
      {{ onboardingStore.bankConnected ? 'Bank Connected!' : 'Connect Your Bank' }}
    </h2>
    <p class="text-text-secondary text-center mb-8">
      {{ onboardingStore.bankConnected
        ? 'We\'re scanning your transactions for subscriptions now.'
        : 'Securely link your bank account and we\'ll automatically detect subscriptions you\'re paying for.'
      }}
    </p>

    <!-- Features list -->
    <div v-if="!onboardingStore.bankConnected" class="mb-8 space-y-3">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-success-bg flex-shrink-0">
          <Check :size="16" class="text-success" />
        </div>
        <p class="text-sm text-text-secondary text-left">Bank-level security via Plaid</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-success-bg flex-shrink-0">
          <Check :size="16" class="text-success" />
        </div>
        <p class="text-sm text-text-secondary text-left">Auto-detect recurring charges</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-success-bg flex-shrink-0">
          <Check :size="16" class="text-success" />
        </div>
        <p class="text-sm text-text-secondary text-left">Supports 12,000+ banks and cards</p>
      </div>
    </div>

    <!-- Bank connection -->
    <div v-if="!onboardingStore.bankConnected" class="mb-6">
      <PlaidLinkButton @success="handleBankConnected" @error="handleBankError" />
      <p v-if="bankError" class="mt-3 text-sm text-error-text text-center">{{ bankError }}</p>
    </div>

    <!-- Paywall Modal -->
    <PaywallModal
      :show="showPaywall"
      message="You've reached the free plan limit of 1 bank connection. Upgrade to Pro for unlimited bank connections."
      @close="showPaywall = false"
    />

    <!-- Actions -->
    <div class="space-y-3">
      <button
        v-if="onboardingStore.bankConnected"
        class="w-full bg-primary text-white font-semibold py-3.5 rounded-2xl touch-target-comfortable transition-all active:scale-[0.98]"
        @click="$emit('next')"
      >
        Continue
      </button>

      <button
        class="w-full text-text-secondary text-sm font-medium py-2"
        @click="$emit('skip')"
      >
        {{ onboardingStore.bankConnected ? 'Back' : 'I\'ll do this later' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Building2, CheckCircle, Check } from 'lucide-vue-next'
import { useOnboardingStore } from '@/stores/onboarding'
import { useHaptics } from '@/composables/useHaptics'
import PlaidLinkButton from '@/components/PlaidLinkButton.vue'
import PaywallModal from '@/components/ui/PaywallModal.vue'
import { PLAN_LIMIT_ERROR } from '@/composables/usePlanLimits'

defineEmits<{
  next: []
  skip: []
}>()

const onboardingStore = useOnboardingStore()
const { notification } = useHaptics()

const bankError = ref('')
const showPaywall = ref(false)

function handleBankConnected() {
  onboardingStore.bankConnected = true
  notification('success')
}

function handleBankError(error: string) {
  if (error === PLAN_LIMIT_ERROR) {
    showPaywall.value = true
  } else {
    bankError.value = error
  }
}
</script>

<style scoped>
.onboarding-step {
  max-width: 28rem;
  margin: 0 auto;
}
</style>

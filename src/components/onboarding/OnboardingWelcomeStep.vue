<template>
  <div class="onboarding-step">
    <!-- Icon -->
    <div class="flex justify-center mb-6">
      <div class="flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10">
        <UserCircle :size="40" class="text-primary" />
      </div>
    </div>

    <h2 class="text-2xl font-bold text-text-primary text-center mb-2">Welcome to 2Subscribe!</h2>
    <p class="text-text-secondary text-center mb-8">Let's personalize your experience. What should we call you?</p>

    <!-- Name input -->
    <div class="mb-5">
      <label for="onboarding-name" class="block text-sm font-medium text-text-secondary mb-1.5">
        Your Name
      </label>
      <input
        id="onboarding-name"
        v-model="onboardingStore.displayName"
        type="text"
        placeholder="e.g. Alex"
        class="w-full px-4 py-3 border border-border-light rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
        maxlength="50"
      />
    </div>

    <!-- Currency selector -->
    <div class="mb-8">
      <label class="block text-sm font-medium text-text-secondary mb-1.5">
        Preferred Currency
      </label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="curr in currencies"
          :key="curr.code"
          class="flex flex-col items-center py-3 rounded-xl border-2 transition-all touch-target"
          :class="onboardingStore.currency === curr.code
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border-light text-text-secondary hover:border-border-medium'"
          @click="onboardingStore.currency = curr.code"
        >
          <span class="text-lg font-bold">{{ curr.symbol }}</span>
          <span class="text-xs font-medium">{{ curr.code }}</span>
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="space-y-3">
      <button
        class="w-full bg-primary text-white font-semibold py-3.5 rounded-2xl touch-target-comfortable transition-all active:scale-[0.98] disabled:opacity-50"
        :disabled="!onboardingStore.displayName.trim()"
        @click="handleContinue"
      >
        Continue
      </button>
      <button
        class="w-full text-text-secondary text-sm font-medium py-2"
        @click="$emit('skip')"
      >
        Skip for now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserCircle } from 'lucide-vue-next'
import { useOnboardingStore } from '@/stores/onboarding'
import { useHaptics } from '@/composables/useHaptics'

const emit = defineEmits<{
  next: []
  skip: []
}>()

const onboardingStore = useOnboardingStore()
const { impact } = useHaptics()

const currencies = [
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
]

function handleContinue() {
  impact('light')
  onboardingStore.displayName = onboardingStore.displayName.trim()
  emit('next')
}
</script>

<style scoped>
.onboarding-step {
  max-width: 28rem;
  margin: 0 auto;
}
</style>

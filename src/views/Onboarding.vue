<template>
  <div class="onboarding-page min-h-screen flex flex-col bg-gradient-to-b from-background to-indigo-50">
    <!-- Progress bar -->
    <div class="pt-[calc(env(safe-area-inset-top)+24px)] px-6">
      <OnboardingProgress :current="onboardingStore.currentStepIndex" :total="ONBOARDING_STEPS.length" />
    </div>

    <!-- Step content -->
    <div class="flex-1 flex flex-col justify-center px-6 py-8">
      <Transition :name="transitionName" mode="out-in">
        <OnboardingWelcomeStep
          v-if="onboardingStore.currentStep === 'welcome'"
          key="welcome"
          @next="handleNext"
          @skip="handleSkip"
        />
        <OnboardingNotificationsStep
          v-else-if="onboardingStore.currentStep === 'notifications'"
          key="notifications"
          @next="handleNext"
          @skip="handleSkip"
        />
        <OnboardingBankStep
          v-else-if="onboardingStore.currentStep === 'bank'"
          key="bank"
          @next="handleNext"
          @skip="handleSkip"
        />
        <OnboardingPremiumStep
          v-else-if="onboardingStore.currentStep === 'premium'"
          key="premium"
          @skip="handleFinish"
        />
      </Transition>
    </div>

    <!-- Back button -->
    <div v-if="onboardingStore.currentStepIndex > 0" class="px-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <button
        class="flex items-center gap-1 text-text-secondary text-sm font-medium"
        @click="handleBack"
      >
        <ArrowLeft :size="16" />
        Back
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { useOnboardingStore, ONBOARDING_STEPS } from '@/stores/onboarding'
import { useHaptics } from '@/composables/useHaptics'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress.vue'
import OnboardingWelcomeStep from '@/components/onboarding/OnboardingWelcomeStep.vue'
import OnboardingNotificationsStep from '@/components/onboarding/OnboardingNotificationsStep.vue'
import OnboardingBankStep from '@/components/onboarding/OnboardingBankStep.vue'
import OnboardingPremiumStep from '@/components/onboarding/OnboardingPremiumStep.vue'

const router = useRouter()
const onboardingStore = useOnboardingStore()
const { impact } = useHaptics()

const transitionName = ref<'slide-left' | 'slide-right'>('slide-left')

onMounted(() => {
  onboardingStore.reset()
})

function handleNext() {
  transitionName.value = 'slide-left'
  impact('light')
  onboardingStore.nextStep()
}

function handleBack() {
  transitionName.value = 'slide-right'
  impact('light')
  onboardingStore.prevStep()
}

function handleSkip() {
  transitionName.value = 'slide-left'
  impact('light')
  onboardingStore.nextStep()
}

async function handleFinish() {
  impact('medium')
  await onboardingStore.completeOnboarding()
  router.push('/')
}
</script>

<style scoped>
.onboarding-page {
  --color-primary-dark: #4A2FB0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s var(--ease-out);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>

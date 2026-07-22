<template>
  <MobileLayout title="Welcome" subtitle="2Subscribe" :show-back="false" :show-bottom-nav="false">
    <WelcomeScreen :loading="completing" @get-started="handleGetStarted" />
  </MobileLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MobileLayout from '@/components/layout/MobileLayout.vue'
import WelcomeScreen from '@/components/onboarding/WelcomeScreen.vue'
import { useOnboarding } from '@/composables/useOnboarding'
import { logger } from '@/utils/logger'

const router = useRouter()
const { completeOnboarding } = useOnboarding()
const completing = ref(false)

async function handleGetStarted() {
  completing.value = true
  try {
    await completeOnboarding()
    router.push('/')
  } catch (error) {
    logger.error('Failed to complete onboarding', { error })
    completing.value = false
  }
}
</script>

<template>
  <div class="onboarding-step">
    <!-- Icon -->
    <div class="flex justify-center mb-6">
      <div class="flex items-center justify-center w-20 h-20 rounded-3xl" :class="permissionGranted ? 'bg-success-bg' : 'bg-primary/10'">
        <component :is="permissionGranted ? CheckCircle : BellRing" :size="40" :class="permissionGranted ? 'text-success' : 'text-primary'" />
      </div>
    </div>

    <h2 class="text-2xl font-bold text-text-primary text-center mb-2">
      {{ permissionGranted ? 'Notifications Enabled!' : 'Stay Ahead of Renewals' }}
    </h2>
    <p class="text-text-secondary text-center mb-8">
      {{ permissionGranted
        ? 'We\'ll alert you before subscriptions charge you.'
        : 'Get push notifications 3 days before any subscription renews. Never get caught off guard again.'
      }}
    </p>

    <!-- Visual example -->
    <div v-if="!permissionGranted" class="mb-8 space-y-3">
      <div class="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border-light shadow-sm">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-warning-bg flex-shrink-0">
          <BellRing :size="20" class="text-warning-text" />
        </div>
        <div class="flex-1 text-left">
          <p class="text-sm font-semibold text-text-primary">Netflix renews in 3 days</p>
          <p class="text-xs text-text-secondary">£12.99 due on 15 Jan</p>
        </div>
      </div>
      <div class="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border-light shadow-sm">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-error-bg flex-shrink-0">
          <AlertCircle :size="20" class="text-error-text" />
        </div>
        <div class="flex-1 text-left">
          <p class="text-sm font-semibold text-text-primary">Spotify renews tomorrow</p>
          <p class="text-xs text-text-secondary">£9.99 due on 12 Jan</p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="space-y-3">
      <button
        v-if="!permissionGranted"
        class="w-full bg-primary text-white font-semibold py-3.5 rounded-2xl touch-target-comfortable transition-all active:scale-[0.98] disabled:opacity-50"
        :disabled="requesting"
        @click="handleRequest"
      >
        {{ requesting ? 'Requesting...' : 'Enable Notifications' }}
      </button>

      <button
        v-if="permissionGranted"
        class="w-full bg-primary text-white font-semibold py-3.5 rounded-2xl touch-target-comfortable transition-all active:scale-[0.98]"
        @click="handleNext"
      >
        Continue
      </button>

      <button
        class="w-full text-text-secondary text-sm font-medium py-2"
        @click="$emit('skip')"
      >
        {{ permissionGranted ? 'Back' : 'Maybe later' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BellRing, AlertCircle, CheckCircle } from 'lucide-vue-next'
import { useOnboardingStore } from '@/stores/onboarding'
import { useHaptics } from '@/composables/useHaptics'
import { notificationScheduler } from '@/services/NotificationScheduler'
import { Capacitor } from '@capacitor/core'

const emit = defineEmits<{
  next: []
  skip: []
}>()

const onboardingStore = useOnboardingStore()
const { notification } = useHaptics()

const requesting = ref(false)
const permissionGranted = ref(false)

async function handleRequest() {
  requesting.value = true
  try {
    await notificationScheduler.requestPermission()

    if (Capacitor.isNativePlatform()) {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      let permStatus = await PushNotifications.checkPermissions()
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions()
      }
      if (permStatus.receive === 'granted') {
        await PushNotifications.register()
        permissionGranted.value = true
        onboardingStore.notificationsEnabled = true
        notification('success')
      }
    } else {
      permissionGranted.value = true
      onboardingStore.notificationsEnabled = true
      notification('success')
    }
  } catch {
    // Best-effort — user can enable later in settings
  } finally {
    requesting.value = false
  }
}

function handleNext() {
  emit('next')
}
</script>

<style scoped>
.onboarding-step {
  max-width: 28rem;
  margin: 0 auto;
}
</style>

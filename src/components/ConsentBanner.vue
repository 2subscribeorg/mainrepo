<template>
  <div
    v-if="undecided"
    class="fixed bottom-0 left-0 right-0 z-50 border-t border-border-light bg-surface-overlay backdrop-blur-md"
    style="padding-bottom: env(safe-area-inset-bottom);"
    role="alert"
    aria-live="polite"
  >
    <div class="mx-auto flex max-w-3xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-text-primary">
        To connect your bank account, we need to load Plaid's secure connection service.
        This involves sharing limited data with a regulated third party.
      </p>
      <div class="flex shrink-0 gap-2">
        <button
          class="touch-target rounded-lg bg-surface-elevated px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          @click="handleDecline"
        >
          Decline
        </button>
        <button
          class="touch-target rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
          @click="handleGrant"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConsent } from '@/composables/useConsent'

const { undecided, grant, decline } = useConsent()

function handleGrant() {
  grant()
}

function handleDecline() {
  decline()
}
</script>

<style scoped>
.touch-target {
  min-height: 44px;
}
</style>

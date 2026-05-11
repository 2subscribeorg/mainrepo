<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="undecided"
        class="fixed inset-0 z-modal flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
      >
        <div
          class="w-full max-w-sm rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl"
          style="padding-bottom: calc(env(safe-area-inset-bottom) + 1.5rem);"
        >
          <div class="mb-4 flex justify-center">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-primary"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>

          <h2 id="consent-title" class="mb-2 text-center text-lg font-semibold text-text-primary">
            Privacy Consent
          </h2>

          <p class="mb-6 text-center text-sm text-text-secondary leading-relaxed">
            To connect your bank account, we need to load Plaid's secure connection service.
            This involves sharing limited data with a regulated third party.
          </p>

          <div class="flex flex-col gap-3">
            <button
              class="touch-target w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98]"
              @click="handleGrant"
            >
              Accept
            </button>
            <button
              class="touch-target w-full rounded-xl bg-surface-elevated px-4 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-hover active:scale-[0.98]"
              @click="handleDecline"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
  min-height: 48px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[60] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        @click.self="handleClose"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black/70 backdrop-blur-xl"
          aria-hidden="true"
        />

        <!-- Modal Container -->
        <div class="flex min-h-full items-center justify-center p-4">
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <div
              v-if="isOpen"
              ref="modalRef"
              class="relative w-full max-w-2xl rounded-lg bg-white shadow-xl
                     dark:bg-gray-900 dark:border dark:border-gray-800"
              @keydown.escape="handleClose"
            >
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                <div class="flex items-center gap-3">
                  <svg
                    class="h-6 w-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <h2 id="modal-title" class="text-xl font-semibold text-text-primary">
                    Renewal Warnings
                  </h2>
                  <span
                    v-if="warningCount > 0"
                    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                           bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  >
                    {{ warningCount }}
                  </span>
                </div>

                <button
                  type="button"
                  class="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100
                         dark:hover:bg-gray-800 dark:hover:text-gray-300
                         transition-colors duration-150 ease-out
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Close modal"
                  @click="handleClose"
                >
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Content -->
              <div class="max-h-[60vh] overflow-y-auto px-6 py-4">
                <!-- Loading State -->
                <div v-if="loading" class="flex items-center justify-center py-12">
                  <div class="flex flex-col items-center gap-3">
                    <svg class="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <p class="text-sm text-text-secondary">Loading warnings...</p>
                  </div>
                </div>

                <!-- Error State -->
                <div
                  v-else-if="error"
                  class="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4"
                  role="alert"
                >
                  <div class="flex gap-3">
                    <svg class="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error loading warnings</h3>
                      <p class="mt-1 text-sm text-red-700 dark:text-red-300">{{ error }}</p>
                    </div>
                  </div>
                </div>

                <!-- Empty State -->
                <div
                  v-else-if="activeWarnings.length === 0"
                  class="flex flex-col items-center justify-center py-12 text-center"
                >
                  <svg class="h-16 w-16 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 class="mt-4 text-lg font-medium text-text-primary">No upcoming renewals</h3>
                  <p class="mt-2 text-sm text-text-secondary max-w-sm">
                    You don't have any subscription renewals coming up soon. We'll notify you when one is approaching.
                  </p>
                </div>

                <!-- Warnings List -->
                <div v-else class="space-y-3">
                  <TransitionGroup
                    enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="opacity-0 translate-y-4"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0 scale-95"
                    move-class="transition-transform duration-300 ease-out"
                  >
                    <RenewalWarningCard
                      v-for="(warning, index) in activeWarnings"
                      :key="warning.id"
                      :warning="warning"
                      :style="{ transitionDelay: `${index * 50}ms` }"
                      @dismiss="handleDismiss"
                      @view-subscription="handleViewSubscription"
                    />
                  </TransitionGroup>
                </div>
              </div>

              <!-- Footer -->
              <div class="border-t border-gray-200 dark:border-gray-800 px-6 py-4">
                <div class="flex items-center justify-between">
                  <button
                    type="button"
                    class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300
                           transition-colors duration-150 ease-out
                           focus:outline-none focus:underline
                           disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="calculating"
                    @click="handleRefresh"
                  >
                    <span v-if="!calculating">Refresh Warnings</span>
                    <span v-else class="flex items-center gap-2">
                      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Calculating...
                    </span>
                  </button>

                  <button
                    type="button"
                    class="rounded-md px-4 py-2 text-sm font-medium
                           bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md
                           dark:bg-blue-500 dark:hover:bg-blue-600
                           transition-all duration-150 ease-out
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           active:scale-95"
                    @click="handleClose"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useRenewalWarnings } from '@/composables/useRenewalWarnings'
import RenewalWarningCard from './RenewalWarningCard.vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const modalRef = ref<HTMLElement | null>(null)

const {
  activeWarnings,
  warningCount,
  loading,
  error,
  calculating,
  calculateWarnings,
  dismissWarning,
} = useRenewalWarnings()

function handleClose() {
  emit('close')
}

async function handleDismiss(warningId: string) {
  await dismissWarning(warningId)
}

function handleViewSubscription(subscriptionId: string) {
  handleClose()
  router.push(`/subscriptions/${subscriptionId}`)
}

async function handleRefresh() {
  await calculateWarnings()
}

// Focus management
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    modalRef.value?.focus()
  }
})

// Trap focus within modal
function handleKeyDown(e: KeyboardEvent) {
  if (!props.isOpen) return

  if (e.key === 'Escape') {
    handleClose()
  }

  if (e.key === 'Tab') {
    const focusableElements = modalRef.value?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (!focusableElements || focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault()
      lastElement.focus()
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault()
      firstElement.focus()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="flex items-start gap-4">
    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
      <svg class="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </div>
    <div class="flex-1">
      <h3 class="text-lg font-semibold text-slate-900">Restore Purchases</h3>
      <p class="mt-1 text-sm text-slate-600">
        Already purchased a plan? Restore it to this device using your Apple or Google account.
      </p>

      <div
        v-if="feedback"
        :class="feedbackClasses"
        class="mt-3 rounded-xl px-4 py-3 text-sm font-medium"
      >
        {{ feedback.message }}
      </div>

      <button
        type="button"
        :disabled="loading"
        class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        @click="handleRestore"
      >
        <svg
          v-if="loading"
          class="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>{{ loading ? 'Restoring...' : 'Restore Purchases' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { billingService } from '@/services/billingService'

type FeedbackType = 'success' | 'empty' | 'error'

interface Feedback {
  type: FeedbackType
  message: string
}

const loading = ref(false)
const feedback = ref<Feedback | null>(null)
let clearTimer: ReturnType<typeof setTimeout> | null = null
let inFlight = false

const feedbackClasses = computed(() => {
  if (!feedback.value) return ''
  const classes: Record<FeedbackType, string> = {
    success: 'bg-green-50 text-green-800 border border-green-200',
    empty: 'bg-slate-100 text-slate-700 border border-slate-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
  }
  return classes[feedback.value.type as FeedbackType]
})

async function handleRestore() {
  if (inFlight) return
  inFlight = true
  loading.value = true
  feedback.value = null
  if (clearTimer) clearTimeout(clearTimer)

  try {
    const { hadPurchases } = await billingService.restorePurchases()
    feedback.value = hadPurchases
      ? { type: 'success', message: 'Purchases restored successfully.' }
      : { type: 'empty', message: 'No previous purchases found.' }
  } catch {
    feedback.value = { type: 'error', message: 'Unable to restore purchases. Please try again.' }
  } finally {
    loading.value = false
    inFlight = false
    clearTimer = setTimeout(() => { feedback.value = null }, 6000)
  }
}
</script>

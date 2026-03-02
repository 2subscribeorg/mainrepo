<template>
  <div
    class="rounded-lg border bg-surface shadow-sm transition-all duration-200 ease-out hover:shadow-md"
    :class="[
      urgencyClass,
      'focus-within:ring-2 focus-within:ring-offset-2',
      urgency === 'critical' ? 'focus-within:ring-red-500' : 
      urgency === 'warning' ? 'focus-within:ring-amber-500' : 
      'focus-within:ring-blue-500'
    ]"
    role="article"
    :aria-label="`Renewal warning for ${warning.merchantName}`"
  >
    <div class="p-4">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <div
              class="h-2 w-2 rounded-full flex-shrink-0"
              :class="urgencyDotClass"
              :aria-label="`${urgency} urgency`"
            />
            <h3 class="font-semibold text-text-primary truncate">
              {{ warning.merchantName }}
            </h3>
          </div>
          
          <p class="mt-1 text-sm text-text-secondary">
            {{ formattedRecurrence }} subscription
          </p>
        </div>

        <div class="text-right flex-shrink-0">
          <p class="text-lg font-bold text-text-primary">
            {{ formattedAmount }}
          </p>
        </div>
      </div>

      <!-- Warning Message -->
      <div class="mt-3 flex items-center gap-2">
        <svg
          class="h-5 w-5 flex-shrink-0"
          :class="urgencyIconClass"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            v-if="urgency === 'critical'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        
        <p class="text-sm font-medium" :class="urgencyTextClass">
          <span class="font-semibold">{{ daysRemainingText }}</span>
          until renewal on {{ formattedDueDate }}
        </p>
      </div>

      <!-- Actions -->
      <div class="mt-4 flex items-center gap-2">
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ease-out
                 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm
                 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                 active:scale-[0.98]"
          @click="handleViewSubscription"
        >
          View Subscription
        </button>
        
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ease-out
                 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-sm
                 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                 active:scale-[0.98]
                 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="dismissing"
          @click="handleDismiss"
        >
          <span v-if="!dismissing">Dismiss</span>
          <span v-else class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Dismissing...
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RenewalWarning } from '@/types/renewalWarning'
import { formatMoney, formatRecurrence } from '@/utils/formatters'
import { renewalWarningService } from '@/services/RenewalWarningService'

const props = defineProps<{
  warning: RenewalWarning
}>()

const emit = defineEmits<{
  dismiss: [warningId: string]
  viewSubscription: [subscriptionId: string]
}>()

const dismissing = ref(false)

const urgency = computed(() => 
  renewalWarningService.getWarningUrgency(props.warning.daysUntilDue)
)

const daysRemainingText = computed(() =>
  renewalWarningService.formatDaysRemaining(props.warning.daysUntilDue)
)

const formattedDueDate = computed(() =>
  renewalWarningService.formatDueDate(props.warning.dueDate)
)

const formattedAmount = computed(() =>
  formatMoney(props.warning.amount)
)

const formattedRecurrence = computed(() =>
  formatRecurrence(props.warning.recurrence)
)

const urgencyClass = computed(() => {
  switch (urgency.value) {
    case 'critical':
      return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
    case 'warning':
      return 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950'
    default:
      return 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'
  }
})

const urgencyDotClass = computed(() => {
  switch (urgency.value) {
    case 'critical':
      return 'bg-red-500 animate-pulse'
    case 'warning':
      return 'bg-amber-500'
    default:
      return 'bg-blue-500'
  }
})

const urgencyIconClass = computed(() => {
  switch (urgency.value) {
    case 'critical':
      return 'text-red-600 dark:text-red-400'
    case 'warning':
      return 'text-amber-600 dark:text-amber-400'
    default:
      return 'text-blue-600 dark:text-blue-400'
  }
})

const urgencyTextClass = computed(() => {
  switch (urgency.value) {
    case 'critical':
      return 'text-red-700 dark:text-red-300'
    case 'warning':
      return 'text-amber-700 dark:text-amber-300'
    default:
      return 'text-blue-700 dark:text-blue-300'
  }
})

async function handleDismiss() {
  dismissing.value = true
  try {
    emit('dismiss', props.warning.id)
  } finally {
    dismissing.value = false
  }
}

function handleViewSubscription() {
  emit('viewSubscription', props.warning.subscriptionId)
}
</script>

<template>
  <div
    class="rounded-lg border bg-surface shadow-sm transition-all duration-200 ease-out hover:shadow-md"
    :class="[
      urgencyClass,
      'focus-within:ring-2 focus-within:ring-offset-2',
      urgency === 'critical' ? 'focus-within:ring-error' : 
      urgency === 'warning' ? 'focus-within:ring-warning' : 
      'focus-within:ring-info'
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
        <AlertTriangle
          :size="20"
          class="flex-shrink-0"
          :class="urgencyIconClass"
        />
        
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
                 bg-surface-elevated text-text-secondary hover:bg-interactive-hover hover:shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                 active:scale-[0.98]"
          @click="handleViewSubscription"
        >
          View Subscription
        </button>
        
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ease-out
                 bg-surface text-text-secondary border border-border-light hover:bg-surface-elevated hover:shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                 active:scale-[0.98]
                 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="dismissing"
          @click="handleDismiss"
        >
          <span v-if="!dismissing">Dismiss</span>
          <span v-else class="flex items-center justify-center gap-2">
            <Loader2 :size="16" class="animate-spin" />
            Dismissing...
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, Loader2 } from 'lucide-vue-next'
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
      return 'border-error-border bg-error-bg'
    case 'warning':
      return 'border-warning-border bg-warning-bg'
    default:
      return 'border-info-border bg-info-bg'
  }
})

const urgencyDotClass = computed(() => {
  switch (urgency.value) {
    case 'critical':
      return 'bg-error-text-emphasis animate-pulse'
    case 'warning':
      return 'bg-warning-text-emphasis'
    default:
      return 'bg-info-text-emphasis'
  }
})

const urgencyIconClass = computed(() => {
  switch (urgency.value) {
    case 'critical':
      return 'text-error-text-emphasis'
    case 'warning':
      return 'text-warning-text-emphasis'
    default:
      return 'text-info-text-emphasis'
  }
})

const urgencyTextClass = computed(() => {
  switch (urgency.value) {
    case 'critical':
      return 'text-error-text'
    case 'warning':
      return 'text-warning-text'
    default:
      return 'text-info-text'
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

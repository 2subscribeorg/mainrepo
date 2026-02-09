<template>
  <div
    class="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 shadow-sm hover:shadow-md transition-fast card-animated gpu-accelerated"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-text-primary">{{ pattern.merchant }}</h3>
            <p class="text-xs text-text-secondary">Possible subscription detected</p>
          </div>
        </div>
      </div>
      <div class="text-right">
        <p class="text-lg font-bold text-text-primary">{{ formattedAmount }}</p>
        <p class="text-xs text-text-secondary">{{ formattedFrequency }}</p>
      </div>
    </div>

    <div class="mt-3 flex items-center gap-2 text-sm text-text-secondary">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ pattern.transactions.length }} matching transactions</span>
      <span class="mx-1">•</span>
      <span>{{ Math.round(pattern.confidence * 100) }}% confidence</span>
    </div>

    <div class="mt-4 flex gap-2">
      <button
        @click="handleConfirm"
        :disabled="loading"
        class="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="!loading">✓ Confirm Subscription</span>
        <span v-else>Processing...</span>
      </button>
      <button
        @click="handleReject"
        :disabled="loading"
        class="flex-1 rounded-md border border-border-light px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="!loading">✗ Not a Subscription</span>
        <span v-else>Processing...</span>
      </button>
    </div>

    <div v-if="error" class="mt-2 text-xs text-red-600">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RecurringPattern } from '@/services/PatternDetector'
import { formatMoney, formatRecurrence } from '@/utils/formatters'
import { useSubscriptionFeedback } from '@/composables/useSubscriptionFeedback'

const props = defineProps<{
  pattern: RecurringPattern
}>()

const emit = defineEmits<{
  confirmed: [pattern: RecurringPattern]
  rejected: [pattern: RecurringPattern]
}>()

const { confirmSubscription, rejectSubscription, loading, error } = useSubscriptionFeedback()

const formattedAmount = computed(() => {
  return formatMoney({
    amount: props.pattern.amount,
    currency: props.pattern.transactions[0]?.amount?.currency || 'GBP',
  })
})

const formattedFrequency = computed(() => {
  return formatRecurrence(props.pattern.frequency)
})

async function handleConfirm() {
  const lastTransaction = props.pattern.transactions[props.pattern.transactions.length - 1]
  
  const success = await confirmSubscription({
    transactionId: lastTransaction.id,
    merchantName: props.pattern.merchant,
    amount: {
      amount: props.pattern.amount,
      currency: lastTransaction.amount.currency,
    },
    date: lastTransaction.date,
    detectionConfidence: props.pattern.confidence,
    detectionMethod: 'pattern_matching',
  })

  if (success) {
    emit('confirmed', props.pattern)
  }
}

async function handleReject() {
  const lastTransaction = props.pattern.transactions[props.pattern.transactions.length - 1]
  
  const success = await rejectSubscription({
    transactionId: lastTransaction.id,
    merchantName: props.pattern.merchant,
    amount: {
      amount: props.pattern.amount,
      currency: lastTransaction.amount.currency,
    },
    date: lastTransaction.date,
    detectionConfidence: props.pattern.confidence,
    detectionMethod: 'pattern_matching',
  })

  if (success) {
    emit('rejected', props.pattern)
  }
}
</script>

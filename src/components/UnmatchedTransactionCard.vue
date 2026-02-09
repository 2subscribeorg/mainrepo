<template>
  <div class="border rounded-lg bg-warning-bg border-warning-border" style="padding: var(--space-4);">
    <div class="flex items-start justify-between">
      <!-- Transaction Info -->
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <h4 class="font-semibold text-text-primary">{{ suggestion.transaction.merchantName }}</h4>
          <span
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            :class="confidenceClass"
          >
            {{ confidenceText }}
          </span>
        </div>
        
        <div class="mt-1 space-y-1">
          <p class="text-sm text-text-secondary">
            {{ formatMoney(suggestion.transaction.amount) }} on {{ formatDate(suggestion.transaction.date) }}
          </p>
          
          <p v-if="suggestion.suggestedSubscriptionId" class="text-sm text-text-primary">
            💡 Suggested: <span class="font-medium">{{ getSuggestedSubscriptionName() }}</span>
          </p>
          
          <p v-else class="text-sm text-text-secondary italic">
            {{ getSuggestionText() }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 ml-4">
        <button
          :disabled="loading"
          class="text-sm px-3 py-1 rounded bg-info-bg text-info-text hover:bg-info-bg-hover disabled:opacity-50"
          @click="$emit('create-new')"
        >
          Create New
        </button>
        
        <button
          v-if="suggestion.suggestedSubscriptionId"
          :disabled="loading"
          class="text-sm px-3 py-1 rounded bg-success-bg text-success-text hover:bg-success-bg-hover disabled:opacity-50"
          @click="$emit('match', suggestion.suggestedSubscriptionId)"
        >
          Match
        </button>
        
        <button
          :disabled="loading"
          class="text-sm px-3 py-1 rounded bg-surface-elevated text-text-secondary hover:bg-interactive-hover disabled:opacity-50"
          @click="$emit('dismiss')"
        >
          Dismiss
        </button>
      </div>
    </div>

    <!-- Additional Info (expandable if needed) -->
    <div v-if="showDetails" class="mt-3 pt-3 border-t border-yellow-200 text-xs text-gray-600">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <span class="font-medium">Account:</span> {{ suggestion.transaction.accountId }}
        </div>
        <div>
          <span class="font-medium">Type:</span> {{ suggestion.transaction.transactionType }}
        </div>
        <div v-if="suggestion.transaction.category">
          <span class="font-medium">Category:</span> {{ suggestion.transaction.category.join(', ') }}
        </div>
        <div>
          <span class="font-medium">Status:</span> {{ suggestion.transaction.pending ? 'Pending' : 'Completed' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TransactionMatchSuggestion } from '@/data/repo/interfaces/IBankTransactionsRepo'
import { formatMoney } from '@/utils/formatters'
import { useSubscriptionsStore } from '@/stores/subscriptions'

interface Props {
  suggestion: TransactionMatchSuggestion
  loading?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  match: [subscriptionId: string]
  'create-new': []
  dismiss: []
}>()

const subscriptionsStore = useSubscriptionsStore()
const showDetails = ref(false)

const confidenceClass = computed(() => {
  if (props.suggestion.confidence >= 0.8) {
    return 'bg-green-100 text-green-800'
  } else if (props.suggestion.confidence >= 0.6) {
    return 'bg-yellow-100 text-yellow-800'
  } else {
    return 'bg-gray-100 text-gray-800'
  }
})

const confidenceText = computed(() => {
  if (props.suggestion.confidence >= 0.8) {
    return 'High Match'
  } else if (props.suggestion.confidence >= 0.6) {
    return 'Possible Match'
  } else {
    return 'Manual Review'
  }
})

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
}

function getSuggestedSubscriptionName(): string {
  if (!props.suggestion.suggestedSubscriptionId) return ''
  
  const subscription = subscriptionsStore.subscriptions.find(
    s => s.id === props.suggestion.suggestedSubscriptionId
  )
  
  return subscription?.merchantName || 'Unknown'
}

function getSuggestionText(): string {
  switch (props.suggestion.reason) {
    case 'recurring_pattern':
      return `Recurring charge detected - looks like a subscription`
    case 'fuzzy_match':
      return `Similar to existing subscriptions - possibly related?`
    case 'manual_needed':
      return `New charge - create subscription or dismiss if one-time purchase`
    default:
      return `Review this transaction`
  }
}
</script>

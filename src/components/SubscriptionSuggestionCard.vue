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

    <div class="mt-3 flex items-center gap-2 text-sm text-text-secondary cursor-pointer" @click="showTransactions = !showTransactions">
      <svg class="h-4 w-4 transition-transform duration-200" :class="{ 'transform rotate-90': showTransactions }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      <span>{{ pattern.transactions.length }} matching transactions</span>
      <span class="mx-1">•</span>
      <span>{{ Math.round(pattern.confidence * 100) }}% confidence</span>
    </div>

    <!-- Transaction List -->
    <div v-if="showTransactions" class="mt-3 border-t border-border-light pt-3">
      <h4 class="text-xs font-medium text-text-secondary mb-2">Matching Transactions:</h4>
      <div class="space-y-2 max-h-60 overflow-y-auto pr-2">
        <div v-for="tx in pattern.transactions" :key="tx.id" class="flex items-center justify-between text-sm p-2 rounded hover:bg-gray-50">
          <div>
            <p class="font-medium text-text-primary">{{ new Date(tx.date).toLocaleDateString() }}</p>
            <p class="text-xs text-text-secondary">{{ tx.merchantName || 'Unknown Merchant' }}</p>
          </div>
          <div class="text-right">
            <p :class="tx.amount.amount < 0 ? 'text-red-600' : 'text-green-600'" class="font-medium">
              {{ formatMoney({ amount: Math.abs(tx.amount.amount), currency: tx.amount.currency }) }}
            </p>
            <p v-if="tx.category && tx.category.length > 0" class="text-xs text-text-secondary">{{ tx.category[0] }}</p>
          </div>
        </div>
      </div>
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

    <!-- Category Selection Modal -->
    <CategorySelectionModal
      :show="showCategoryModal"
      :merchant-name="pattern.merchant"
      :categories="categories"
      @confirm="handleCategorySelection"
      @create-and-confirm="handleCategoryCreation"
      @cancel="cancelCategorySelection"
      @close="cancelCategorySelection"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RecurringPattern } from '@/services/PatternDetector'
import { formatMoney, formatRecurrence } from '@/utils/formatters'
import { useSubscriptionFeedback } from '@/composables/useSubscriptionFeedback'
import { useCategoriesStore } from '@/stores/categories'
import CategorySelectionModal from '@/components/CategorySelectionModal.vue'

const props = defineProps<{
  pattern: RecurringPattern
}>()

const emit = defineEmits<{
  confirmed: [pattern: RecurringPattern]
  rejected: [pattern: RecurringPattern]
}>()

const { 
  confirmSubscription, 
  rejectSubscription, 
  loading, 
  error,
  showCategoryModal,
  handleCategorySelection: originalHandleCategorySelection,
  handleCategoryCreation: originalHandleCategoryCreation,
  cancelCategorySelection
} = useSubscriptionFeedback()

const categoriesStore = useCategoriesStore()
const showTransactions = ref(false)

const categories = computed(() => categoriesStore.categories)

// Wrapper functions to emit confirmed event after successful category selection
async function handleCategorySelection(categoryId: string) {
  const success = await originalHandleCategorySelection(categoryId)
  if (success) {
    emit('confirmed', props.pattern)
  }
}

async function handleCategoryCreation(categoryData: { name: string; colour: string; icon?: string }) {
  const success = await originalHandleCategoryCreation(categoryData)
  if (success) {
    emit('confirmed', props.pattern)
  }
}

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
  
  // This will now trigger the category selection modal
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

  // The modal will handle the actual subscription creation
  // We emit confirmed only after the modal completes successfully
  if (success) {
    // Note: The actual subscription creation happens in the modal handlers
    // We'll emit confirmed when the category selection is complete
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

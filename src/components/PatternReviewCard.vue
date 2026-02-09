<template>
  <div class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0">
          <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <span class="text-primary-600 font-semibold text-sm">
              {{ pattern.merchant.charAt(0).toUpperCase() }}
            </span>
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900">{{ pattern.merchant }}</h4>
          <p class="text-sm text-gray-500">
            {{ formatMoney({ amount: pattern.amount, currency: pattern.transactions[0]?.amount?.currency || 'GBP' }) }}
            on {{ pattern.frequency }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          High Match
        </span>
      </div>
    </div>

    <p class="text-sm text-gray-600 mb-4">
      Recurring charge detected - looks like a subscription
    </p>

    <div class="text-xs text-gray-500 mb-4">
      Found {{ pattern.transactions.length }} transactions with same amount
    </div>

    <div class="flex gap-2">
      <button
        class="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        :disabled="loading"
        @click="$emit('create-new')"
      >
        Create New
      </button>
      <button
        class="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
        :disabled="loading"
        @click="$emit('dismiss')"
      >
        Dismiss
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RecurringPattern } from '@/services/PatternDetector'
import { formatMoney } from '@/utils/formatters'

interface Props {
  pattern: RecurringPattern
  loading?: boolean
}

defineProps<Props>()

defineEmits<{
  'create-new': []
  'dismiss': []
}>()
</script>

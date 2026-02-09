<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-screen items-center justify-center p-4">
      <div class="fixed inset-0 bg-surface-backdrop transition-opacity" @click="handleCancel"></div>
      
      <div class="relative w-full max-w-md transform rounded-3xl bg-surface shadow-xl transition-all" style="padding: var(--space-6);">
        <div class="mb-4">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-bg">
            <svg class="h-6 w-6 text-warning-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 class="mt-3 text-lg font-semibold text-text-primary text-center">Duplicate Subscription Detected</h3>
        </div>

        <div class="mb-6">
          <p class="text-sm text-text-secondary text-center mb-4">
            {{ warningMessage }}
          </p>

          <div v-if="duplicateResult.existingSubscription" class="rounded-2xl bg-[var(--color-background)] p-3 mb-4">
            <p class="text-xs font-medium text-text-secondary mb-1">Existing Subscription:</p>
            <p class="text-sm font-semibold text-text-primary">{{ duplicateResult.existingSubscription.merchantName }}</p>
            <p class="text-xs text-text-secondary">{{ formatMoney(duplicateResult.existingSubscription.amount) }} • {{ duplicateResult.existingSubscription.recurrence }}</p>
          </div>

          <div v-if="duplicateResult.existingTransactions && duplicateResult.existingTransactions.length > 0" class="rounded-2xl bg-[var(--color-background)] p-3">
            <p class="text-xs font-medium text-text-secondary mb-2">Existing Transactions:</p>
            <div class="space-y-1">
              <div v-for="tx in duplicateResult.existingTransactions.slice(0, 3)" :key="tx.id" class="text-xs text-text-primary" data-testid="transaction-item">
                {{ formatMoney(tx.amount) }} on {{ formatDate(tx.date) }}
              </div>
              <p v-if="duplicateResult.existingTransactions.length > 3" class="text-xs text-text-secondary">
                +{{ duplicateResult.existingTransactions.length - 3 }} more
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <button
            @click="handleAddToExisting"
            v-if="duplicateResult.existingSubscription"
            class="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Add to Existing Subscription
          </button>
          
          <button
            @click="handleCreateSeparate"
            class="w-full rounded-2xl border border-border-light bg-surface text-sm font-semibold text-text-primary hover:bg-interactive-hover transition-colors" style="padding: var(--space-3) var(--space-4);"
          >
            Create Separate Subscription
          </button>
          
          <button
            @click="handleCancel"
            class="w-full rounded-2xl px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DuplicateCheckResult } from '@/services/DuplicateSubscriptionChecker'
import { formatMoney, formatDate } from '@/utils/formatters'

interface Props {
  isOpen: boolean
  duplicateResult: DuplicateCheckResult
  warningMessage: string
}

interface Emits {
  (e: 'add-to-existing'): void
  (e: 'create-separate'): void
  (e: 'cancel'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function handleAddToExisting() {
  emit('add-to-existing')
}

function handleCreateSeparate() {
  emit('create-separate')
}

function handleCancel() {
  emit('cancel')
}
</script>

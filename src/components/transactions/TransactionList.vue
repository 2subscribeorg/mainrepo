<template>
  <div class="space-y-3">
    <TransitionGroup name="transaction-item" tag="div" class="contents">
      <TransactionItem
        v-for="transaction in transactions"
        :key="transaction.id"
        :transaction="transaction"
        :categories="categories"
        :get-account-name="getAccountName"
        :get-amount-color="getAmountColor"
        class="transaction-item-enter"
        @create-subscription="$emit('create-subscription', transaction)"
        @edit-subscription="$emit('edit-subscription', transaction)"
        @category-change="$emit('category-change', transaction, $event)"
        @link-to-existing-subscription="$emit('link-to-existing-subscription', transaction, $event)"
      />
    </TransitionGroup>
  </div>

  <div v-if="pagination.totalPages > 1" class="mt-6 flex justify-center fade-in">
    <Pagination
      :current-page="pagination.currentPage"
      :total-pages="pagination.totalPages"
      :total-items="pagination.totalItems"
      :page-size="pagination.pageSize"
      @go-to-page="$emit('goToPage', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { Transaction } from '@/domain/models'
import type { PaginationConfig } from '@/types/transactions'
import TransactionItem from './TransactionItem.vue'
import Pagination from '@/components/ui/Pagination.vue'

interface Props {
  transactions: Transaction[]
  categories: Array<{id: string, name: string}>
  pagination: PaginationConfig
  getAccountName: (accountId: string) => string
  getAmountColor: (amount: number) => string
}

interface Emits {
  (e: 'goToPage', page: number): void
  (e: 'create-subscription', transaction: Transaction): void
  (e: 'edit-subscription', transaction: Transaction): void
  (e: 'category-change', transaction: Transaction, categoryId: string): void
  (e: 'link-to-existing-subscription', transaction: Transaction, data: { transactionId: string; subscriptionId: string; categoryId: string }): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

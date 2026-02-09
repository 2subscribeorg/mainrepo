<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Transactions</p>
          <h2 class="text-3xl font-bold text-gray-900">Overview</h2>
        </div>
      </div>

      <TransactionFilterPanel
        :filters="filters"
        :accounts="accounts"
        :categories="categoriesStore.categories"
        :active-filter-count="activeFilterCount"
        mode="realtime"
        @update:selectedAccount="selectedAccount = $event"
        @update:subscriptionFilter="subscriptionFilter = $event"
        @update:merchantSearch="handleMerchantSearchUpdate"
        @update:dateRange="handleDateRangeUpdate"
        @update:amountRange="handleAmountRangeUpdate"
        @update:categories="handleCategoriesUpdate"
        @apply-filters="handleApplyFilters"
        @clear-all="handleClearAllFilters"
        @clear-filter="handleClearFilter"
      />
    </div>

    <LoadingSpinner v-if="loading" />

    <template v-else>
      <!-- Transactions List -->
      <TransactionList
        v-if="paginatedTransactions.length > 0"
        :transactions="paginatedTransactions"
        :categories="categoriesStore.categories"
        :pagination="pagination"
        :get-account-name="getAccountName"
        :get-amount-color="getAmountColor"
        @go-to-page="goToPage"
        @create-subscription="handleCreateSubscription"
        @edit-subscription="handleEditSubscription"
        @category-change="handleCategoryChange"
        @link-to-existing-subscription="handleLinkToExistingSubscription"
      />

      <!-- Empty State -->
      <EmptyState
        v-else
        title="No transactions found"
        description="Connect a bank account to see your transactions here."
        action-text="Connect Bank Account"
        action-to="/settings"
      />
    </template>

    <!-- Category Selection Modal -->
    <CategorySelectionModal
      :show="showCategoryModal"
      :merchant-name="selectedTransaction?.merchantName || ''"
      :categories="categoriesStore.categories"
      @confirm="handleCategorySelected"
      @create-and-confirm="handleCreateCategoryAndConfirm"
      @cancel="handleCategoryModalCancel"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTransactions } from '@/composables/useTransactions'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsStore } from '@/stores/transactions'
import { useCategoriesStore } from '@/stores/categories'
import type { Transaction } from '@/domain/models'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import TransactionFilterPanel from '@/components/transactions/TransactionFilterPanel.vue'
import TransactionList from '@/components/transactions/TransactionList.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import CategorySelectionModal from '@/components/CategorySelectionModal.vue'

// Use the composable for all business logic
const {
  loading,
  accounts,
  selectedAccount,
  subscriptionFilter,
  paginatedTransactions,
  pagination,
  goToPage,
  getAccountName,
  getAmountColor,
  filters,
  activeFilterCount,
  refreshTransactions,
  // Use filtering functions from useTransactions (same instance)
  setMerchantSearchFilter,
  setDateRangeFilter,
  setAmountRangeFilter,
  setCategoriesFilter,
  clearAllFilters,
  clearFilter
} = useTransactions()

const subscriptionsStore = useSubscriptionsStore()
const transactionsStore = useTransactionsStore()
const categoriesStore = useCategoriesStore()

// Load transactions on component mount
onMounted(() => {
  refreshTransactions()
})


// Modal state
const showCategoryModal = ref(false)
const selectedTransaction = ref<Transaction | null>(null)


async function handleCreateSubscription(transaction: Transaction) {
  // Store transaction and show category selection modal
  selectedTransaction.value = transaction
  showCategoryModal.value = true
}

async function handleCategorySelected(categoryId: string) {
  if (!selectedTransaction.value) return
  
  try {
    // Create subscription with selected category
    const subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
      merchantName: selectedTransaction.value.merchantName,
      amount: selectedTransaction.value.amount,
      recurrence: 'monthly', // Default to monthly
      nextPaymentDate: selectedTransaction.value.date,
      categoryId: categoryId,
      status: 'active' as const,
      source: 'manual' as const,
      userId: 'user1', // TODO: Get from auth store
      plaidTransactionIds: [selectedTransaction.value.id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Save the subscription
    await subscriptionsStore.save(subscription)
    
    // Update the transaction to link it to the subscription
    const updatedTransaction = {
      ...selectedTransaction.value,
      subscriptionId: subscription.id,
      categoryId: categoryId
    }
    await transactionsStore.save(updatedTransaction)
    
    console.log('✅ Subscription created successfully!')
    alert(`✅ Subscription created for ${selectedTransaction.value.merchantName}!`)
    
  } catch (error) {
    console.error('Failed to create subscription:', error)
    alert('❌ Failed to create subscription')
  } finally {
    showCategoryModal.value = false
    selectedTransaction.value = null
  }
}

function handleCategoryModalCancel() {
  showCategoryModal.value = false
  selectedTransaction.value = null
}

async function handleEditSubscription(transaction: Transaction) {
  // TODO: Open modal to edit subscription details
  console.log('Edit subscription for:', transaction.merchantName)
}

async function handleCategoryChange(transaction: Transaction, categoryId: string) {
  try {
    // Update the transaction with the new category
    const updatedTransaction = {
      ...transaction,
      categoryId: categoryId || undefined, // Set to undefined if empty string
      updatedAt: new Date().toISOString()
    }
    
    // Save the updated transaction
    await transactionsStore.save(updatedTransaction)
    
    console.log(`✅ Category updated for ${transaction.merchantName}`)
  } catch (error) {
    console.error('❌ Failed to update category:', error)
    alert('Failed to update category. Please try again.')
  }
}

async function handleLinkToExistingSubscription(transaction: Transaction, data: { transactionId: string; subscriptionId: string; categoryId: string }) {
  try {
    // Update the transaction to link it to the existing subscription
    const updatedTransaction = {
      ...transaction,
      subscriptionId: data.subscriptionId,
      categoryId: data.categoryId
    }
    
    // Save the updated transaction
    await transactionsStore.save(updatedTransaction)
    
    console.log(`✅ Linked transaction ${data.transactionId} to existing subscription ${data.subscriptionId}`)
  } catch (error) {
    console.error('❌ Failed to link transaction to existing subscription:', error)
  }
}

async function handleCreateCategoryAndConfirm(categoryData: { name: string; colour: string }) {
  if (!selectedTransaction.value) return
  
  const { name: categoryName, colour: color } = categoryData
  
  try {
    // First create the new category
    const newCategory = {
      id: `cat_${Date.now()}`, // Generate temporary ID
      name: categoryName,
      colour: color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Save the new category
    await categoriesStore.save(newCategory)
    
    // Then create subscription with the new category
    const subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
      merchantName: selectedTransaction.value.merchantName,
      amount: selectedTransaction.value.amount,
      recurrence: 'monthly', // Default to monthly
      nextPaymentDate: selectedTransaction.value.date,
      categoryId: newCategory.id,
      status: 'active' as const,
      source: 'manual' as const,
      userId: 'user1', // TODO: Get from auth store
      plaidTransactionIds: [selectedTransaction.value.id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Save the subscription
    await subscriptionsStore.save(subscription)
    
    // Update the transaction to link it to the subscription
    const updatedTransaction = {
      ...selectedTransaction.value,
      subscriptionId: subscription.id,
      categoryId: newCategory.id
    }
    await transactionsStore.save(updatedTransaction)
    
    console.log('✅ New category and subscription created successfully!')
    alert(`✅ New category "${categoryName}" created and subscription assigned!`)
    
  } catch (error) {
    console.error('Failed to create category and subscription:', error)
    alert('❌ Failed to create category and subscription')
  } finally {
    showCategoryModal.value = false
    selectedTransaction.value = null
  }
}

// Filter panel event handlers - now connected to actual filtering
function handleMerchantSearchUpdate(search: string) {
  setMerchantSearchFilter(search)
}

function handleDateRangeUpdate(dateRange: { start: string; end: string }) {
  setDateRangeFilter(dateRange.start, dateRange.end)
}

function handleAmountRangeUpdate(amountRange: { min: number; max: number }) {
  setAmountRangeFilter(amountRange.min, amountRange.max)
}

function handleCategoriesUpdate(categories: string[]) {
  setCategoriesFilter(categories)
}

function handleClearAllFilters() {
  clearAllFilters()
}

function handleApplyFilters() {
  // In real-time mode, filters are already applied
  // In manual mode, this would trigger a refresh
  console.log('Apply filters triggered')
}

function handleClearFilter(filterKey: string) {
  clearFilter(filterKey as any)
}
</script>

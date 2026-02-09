import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Transaction } from '@/domain/models'
import { useTransactionsDataStore } from '@/stores/transactionsData'

// Filter configuration interface
interface TransactionFilterConfig {
  selectedAccount: string
  subscriptionFilter: 'subscriptions' | 'all'
  dateRange?: {
    start: string
    end: string
  }
  amountRange?: {
    min: number
    max: number
  }
  merchantSearch?: string
  categories?: string[]
  status?: ('pending' | 'completed')[]
}

/**
 * UI layer - Filtering and display logic only
 * Single Responsibility: UI state management and presentation logic
 */
export const useTransactionsStore = defineStore('transactions', () => {
  // Import data store
  const dataStore = useTransactionsDataStore()

  // Filtering state - single source of truth
  const filters = ref<TransactionFilterConfig>({
    selectedAccount: '',
    subscriptionFilter: 'all'
  })

  // Apply all filters to transactions - single source of truth
  const filteredTransactions = computed(() => {
    let filtered = [...dataStore.transactions]

    // Account filter
    if (filters.value.selectedAccount) {
      filtered = filtered.filter(t => t.accountId === filters.value.selectedAccount)
    }

    // Subscription status filter
    if (filters.value.subscriptionFilter === 'subscriptions') {
      filtered = filtered.filter(t => t.subscriptionId)
    }
    // 'all' shows everything

    // Date range filter
    if (filters.value.dateRange) {
      const startDate = new Date(filters.value.dateRange.start)
      const endDate = new Date(filters.value.dateRange.end)
      filtered = filtered.filter(t => {
        const txDate = new Date(t.date)
        return txDate >= startDate && txDate <= endDate
      })
    }

    // Amount range filter
    if (filters.value.amountRange) {
      filtered = filtered.filter(t => {
        const amount = Math.abs(t.amount?.amount || 0)
        const min = filters.value.amountRange!.min
        const max = filters.value.amountRange!.max
        return (min === 0 || amount >= min) && (max === 0 || amount <= max)
      })
    }

    // Merchant search filter
    if (filters.value.merchantSearch) {
      const search = filters.value.merchantSearch.toLowerCase()
      filtered = filtered.filter(t => 
        t.merchantName.toLowerCase().includes(search)
      )
    }

    // Categories filter
    if (filters.value.categories && filters.value.categories.length > 0) {
      filtered = filtered.filter(t => 
        t.categoryId && filters.value.categories!.includes(t.categoryId)
      )
    }

    // Status filter
    if (filters.value.status && filters.value.status.length > 0) {
      filtered = filtered.filter(t => 
        (t.pending && filters.value.status!.includes('pending')) ||
        (!t.pending && filters.value.status!.includes('completed'))
      )
    }

    return filtered
  })

  // Active filter count
  const activeFilterCount = computed(() => {
    let count = 0
    if (filters.value.selectedAccount) count++
    if (filters.value.subscriptionFilter !== 'all') count++
    if (filters.value.dateRange) count++
    if (filters.value.amountRange) count++
    if (filters.value.merchantSearch) count++
    if (filters.value.categories && filters.value.categories.length > 0) count++
    if (filters.value.status && filters.value.status.length > 0) count++
    return count
  })

  // Filter management functions - single source of truth
  function setAccountFilter(accountId: string) {
    filters.value.selectedAccount = accountId
  }

  function setSubscriptionFilter(filter: 'subscriptions' | 'all') {
    filters.value.subscriptionFilter = filter
  }

  function setMerchantSearch(search: string) {
    filters.value.merchantSearch = search
  }

  function setDateRange(start: string, end: string) {
    filters.value.dateRange = { start, end }
  }

  function setAmountRange(min: number, max: number) {
    filters.value.amountRange = { min, max }
  }

  function setCategories(categories: string[]) {
    filters.value.categories = categories
  }

  function setStatus(status: ('pending' | 'completed')[]) {
    filters.value.status = status
  }

  function clearAllFilters() {
    filters.value = {
      selectedAccount: '',
      subscriptionFilter: 'all'
    }
  }

  function clearFilter(filterKey: keyof TransactionFilterConfig) {
    if (filterKey === 'selectedAccount') {
      filters.value.selectedAccount = ''
    } else if (filterKey === 'subscriptionFilter') {
      filters.value.subscriptionFilter = 'all'
    } else if (filterKey === 'merchantSearch') {
      delete filters.value.merchantSearch
    } else if (filterKey === 'dateRange') {
      delete filters.value.dateRange
    } else if (filterKey === 'amountRange') {
      delete filters.value.amountRange
    } else if (filterKey === 'categories') {
      delete filters.value.categories
    } else if (filterKey === 'status') {
      delete filters.value.status
    }
  }

  return {
    // Data layer (delegated to data store)
    transactions: dataStore.transactions,
    loading: dataStore.loading,
    error: dataStore.error,
    fetchTransactions: dataStore.fetchTransactions,
    getById: dataStore.getById,
    save: dataStore.save,
    updateTransaction: dataStore.updateTransaction,
    seed: dataStore.seed,
    clear: dataStore.clear,
    // Real-time features (delegated to data store)
    startListening: dataStore.startListening,
    stopListening: dataStore.stopListening,
    isRealtime: dataStore.isRealtime,
    // Filtering - single source of truth
    filters,
    filteredTransactions,
    activeFilterCount,
    setAccountFilter,
    setSubscriptionFilter,
    setMerchantSearch,
    setDateRange,
    setAmountRange,
    setCategories,
    setStatus,
    clearAllFilters,
    clearFilter,
  }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTransactionsDataStore } from '@/stores/transactionsData'

// Filter configuration interface
export interface TransactionFilterConfig {
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
 * 
 * Architecture:
 * - Data store (transactionsData) owns the raw transaction data
 * - UI store (this) owns filtering/presentation logic
 * - Computed properties create a facade to avoid tight coupling
 * - Single source of truth: data lives in data store, filters live here
 */
export const useTransactionsStore = defineStore('transactions', () => {
  // Get data store instance (computed to avoid tight coupling)
  const dataStore = useTransactionsDataStore()

  // Filtering state - single source of truth
  const filters = ref<TransactionFilterConfig>({
    selectedAccount: '',
    subscriptionFilter: 'all'
  })

  // Computed facade for raw transactions (single source of truth from data store)
  const rawTransactions = computed(() => dataStore.transactions)
  
  // Memoization key for filter result caching
  // Uses hash instead of concatenating all IDs for better performance
  const filterMemoKey = computed(() => {
    // Create a lightweight hash of transaction state
    const txHash = `${rawTransactions.value.length}-${rawTransactions.value[0]?.updatedAt || ''}-${rawTransactions.value[rawTransactions.value.length - 1]?.updatedAt || ''}`
    const filterState = JSON.stringify({
      account: filters.value.selectedAccount,
      subscription: filters.value.subscriptionFilter,
      dateRange: filters.value.dateRange,
      amountRange: filters.value.amountRange,
      merchantSearch: filters.value.merchantSearch,
      categories: filters.value.categories?.sort(),
      status: filters.value.status?.sort()
    })
    return `${txHash}|${filterState}`
  })

  // Cache for filtered results
  const filterCache = new Map<string, any>()

  // Indexed lookups for performance (computed from facade)
  const transactionsByAccount = computed(() => {
    const map = new Map<string, any[]>()
    rawTransactions.value.forEach(t => {
      if (!map.has(t.accountId || '')) {
        map.set(t.accountId || '', [])
      }
      map.get(t.accountId || '')!.push(t)
    })
    return map
  })

  const transactionsByCategory = computed(() => {
    const map = new Map<string, any[]>()
    rawTransactions.value.forEach(t => {
      const key = t.categoryId || 'uncategorized'
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(t)
    })
    return map
  })

  // Optimized filtered transactions with caching and indexed lookups
  const filteredTransactions = computed(() => {
    const memoKey = filterMemoKey.value
    
    // Return cached result if available
    if (filterCache.has(memoKey)) {
      return filterCache.get(memoKey)
    }

    let filtered = rawTransactions.value

    // Use indexed lookup for account filter (most common)
    if (filters.value.selectedAccount) {
      filtered = transactionsByAccount.value.get(filters.value.selectedAccount) || []
    }

    // Apply remaining filters only if needed
    if (filters.value.subscriptionFilter === 'subscriptions') {
      filtered = filtered.filter(t => t.subscriptionId)
    }

    // Batch remaining filters to minimize iterations
    if (filters.value.dateRange || filters.value.amountRange || 
        filters.value.merchantSearch || filters.value.categories?.length || 
        filters.value.status?.length) {
      
      // Pre-compute filter conditions
      const dateStart = filters.value.dateRange ? new Date(filters.value.dateRange.start) : null
      const dateEnd = filters.value.dateRange ? new Date(filters.value.dateRange.end) : null
      const amountMin = filters.value.amountRange?.min || 0
      const amountMax = filters.value.amountRange?.max || 0
      const searchTerm = filters.value.merchantSearch?.toLowerCase()
      const categorySet = filters.value.categories ? new Set(filters.value.categories) : null
      const statusSet = filters.value.status ? new Set(filters.value.status) : null

      // Single pass filter with all conditions
      filtered = filtered.filter(t => {
        // Date range check
        if (dateStart && dateEnd) {
          const txDate = new Date(t.date)
          if (txDate < dateStart || txDate > dateEnd) return false
        }
        
        // Amount range check
        if (amountMin > 0 || amountMax > 0) {
          const amount = Math.abs(t.amount?.amount || 0)
          if ((amountMin > 0 && amount < amountMin) || (amountMax > 0 && amount > amountMax)) {
            return false
          }
        }
        
        // Merchant search check
        if (searchTerm && !t.merchantName.toLowerCase().includes(searchTerm)) {
          return false
        }
        
        // Categories check
        if (categorySet && (!t.categoryId || !categorySet.has(t.categoryId))) {
          return false
        }
        
        // Status check
        if (statusSet) {
          const isPending = t.pending
          if (!((isPending && statusSet.has('pending')) || (!isPending && statusSet.has('completed')))) {
            return false
          }
        }
        
        return true
      })
    }

    // Cache the result
    filterCache.set(memoKey, filtered)
    
    // Clean up old cache entries (keep last 20)
    if (filterCache.size > 20) {
      const oldestKey = filterCache.keys().next().value
      filterCache.delete(oldestKey)
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

  // Computed facades for data store properties (avoid direct exposure)
  const loading = computed(() => dataStore.loading)
  const error = computed(() => dataStore.error)
  
  // Delegate data operations to data store (clear ownership)
  async function fetchTransactions() {
    return dataStore.fetchTransactions()
  }
  
  async function getById(id: string) {
    return dataStore.getById(id)
  }
  
  async function save(transaction: any) {
    return dataStore.save(transaction)
  }
  
  async function updateTransaction(transaction: any) {
    return dataStore.updateTransaction(transaction)
  }
  
  async function seed() {
    return dataStore.seed()
  }
  
  async function clear() {
    return dataStore.clear()
  }
  
  // Real-time features (delegated with clear interface)
  function startListening(filter?: any) {
    return dataStore.startListening(filter)
  }
  
  function stopListening() {
    return dataStore.stopListening()
  }
  
  function isRealtime() {
    return dataStore.isRealtime()
  }

  return {
    // Data layer (computed facades - single source of truth)
    transactions: rawTransactions,
    loading,
    error,
    // Data operations (delegated with clear ownership)
    fetchTransactions,
    getById,
    save,
    updateTransaction,
    seed,
    clear,
    // Real-time features (delegated)
    startListening,
    stopListening,
    isRealtime,
    // Filtering state and logic (owned by UI store)
    filters,
    filteredTransactions,
    activeFilterCount,
    transactionsByAccount,
    transactionsByCategory,
    // Filter management (UI store responsibility)
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

import { ref, computed } from 'vue'
import { useTransactionsStore } from '@/stores/transactions'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import { useTransactionManagement } from '@/composables/useTransactionManagement'
import { formatMoney } from '@/utils/formatters'
import type { BankAccount, Transaction } from '@/domain/models'
import type { 
  TransactionStats, 
  PaginationConfig, 
  TransactionListState,
  TransactionActions,
  TransactionFilters 
} from '@/types/transactions'

export function useTransactions() {
  const transactionsStore = useTransactionsStore()
  const bankAccountsStore = useBankAccountsStore()
  const businessLogic = useTransactionManagement()
  
  // UI layer state
  const loading = ref(false)
  const error = ref<string | null>(null)
  const accounts = ref<BankAccount[]>([])
  const currentPage = ref(1)
  const pageSize = 20

  // Use store filtering - single source of truth
  const filteredTransactions = computed(() => transactionsStore.filteredTransactions)
  const activeFilterCount = computed(() => transactionsStore.activeFilterCount)

  // Backward compatibility - expose individual filter values
  const selectedAccount = computed({
    get: () => transactionsStore.filters.selectedAccount,
    set: (value: string) => transactionsStore.setAccountFilter(value)
  })

  const subscriptionFilter = computed({
    get: () => transactionsStore.filters.subscriptionFilter,
    set: (value: 'subscriptions' | 'all') => transactionsStore.setSubscriptionFilter(value)
  })

  const paginatedTransactions = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    const end = start + pageSize
    return filteredTransactions.value.slice(start, end)
  })

  const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / pageSize))

  // Memoization key for transaction stats
  const statsMemoKey = computed(() => {
    const transactionData = filteredTransactions.value
      .map((t: Transaction) => `${t.id}-${t.amount.amount}-${t.date}`)
      .join(',')
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    return `${transactionData}|${currentMonth}-${currentYear}`
  })

  // Cache for stats calculations
  const statsCache = new Map<string, TransactionStats>()

  // Combined stats calculation with memoization and single pass
  const stats = computed<TransactionStats>(() => {
    const memoKey = statsMemoKey.value
    
    // Return cached result if available
    if (statsCache.has(memoKey)) {
      return statsCache.get(memoKey)!
    }

    const transactions = filteredTransactions.value
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    
    // Single pass calculation for all stats
    let totalAmount = 0
    let thisMonthCount = 0
    
    transactions.forEach((t: Transaction) => {
      // Calculate total amount
      totalAmount += t.amount.amount
      
      // Count this month's transactions
      const txDate = new Date(t.date)
      if (txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear) {
        thisMonthCount++
      }
    })

    const result: TransactionStats = {
      totalCount: transactions.length,
      thisMonthCount,
      totalAmount: formatMoney({ amount: Math.abs(totalAmount), currency: 'GBP' })
    }

    // Cache the result
    statsCache.set(memoKey, result)
    
    // Clean up old cache entries (keep last 10)
    if (statsCache.size > 10) {
      const oldestKey = statsCache.keys().next().value
      if (oldestKey !== undefined) {
        statsCache.delete(oldestKey)
      }
    }

    return result
  })

  // Individual computed properties for backward compatibility
  const thisMonthCount = computed(() => stats.value.thisMonthCount)
  const totalAmount = computed(() => stats.value.totalAmount)

  const pagination = computed<PaginationConfig>(() => ({
    currentPage: currentPage.value,
    pageSize,
    totalPages: totalPages.value,
    totalItems: filteredTransactions.value.length
  }))

  const legacyFilters = computed<TransactionFilters>(() => ({
    selectedAccount: selectedAccount.value,
    subscriptionFilter: subscriptionFilter.value
  }))

  // Actions
  async function refreshTransactions() {
    loading.value = true
    error.value = null
    try {
      await transactionsStore.fetchTransactions()
      accounts.value = await bankAccountsStore.getAllAccounts()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to refresh transactions'
      console.error('Failed to refresh transactions:', err)
    } finally {
      loading.value = false
    }
  }

  async function testPatternDetection() {
    // Delegate to business logic layer
    await businessLogic.detectPatterns()
  }

  function updateFilters(newFilters: Partial<TransactionFilters>) {
    if (newFilters.selectedAccount !== undefined) {
      selectedAccount.value = newFilters.selectedAccount
      currentPage.value = 1 // Reset to first page when filtering
    }
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  function getAccountName(accountId: string): string {
    const account = accounts.value.find(a => a.id === accountId)
    return account ? `${account.institutionName} - ${account.accountName}` : 'Unknown Account'
  }

  function getAmountColor(amount: number): string {
    return amount > 0 ? 'text-red-600' : 'text-green-600'
  }

  // Return state and actions
  const state: TransactionListState = {
    loading: loading.value,
    error: error.value,
    transactions: paginatedTransactions.value,
    accounts: accounts.value,
    stats: stats.value,
    pagination: pagination.value,
    filters: transactionsStore.filters
  }

  const actions: TransactionActions = {
    refreshTransactions,
    testPatternDetection,
    updateFilters,
    goToPage,
    getAccountName,
    getAmountColor,
  }

  return {
    // State
    loading,
    error,
    accounts,
    selectedAccount,
    subscriptionFilter,
    paginatedTransactions,
    totalPages,
    stats,
    pagination,
    currentPage,
    // Computed properties
    filteredTransactions,
    thisMonthCount,
    totalAmount,
    // Filtering - use store functions directly
    filters: transactionsStore.filters,
    activeFilterCount,
    setAccountFilter: transactionsStore.setAccountFilter,
    setSubscriptionFilter: transactionsStore.setSubscriptionFilter,
    setMerchantSearchFilter: transactionsStore.setMerchantSearch,
    setDateRangeFilter: (start: string, end: string) => transactionsStore.setDateRange(start, end),
    setAmountRangeFilter: (min: number, max: number) => transactionsStore.setAmountRange(min, max),
    setCategoriesFilter: transactionsStore.setCategories,
    clearAllFilters: transactionsStore.clearAllFilters,
    clearFilter: (filterKey: string) => transactionsStore.clearFilter(filterKey as any),
    // Actions
    refreshTransactions,
    testPatternDetection,
    updateFilters,
    goToPage,
    getAccountName,
    getAmountColor,
    // State and actions objects
    state,
    actions
  }
}

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

  const thisMonthCount = computed(() => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    
    return filteredTransactions.value.filter(t => {
      const txDate = new Date(t.date)
      return txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear
    }).length
  })

  const totalAmount = computed(() => {
    const total = filteredTransactions.value.reduce((sum, t) => sum + t.amount.amount, 0)
    return formatMoney({ amount: Math.abs(total), currency: 'GBP' })
  })

  const stats = computed<TransactionStats>(() => ({
    totalCount: filteredTransactions.value.length,
    thisMonthCount: thisMonthCount.value,
    totalAmount: totalAmount.value
  }))

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

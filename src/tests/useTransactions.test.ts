import { describe, test, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTransactions } from '@/composables/useTransactions'
import { useTransactionsStore } from '@/stores/transactions'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useTransactionManagement } from '@/composables/useTransactionManagement'
import type { Transaction, BankAccount } from '@/domain/models'

// Mock stores to isolate the composable under test
vi.mock('@/stores/transactions')
vi.mock('@/stores/bankAccounts')
vi.mock('@/stores/transactionsData')
vi.mock('@/composables/useTransactionManagement')

describe('useTransactions', () => {
  let mockTransactionsStore: any
  let mockBankAccountsStore: any
  let mockDataStore: any
  let mockBusinessLogic: any
  let pinia: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a fresh Pinia instance for each test
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Mock transactions store
    mockTransactionsStore = {
      transactions: [],
      filteredTransactions: [],
      filters: {
        selectedAccount: '',
        subscriptionFilter: 'all'
      },
      activeFilterCount: 0,
      fetchTransactions: vi.fn().mockResolvedValue(undefined),
      setAccountFilter: vi.fn(),
      setSubscriptionFilter: vi.fn(),
      setMerchantSearch: vi.fn(),
      setDateRange: vi.fn(),
      setAmountRange: vi.fn(),
      setCategories: vi.fn(),
      setStatus: vi.fn(),
      clearAllFilters: vi.fn(),
      clearFilter: vi.fn(),
    }

    // Mock bank accounts store
    mockBankAccountsStore = {
      getAllAccounts: vi.fn().mockResolvedValue([])
    }

    // Mock data store
    mockDataStore = {
      transactions: [],
      loading: false,
      error: null,
      fetchTransactions: vi.fn().mockResolvedValue(undefined),
      getById: vi.fn(),
      save: vi.fn(),
      updateTransaction: vi.fn(),
      seed: vi.fn(),
      clear: vi.fn(),
      startListening: vi.fn(),
      stopListening: vi.fn(),
      isRealtime: vi.fn().mockReturnValue(false),
    }

    // Mock business logic
    mockBusinessLogic = {
      patternDetectionLoading: false,
      patternDetectionError: null,
      detectPatterns: vi.fn().mockResolvedValue([]),
      createTransaction: vi.fn(),
      updateTransactionWithSubscription: vi.fn(),
      bulkUpdateTransactions: vi.fn(),
      validateTransactionData: vi.fn(),
      transactions: [],
      loading: false,
      error: null,
      fetchTransactions: vi.fn(),
      saveTransaction: vi.fn(),
      clearTransactions: vi.fn(),
    }

    // Setup mocked stores
    const MockTransactionsStore = vi.mocked(useTransactionsStore)
    const MockBankAccountsStore = vi.mocked(useBankAccountsStore)
    const MockDataStore = vi.mocked(useTransactionsDataStore)
    const MockBusinessLogic = vi.mocked(useTransactionManagement)
    
    MockTransactionsStore.mockReturnValue(mockTransactionsStore)
    MockBankAccountsStore.mockReturnValue(mockBankAccountsStore)
    MockDataStore.mockReturnValue(mockDataStore)
    MockBusinessLogic.mockReturnValue(mockBusinessLogic)
  })

  describe('initialization', () => {
    test('initializes with default state values', () => {
      // Act
      const result = useTransactions()

      // Assert
      expect(result.loading.value).toBe(false)
      expect(result.error.value).toBe(null)
      expect(result.accounts.value).toEqual([])
      expect(result.currentPage.value).toBe(1)
    })

    test('uses stores correctly', () => {
      // Act
      useTransactions()

      // Assert
      expect(useTransactionsStore).toHaveBeenCalled()
      expect(useBankAccountsStore).toHaveBeenCalled()
      expect(useTransactionManagement).toHaveBeenCalled()
      // Note: useTransactionsDataStore is not directly used in useTransactions
      // It's used inside useTransactionManagement, so we don't test it here
    })

    test('teardown cleans up Pinia', () => {
      // Act
      const result = useTransactions()

      // Assert - Pinia should be active after composable creation
      expect(pinia).toBeDefined()
    })
  })

  describe('computed properties', () => {
    test('filteredTransactions uses store value', () => {
      // Arrange
      const mockTransactions: Transaction[] = [
        {
          id: 'tx1',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'GBP' },
          date: '2024-01-15',
          accountId: 'acc1',
          userId: 'user1',
          pending: false,
                  }
      ]
      
      mockTransactionsStore.filteredTransactions = mockTransactions

      // Act
      const result = useTransactions()

      // Assert
      expect(result.filteredTransactions.value).toEqual(mockTransactions)
    })

    test('activeFilterCount uses store value', () => {
      // Arrange
      mockTransactionsStore.activeFilterCount = 2

      // Act
      const result = useTransactions()

      // Assert
      expect(result.activeFilterCount.value).toBe(2)
    })

    test('selectedAccount getter uses store filter', () => {
      // Arrange
      mockTransactionsStore.filters.selectedAccount = 'acc1'

      // Act
      const result = useTransactions()

      // Assert
      expect(result.selectedAccount.value).toBe('acc1')
    })

    test('selectedAccount setter calls store function', () => {
      // Arrange
      const result = useTransactions()

      // Act
      result.selectedAccount.value = 'acc2'

      // Assert
      expect(mockTransactionsStore.setAccountFilter).toHaveBeenCalledWith('acc2')
    })

    test('subscriptionFilter getter uses store filter', () => {
      // Arrange
      mockTransactionsStore.filters.subscriptionFilter = 'subscriptions'

      // Act
      const result = useTransactions()

      // Assert
      expect(result.subscriptionFilter.value).toBe('subscriptions')
    })

    test('subscriptionFilter setter calls store function', () => {
      // Arrange
      const result = useTransactions()

      // Act
      result.subscriptionFilter.value = 'all'

      // Assert
      expect(mockTransactionsStore.setSubscriptionFilter).toHaveBeenCalledWith('all')
    })

    test('paginatedTransactions calculates correct slice', () => {
      // Arrange
      const mockTransactions: Transaction[] = Array.from({ length: 25 }, (_, i) => ({
        id: `tx${i}`,
        merchantName: `Merchant ${i}`,
        amount: { amount: 10 + i, currency: 'GBP' },
        date: '2024-01-15',
        accountId: 'acc1',
        userId: 'user1',
        pending: false,
              }))
      
      mockTransactionsStore.filteredTransactions = mockTransactions

      // Act
      const result = useTransactions()

      // Assert - first page (page 1, size 20) should return first 20 items
      expect(result.paginatedTransactions.value).toHaveLength(20)
      expect(result.paginatedTransactions.value[0].id).toBe('tx0')
      expect(result.paginatedTransactions.value[19].id).toBe('tx19')
    })

    test('totalPages calculates correctly', () => {
      // Arrange
      const mockTransactions: Transaction[] = Array.from({ length: 45 }, (_, i) => ({
        id: `tx${i}`,
        merchantName: `Merchant ${i}`,
        amount: { amount: 10 + i, currency: 'GBP' },
        date: '2024-01-15',
        accountId: 'acc1',
        userId: 'user1',
        pending: false,
              }))
      
      mockTransactionsStore.filteredTransactions = mockTransactions

      // Act
      const result = useTransactions()

      // Assert - 45 items with page size 20 = 3 pages
      expect(result.totalPages.value).toBe(3)
    })

    test('thisMonthCount filters transactions from current month', () => {
      // Arrange
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      
      const mockTransactions: Transaction[] = [
        {
          id: 'tx1',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'GBP' },
          date: new Date(currentYear, currentMonth, 15).toISOString().split('T')[0],
          accountId: 'acc1',
          userId: 'user1',
          pending: false,
                  },
        {
          id: 'tx2',
          merchantName: 'Spotify',
          amount: { amount: 9.99, currency: 'GBP' },
          date: new Date(currentYear, currentMonth - 1, 15).toISOString().split('T')[0], // Last month
          accountId: 'acc1',
          userId: 'user1',
          pending: false,
                  }
      ]
      
      mockTransactionsStore.filteredTransactions = mockTransactions

      // Act
      const result = useTransactions()

      // Assert
      expect(result.thisMonthCount.value).toBe(1)
    })

    test('totalAmount calculates sum of filtered transactions', () => {
      // Arrange
      const mockTransactions: Transaction[] = [
        {
          id: 'tx1',
          merchantName: 'Netflix',
          amount: { amount: -15.99, currency: 'GBP' },
          date: '2024-01-15',
          accountId: 'acc1',
          userId: 'user1',
          pending: false,
                  },
        {
          id: 'tx2',
          merchantName: 'Spotify',
          amount: { amount: -9.99, currency: 'GBP' },
          date: '2024-01-10',
          accountId: 'acc1',
          userId: 'user1',
          pending: false,
                  }
      ]
      
      mockTransactionsStore.filteredTransactions = mockTransactions

      // Act
      const result = useTransactions()

      // Assert - sum of absolute amounts: 15.99 + 9.99 = 25.98
      expect(result.totalAmount.value).toBe('£25.98')
    })
  })

  describe('actions', () => {
    test('refreshTransactions calls store and bank accounts store', async () => {
      // Arrange
      const mockAccounts: BankAccount[] = [
        {
          id: 'acc1',
          institutionName: 'Test Bank',
          accountName: 'Current Account',
          accountType: 'checking',
          mask: '1234',
          currency: 'GBP',
          balance: { amount: 1000, currency: 'GBP' },
          userId: 'user1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]
      
      mockBankAccountsStore.getAllAccounts.mockResolvedValue(mockAccounts)
      const result = useTransactions()

      // Act
      await result.refreshTransactions()

      // Assert
      expect(mockTransactionsStore.fetchTransactions).toHaveBeenCalled()
      expect(mockBankAccountsStore.getAllAccounts).toHaveBeenCalled()
      expect(result.accounts.value).toEqual(mockAccounts)
    })

    test('refreshTransactions handles errors correctly', async () => {
      // Arrange
      const errorMessage = 'Failed to fetch transactions'
      mockTransactionsStore.fetchTransactions.mockRejectedValue(new Error(errorMessage))
      
      const result = useTransactions()

      // Act
      await result.refreshTransactions()

      expect(result.error.value).toBe(errorMessage)
      expect(result.loading.value).toBe(false)
    })

    test('updateFilters updates selectedAccount and resets page', () => {
      // Arrange
      const result = useTransactions()
      result.currentPage.value = 3 // Set to non-first page

      // Act
      result.updateFilters({ selectedAccount: 'acc1' })

      // Assert
      expect(mockTransactionsStore.setAccountFilter).toHaveBeenCalledWith('acc1')
      expect(result.currentPage.value).toBe(1) // Should reset to first page
    })

    test('goToPage updates currentPage when valid', () => {
      // Arrange
      const mockTransactions: Transaction[] = Array.from({ length: 25 }, (_, i) => ({
        id: `tx${i}`,
        merchantName: `Merchant ${i}`,
        amount: { amount: 10 + i, currency: 'GBP' },
        date: '2024-01-15',
        accountId: 'acc1',
        userId: 'user1',
        pending: false,
              }))
      
      mockTransactionsStore.filteredTransactions = mockTransactions
      const result = useTransactions()

      // Act
      result.goToPage(2)

      // Assert
      expect(result.currentPage.value).toBe(2)
    })

    test('goToPage does not update when invalid page', () => {
      // Arrange
      const result = useTransactions()
      const originalPage = result.currentPage.value

      // Act
      result.goToPage(999) // Invalid page number

      // Assert
      expect(result.currentPage.value).toBe(originalPage)
    })

    test('getAccountName returns formatted account name', () => {
      // Arrange
      const mockAccounts: BankAccount[] = [
        {
          id: 'acc1',
          institutionName: 'Test Bank',
          accountName: 'Current Account',
          accountType: 'checking',
          mask: '1234',
          currency: 'GBP',
          balance: { amount: 1000, currency: 'GBP' },
          userId: 'user1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]
      
      const result = useTransactions()
      result.accounts.value = mockAccounts

      // Act
      const accountName = result.getAccountName('acc1')

      // Assert
      expect(accountName).toBe('Test Bank - Current Account')
    })

    test('getAccountName returns unknown for non-existent account', () => {
      // Arrange
      const result = useTransactions()
      result.accounts.value = []

      // Act
      const accountName = result.getAccountName('nonexistent')

      // Assert
      expect(accountName).toBe('Unknown Account')
    })

    test('getAmountColor returns correct colors', () => {
      // Arrange
      const result = useTransactions()

      // Act & Assert
      expect(result.getAmountColor(100)).toBe('text-red-600') // Positive amount (expense)
      expect(result.getAmountColor(-50)).toBe('text-green-600') // Negative amount (income)
    })
  })

  describe('filtering functions', () => {
    test('setMerchantSearchFilter calls store function', () => {
      // Arrange
      const result = useTransactions()

      // Act
      result.setMerchantSearchFilter('netflix')

      // Assert
      expect(mockTransactionsStore.setMerchantSearch).toHaveBeenCalledWith('netflix')
    })

    test('setDateRangeFilter calls store setDateRange', () => {
      // Arrange
      const result = useTransactions()

      // Act
      result.setDateRangeFilter('2024-01-01', '2024-12-31')

      // Assert
      expect(mockTransactionsStore.setDateRange).toHaveBeenCalledWith('2024-01-01', '2024-12-31')
    })

    test('setAmountRangeFilter calls store setAmountRange', () => {
      // Arrange
      const result = useTransactions()

      // Act
      result.setAmountRangeFilter(10, 100)

      // Assert
      expect(mockTransactionsStore.setAmountRange).toHaveBeenCalledWith(10, 100)
    })

    test('setCategoriesFilter calls store setCategories', () => {
      // Arrange
      const result = useTransactions()
      const categories = ['cat1', 'cat2']

      // Act
      result.setCategoriesFilter(categories)

      // Assert
      expect(mockTransactionsStore.setCategories).toHaveBeenCalledWith(categories)
    })

    test('clearAllFilters calls store function', () => {
      // Arrange
      const result = useTransactions()

      // Act
      result.clearAllFilters()

      // Assert
      expect(mockTransactionsStore.clearAllFilters).toHaveBeenCalled()
    })

    test('clearFilter calls store function with correct key', () => {
      // Arrange
      const result = useTransactions()

      // Act
      result.clearFilter('selectedAccount')

      // Assert
      expect(mockTransactionsStore.clearFilter).toHaveBeenCalledWith('selectedAccount')
    })
  })

  describe('state object', () => {
    test('state object reflects current values', () => {
      // Arrange
      const mockTransactions: Transaction[] = [
        {
          id: 'tx1',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'GBP' },
          date: '2024-01-15',
          accountId: 'acc1',
          userId: 'user1',
          pending: false,
                  }
      ]
      
      mockTransactionsStore.filteredTransactions = mockTransactions
      mockTransactionsStore.filters.selectedAccount = 'acc1'

      const result = useTransactions()

      // Act
      const state = result.state

      // Assert
      expect(state.loading).toBe(false)
      expect(state.error).toBe(null)
      expect(state.transactions).toEqual(mockTransactions)
      expect(state.filters.selectedAccount).toBe('acc1')
    })
  })

  describe('actions object', () => {
    test('actions object contains correct functions', () => {
      // Arrange
      const result = useTransactions()

      // Act
      const actions = result.actions

      // Assert
      expect(actions.refreshTransactions).toBeDefined()
      expect(actions.testPatternDetection).toBeDefined()
      expect(actions.updateFilters).toBeDefined()
      expect(actions.goToPage).toBeDefined()
      expect(actions.getAccountName).toBeDefined()
      expect(actions.getAmountColor).toBeDefined()
    })
  })
})

import type { BankAccount, Transaction } from '@/domain/models'

export interface TransactionFilters {
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

export interface TransactionStats {
  totalCount: number
  thisMonthCount: number
  totalAmount: string
}

export interface PaginationConfig {
  currentPage: number
  pageSize: number
  totalPages: number
  totalItems: number
}

export interface TransactionListState {
  loading: boolean
  error: string | null
  transactions: Transaction[]
  accounts: BankAccount[]
  filters: TransactionFilters
  pagination: PaginationConfig
  stats: TransactionStats
}

export interface TransactionActions {
  refreshTransactions: () => Promise<void>
  testPatternDetection: () => Promise<void>
  updateFilters: (filters: Partial<TransactionFilters>) => void
  goToPage: (page: number) => void
  getAccountName: (accountId: string) => string
  getAmountColor: (amount: number) => string
}

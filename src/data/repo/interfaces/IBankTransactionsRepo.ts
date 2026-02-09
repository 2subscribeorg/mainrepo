import type { ID, BankTransaction } from '@/domain/models'

export interface TransactionMatchSuggestion {
  transaction: BankTransaction
  suggestedSubscriptionId?: ID
  confidence: number  // 0-1
  reason: 'exact_match' | 'fuzzy_match' | 'recurring_pattern' | 'manual_needed'
}

export interface IBankTransactionsRepo {
  // List all bank transactions (for a date range)
  list(accountId?: ID, fromDate?: string, toDate?: string): Promise<BankTransaction[]>
  
  // Get transactions for a specific subscription
  getForSubscription(subscriptionId: ID): Promise<BankTransaction[]>
  
  // Get unmatched recurring transactions (candidates for new subscriptions)
  getUnmatched(): Promise<TransactionMatchSuggestion[]>
  
  // Match a transaction to a subscription
  matchToSubscription(transactionId: ID, subscriptionId: ID): Promise<void>
  
  // Dismiss a transaction (not a subscription)
  dismiss(transactionId: ID): Promise<void>
  
  // Sync transactions from bank (via Plaid later)
  syncFromBank(accountId: ID): Promise<void>
}

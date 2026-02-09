import type { ID, BankTransaction } from '@/domain/models'
import type { IBankTransactionsRepo, TransactionMatchSuggestion } from '../interfaces/IBankTransactionsRepo'

// Mock recurring charges that look like subscriptions but aren't matched yet
const MOCK_UNMATCHED_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'tx-unmatched-1',
    accountId: 'mock-account-1',
    amount: { amount: 7.99, currency: 'GBP' },
    merchantName: 'AMZN Mktp UK',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
    category: ['Shopping', 'Online'],
    pending: false,
    transactionType: 'purchase',
  },
  {
    id: 'tx-unmatched-2',
    accountId: 'mock-account-1',
    amount: { amount: 0.99, currency: 'GBP' },
    merchantName: 'APPLE.COM/BILL',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    category: ['Service', 'Technology'],
    pending: false,
    transactionType: 'purchase',
  },
  {
    id: 'tx-unmatched-3',
    accountId: 'mock-account-1',
    amount: { amount: 5.00, currency: 'GBP' },
    merchantName: 'PATREON',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago
    category: ['Service', 'Media'],
    pending: false,
    transactionType: 'purchase',
  },
]

export class MockBankTransactionsRepo implements IBankTransactionsRepo {
  private transactions: BankTransaction[] = [...MOCK_UNMATCHED_TRANSACTIONS]
  private matched: Map<ID, ID> = new Map() // transactionId -> subscriptionId
  private dismissed: Set<ID> = new Set()
  
  async list(accountId?: ID, fromDate?: string, toDate?: string): Promise<BankTransaction[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    let filtered = [...this.transactions]
    
    if (accountId) {
      filtered = filtered.filter(tx => tx.accountId === accountId)
    }
    
    if (fromDate) {
      filtered = filtered.filter(tx => tx.date >= fromDate)
    }
    
    if (toDate) {
      filtered = filtered.filter(tx => tx.date <= toDate)
    }
    
    return filtered.sort((a, b) => b.date.localeCompare(a.date))
  }
  
  async getForSubscription(subscriptionId: ID): Promise<BankTransaction[]> {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Return transactions matched to this subscription
    const matchedTxIds = Array.from(this.matched.entries())
      .filter(([_, subId]) => subId === subscriptionId)
      .map(([txId]) => txId)
    
    return this.transactions.filter(tx => matchedTxIds.includes(tx.id))
  }
  
  async getUnmatched(): Promise<TransactionMatchSuggestion[]> {
    await new Promise(resolve => setTimeout(resolve, 400))
    
    // Filter out matched and dismissed transactions
    const unmatched = this.transactions.filter(
      tx => !this.matched.has(tx.id) && !this.dismissed.has(tx.id)
    )
    
    // Generate suggestions with mock confidence scores
    return unmatched.map(tx => {
      const suggestion = this.generateSuggestion(tx)
      return {
        transaction: tx,
        suggestedSubscriptionId: suggestion.subscriptionId,
        confidence: suggestion.confidence,
        reason: suggestion.reason,
      }
    })
  }
  
  private generateSuggestion(tx: BankTransaction): {
    subscriptionId?: ID
    confidence: number
    reason: 'exact_match' | 'fuzzy_match' | 'recurring_pattern' | 'manual_needed'
  } {
    // Mock logic - in real implementation, this would use merchant matching rules
    const merchant = tx.merchantName.toLowerCase()
    
    // High confidence matches
    if (merchant.includes('amzn') || merchant.includes('amazon')) {
      return {
        subscriptionId: undefined, // Could suggest Amazon Prime if it exists
        confidence: 0.85,
        reason: 'fuzzy_match',
      }
    }
    
    if (merchant.includes('apple')) {
      return {
        subscriptionId: undefined, // Could suggest iCloud if it exists
        confidence: 0.80,
        reason: 'fuzzy_match',
      }
    }
    
    if (merchant.includes('patreon')) {
      return {
        subscriptionId: undefined,
        confidence: 0.75,
        reason: 'recurring_pattern',
      }
    }
    
    // Default: manual review needed
    return {
      confidence: 0.5,
      reason: 'manual_needed',
    }
  }
  
  async matchToSubscription(transactionId: ID, subscriptionId: ID): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (!this.transactions.find(tx => tx.id === transactionId)) {
      throw new Error('Transaction not found')
    }
    
    this.matched.set(transactionId, subscriptionId)
    console.log('🔗 Matched transaction', transactionId, 'to subscription', subscriptionId)
  }
  
  async dismiss(transactionId: ID): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    if (!this.transactions.find(tx => tx.id === transactionId)) {
      throw new Error('Transaction not found')
    }
    
    this.dismissed.add(transactionId)
    console.log('✖️ Dismissed transaction', transactionId)
  }
  
  async syncFromBank(accountId: ID): Promise<void> {
    // Mock sync - in real implementation, this would call Plaid API
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    console.log('🔄 Mock sync from bank for account', accountId)
    console.log('💡 In production, this would call Plaid transactions/get endpoint')
    
    // Could add more mock transactions here if needed
  }
}

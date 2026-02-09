import { ref } from 'vue'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useBankTransactionsStore } from '@/stores/bankTransactions'
import { useAuthStore } from '@/stores/auth'
import { SubscriptionDetectionService } from '@/services/SubscriptionDetectionService'
import type { BankTransaction } from '@/domain/models'

/**
 * Business logic layer - Pattern detection and subscription creation
 * Single Responsibility: Business logic and domain operations
 */
export function useTransactionManagement() {
  const dataStore = useTransactionsDataStore()
  const subscriptionsStore = useSubscriptionsStore()
  const bankTransactionsStore = useBankTransactionsStore()
  const authStore = useAuthStore()
  
  // Business logic state
  const patternDetectionLoading = ref(false)
  const patternDetectionError = ref<string | null>(null)

  // Pattern detection business logic
  async function detectPatterns() {
    patternDetectionLoading.value = true
    patternDetectionError.value = null
    
    try {
      const authStore = useAuthStore()
      const subscriptionsStore = useSubscriptionsStore()
      
      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      const detectionService = new SubscriptionDetectionService()
      const bankTransactions = dataStore.transactions.map(t => ({
        id: t.id,
        accountId: t.accountId || 'unknown',
        merchantName: t.merchantName,
        amount: t.amount,
        date: t.date,
        pending: false,
        transactionType: 'purchase' as const,
        userId: authStore.user!.id,
      }))

      console.log(`🔍 Detecting patterns in ${bankTransactions.length} transactions...`)
      console.log('🔍 All transactions from store:', dataStore.transactions.length)
      console.log('Sample transactions:', bankTransactions.slice(0, 3))
      
      // Look specifically for Aldi transactions (debugging)
      const aldiTransactions = bankTransactions.filter(t => 
        t.merchantName.toLowerCase().includes('aldi')
      )
      console.log(`🔍 Found ${aldiTransactions.length} Aldi transactions:`, aldiTransactions)
      
      if (bankTransactions.length === 0) {
        console.log('❌ No transactions available for pattern detection')
        return
      }
      
      const patterns = detectionService.detectPatterns(bankTransactions)

      // Add patterns for manual review
      for (const pattern of patterns) {
        await bankTransactionsStore.addPendingPattern(pattern)
        console.log('📋 Added pattern for manual review:', pattern.merchant)
      }

      console.log(`✅ Pattern detection complete: ${patterns.length} patterns found for review`)
      alert(`Pattern detection complete!\n${patterns.length} patterns found for manual review.\nGo to Subscriptions tab to review them.`)
      
    } catch (e) {
      patternDetectionError.value = e instanceof Error ? e.message : 'Failed to detect patterns'
      console.error('❌ Pattern detection failed:', e)
      throw e
    } finally {
      patternDetectionLoading.value = false
    }
  }

  // Transaction creation business logic
  async function createTransaction(transactionData: Omit<BankTransaction, 'id' | 'userId'>) {
    if (!authStore.user) {
      throw new Error('User not authenticated')
    }

    const newTransaction: BankTransaction = {
      id: crypto.randomUUID(),
      userId: authStore.user.id,
      ...transactionData
    }

    await dataStore.save(newTransaction)
    console.log('✅ Transaction created:', newTransaction.id)
    return newTransaction
  }

  // Transaction update business logic
  async function updateTransactionWithSubscription(
    transactionId: string, 
    subscriptionId: string, 
    categoryId: string
  ) {
    const transaction = await dataStore.getById(transactionId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    const updatedTransaction = {
      ...transaction,
      subscriptionId,
      categoryId,
      updatedAt: new Date().toISOString()
    }

    await dataStore.updateTransaction(updatedTransaction)
    
    // Also update the related subscription if it exists
    if (transaction.subscriptionId) {
      const subscription = subscriptionsStore.subscriptions.find(s => s.id === transaction.subscriptionId)
      if (subscription) {
        const updatedSubscription = {
          ...subscription,
          categoryId,
          updatedAt: new Date().toISOString()
        }
        await subscriptionsStore.save(updatedSubscription)
      }
    }
    
    console.log(`✅ Transaction ${transactionId} updated with subscription ${subscriptionId}`)
    return updatedTransaction
  }

  // Bulk operations business logic
  async function bulkUpdateTransactions(updates: Array<{ id: string; data: Partial<BankTransaction> }>) {
    const results = []
    
    for (const update of updates) {
      try {
        const transaction = await dataStore.getById(update.id)
        if (!transaction) {
          console.warn(`⚠️ Transaction ${update.id} not found, skipping`)
          continue
        }
        
        const updatedTransaction = { ...transaction, ...update.data }
        await dataStore.updateTransaction(updatedTransaction)
        results.push(updatedTransaction)
      } catch (error) {
        console.error(`❌ Failed to update transaction ${update.id}:`, error)
      }
    }
    
    console.log(`✅ Bulk update complete: ${results.length}/${updates.length} transactions updated`)
    return results
  }

  // Data validation business logic
  function validateTransactionData(data: Partial<BankTransaction>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!data.merchantName || data.merchantName.trim().length === 0) {
      errors.push('Merchant name is required')
    }
    
    if (!data.amount || data.amount.amount === 0) {
      errors.push('Amount must be greater than 0')
    }
    
    if (!data.date) {
      errors.push('Date is required')
    } else {
      const date = new Date(data.date)
      if (isNaN(date.getTime())) {
        errors.push('Invalid date format')
      } else if (date > new Date()) {
        errors.push('Date cannot be in the future')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  return {
    // State
    patternDetectionLoading,
    patternDetectionError,
    
    // Business logic functions
    detectPatterns,
    createTransaction,
    updateTransactionWithSubscription,
    bulkUpdateTransactions,
    validateTransactionData,
    
    // Access to data store (read-only for business logic)
    transactions: dataStore.transactions,
    loading: dataStore.loading,
    error: dataStore.error,
    
    // Data store operations (delegated)
    fetchTransactions: dataStore.fetchTransactions,
    saveTransaction: dataStore.save,
    clearTransactions: dataStore.clear,
  }
}

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ID, BankTransaction } from '@/domain/models'
import type { TransactionMatchSuggestion } from '@/data/repo/interfaces/IBankTransactionsRepo'
import type { RecurringPattern } from '@/services/PatternDetector'
import { repoFactory } from '@/data/repo/RepoFactory'
import { useLoadingStates } from '@/composables/useLoadingStates'

export const useBankTransactionsStore = defineStore('bankTransactions', () => {
  const unmatchedTransactions = ref<TransactionMatchSuggestion[]>([])
  const pendingPatterns = ref<RecurringPattern[]>([])
  const error = ref<string | null>(null)
  
  const { withLoading, isLoading } = useLoadingStates()
  const loading = isLoading('bankTransactions')

  const repo = repoFactory.getBankTransactionsRepo()

  const needsReviewCount = computed(() => pendingPatterns.value.length)

  async function fetchUnmatched() {
    return await withLoading('bankTransactions', async () => {
      error.value = null
      try {
        // Remove mock data - get patterns from pattern detection instead
        unmatchedTransactions.value = await repo.getUnmatched()
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to fetch unmatched transactions'
        console.error('❌ Failed to fetch unmatched transactions:', e)
        throw e
      }
    })
  }

  async function matchToSubscription(transactionId: ID, subscriptionId: ID) {
    return await withLoading('bankTransactions', async () => {
      error.value = null
      try {
        await repo.matchToSubscription(transactionId, subscriptionId)
        
        // Remove from unmatched list
        unmatchedTransactions.value = unmatchedTransactions.value.filter(
          item => item.transaction.id !== transactionId
        )
        
        console.log(`✅ Matched transaction ${transactionId} to subscription ${subscriptionId}`)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to match transaction'
        console.error('❌ Failed to match transaction:', e)
        throw e
      }
    })
  }

  async function dismissTransaction(transactionId: ID) {
    return await withLoading('bankTransactions', async () => {
      error.value = null
      try {
        await repo.dismiss(transactionId)
        
        // Remove from unmatched list
        unmatchedTransactions.value = unmatchedTransactions.value.filter(
          item => item.transaction.id !== transactionId
        )
        
        console.log(`✅ Dismissed transaction ${transactionId}`)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to dismiss transaction'
        console.error('❌ Failed to dismiss transaction:', e)
        throw e
      }
    })
  }

  async function syncFromBank(accountId: ID) {
    return await withLoading('bankTransactions', async () => {
      error.value = null
      try {
        await repo.syncFromBank(accountId)
        
        // Refresh unmatched list after sync
        await fetchUnmatched()
        
        console.log(`✅ Synced transactions from bank account ${accountId}`)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to sync from bank'
        console.error('❌ Failed to sync from bank:', e)
        throw e
      }
    })
  }

  async function getTransactionsForSubscription(subscriptionId: ID): Promise<BankTransaction[]> {
    try {
      return await repo.getForSubscription(subscriptionId)
    } catch (e) {
      console.error('❌ Failed to get transactions for subscription:', e)
      return []
    }
  }

  async function addPendingPattern(pattern: RecurringPattern) {
    pendingPatterns.value.push(pattern)
  }

  async function createSubscriptionFromPattern(pattern: RecurringPattern) {
    try {
      // Remove from pending patterns
      pendingPatterns.value = pendingPatterns.value.filter(p => p !== pattern)
      // Note: Actual subscription creation will be handled by SubscriptionDetectionService
      return pattern
    } catch (e) {
      console.error('❌ Failed to create subscription from pattern:', e)
      throw e
    }
  }

  async function dismissPattern(pattern: RecurringPattern) {
    try {
      // Remove from pending patterns
      pendingPatterns.value = pendingPatterns.value.filter(p => p !== pattern)
    } catch (e) {
      console.error('❌ Failed to dismiss pattern:', e)
      throw e
    }
  }

  return {
    unmatchedTransactions,
    pendingPatterns,
    loading,
    error,
    needsReviewCount,
    fetchUnmatched,
    matchToSubscription,
    dismissTransaction,
    syncFromBank,
    getTransactionsForSubscription,
    addPendingPattern,
    createSubscriptionFromPattern,
    dismissPattern,
  }
})

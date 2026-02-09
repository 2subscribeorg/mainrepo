import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ID, BankTransaction } from '@/domain/models'
import type { TransactionMatchSuggestion } from '@/data/repo/interfaces/IBankTransactionsRepo'
import type { RecurringPattern } from '@/services/PatternDetector'
import { repoFactory } from '@/data/repo/RepoFactory'

export const useBankTransactionsStore = defineStore('bankTransactions', () => {
  const unmatchedTransactions = ref<TransactionMatchSuggestion[]>([])
  const pendingPatterns = ref<RecurringPattern[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const repo = repoFactory.getBankTransactionsRepo()

  const needsReviewCount = computed(() => pendingPatterns.value.length)

  async function fetchUnmatched() {
    loading.value = true
    error.value = null
    try {
      // Remove mock data - get patterns from pattern detection instead
      unmatchedTransactions.value = []
      console.log('🔍 Mock data removed - unmatched transactions now empty')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch unmatched transactions'
      console.error('❌ Failed to fetch unmatched transactions:', e)
    } finally {
      loading.value = false
    }
  }

  async function matchToSubscription(transactionId: ID, subscriptionId: ID) {
    loading.value = true
    error.value = null
    try {
      console.log('🔗 Matching transaction to subscription...')
      await repo.matchToSubscription(transactionId, subscriptionId)
      
      // Remove from unmatched list
      unmatchedTransactions.value = unmatchedTransactions.value.filter(
        item => item.transaction.id !== transactionId
      )
      
      console.log('✅ Transaction matched successfully')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to match transaction'
      console.error('❌ Failed to match transaction:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function dismissTransaction(transactionId: ID) {
    loading.value = true
    error.value = null
    try {
      console.log('✖️ Dismissing transaction...')
      await repo.dismiss(transactionId)
      
      // Remove from unmatched list
      unmatchedTransactions.value = unmatchedTransactions.value.filter(
        item => item.transaction.id !== transactionId
      )
      
      console.log('✅ Transaction dismissed')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to dismiss transaction'
      console.error('❌ Failed to dismiss transaction:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function syncFromBank(accountId: ID) {
    loading.value = true
    error.value = null
    try {
      console.log('🔄 Syncing transactions from bank...')
      await repo.syncFromBank(accountId)
      
      // Refresh unmatched list after sync
      await fetchUnmatched()
      
      console.log('✅ Bank sync completed')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to sync from bank'
      console.error('❌ Failed to sync from bank:', e)
      throw e
    } finally {
      loading.value = false
    }
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
    console.log('📋 Added pattern for review:', pattern.merchant)
  }

  async function createSubscriptionFromPattern(pattern: RecurringPattern) {
    try {
      // Remove from pending patterns
      pendingPatterns.value = pendingPatterns.value.filter(p => p !== pattern)
      console.log('✅ Creating subscription from pattern:', pattern.merchant)
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
      console.log('✖️ Dismissed pattern:', pattern.merchant)
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

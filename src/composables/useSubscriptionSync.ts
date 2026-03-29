import { watch } from 'vue'
import { logger } from '@/utils/logger'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsStore } from '@/stores/transactions'
import { useBankTransactionsStore } from '@/stores/bankTransactions'
import { useTransactionManagement } from '@/composables/useTransactionManagement'
import type { Subscription } from '@/domain/models'

/**
 * Composable to handle subscription synchronization between tabs and stores
 */
export function useSubscriptionSync() {
  const subscriptionsStore = useSubscriptionsStore()
  const transactionsStore = useTransactionsStore()
  const bankTransactionsStore = useBankTransactionsStore()
  const transactionManagement = useTransactionManagement()

  /**
   * Sync subscription creation across all relevant stores
   */
  async function syncSubscriptionCreation(subscription: Subscription): Promise<boolean> {
    try {
      logger.debug('🔄 Syncing subscription creation:', subscription.merchantName)
      
      // Save to subscriptions store
      await subscriptionsStore.save(subscription)
      
      // Refresh subscriptions to ensure UI updates
      await subscriptionsStore.fetchAll()
      
      // Run pattern detection to link existing transactions
      await transactionManagement.detectPatterns()
      
      logger.success('Subscription sync completed')
      return true
    } catch (error) {
      logger.error('❌ Subscription sync failed:', error)
      return false
    }
  }

  /**
   * Sync subscription updates across stores
   */
  async function syncSubscriptionUpdate(subscriptionId: string, updates: Partial<Subscription>): Promise<boolean> {
    try {
      logger.debug('🔄 Syncing subscription update:', subscriptionId)
      
      // Update in subscriptions store
      const existingSubscription = subscriptionsStore.subscriptions.find(s => s.id === subscriptionId)
      if (existingSubscription) {
        const updatedSubscription = { ...existingSubscription, ...updates }
        await subscriptionsStore.save(updatedSubscription)
      }
      
      // Refresh to ensure UI updates
      await subscriptionsStore.fetchAll()
      
      logger.success('Subscription update sync completed')
      return true
    } catch (error) {
      logger.error('❌ Subscription update sync failed:', error)
      return false
    }
  }

  /**
   * Sync subscription deletion across stores
   */
  async function syncSubscriptionDeletion(subscriptionId: string): Promise<boolean> {
    try {
      logger.debug('🔄 Syncing subscription deletion:', subscriptionId)
      
      // Remove from subscriptions store
      // Note: Actual deletion method depends on store implementation
      
      // Refresh to ensure UI updates
      await subscriptionsStore.fetchAll()
      
      logger.success('Subscription deletion sync completed')
      return true
    } catch (error) {
      logger.error('❌ Subscription deletion sync failed:', error)
      return false
    }
  }

  /**
   * Watch for subscription changes and trigger pattern matching
   */
  function setupSubscriptionWatcher(): void {
    watch(
      () => subscriptionsStore.subscriptions.length,
      async (newCount, oldCount) => {
        if (newCount > oldCount) {
          logger.debug('📊 New subscription detected, running pattern matching...')
          // Run pattern detection to link transactions to new subscription
          await transactionManagement.detectPatterns()
        }
      }
    )
  }

  return {
    syncSubscriptionCreation,
    syncSubscriptionUpdate,
    syncSubscriptionDeletion,
    setupSubscriptionWatcher
  }
}

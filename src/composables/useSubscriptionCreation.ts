import { ref } from 'vue'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import type { Transaction, Subscription } from '@/domain/models'

export function useSubscriptionCreation() {
  const subscriptionsStore = useSubscriptionsStore()
  const transactionsStore = useTransactionsStore()
  const authStore = useAuthStore()
  
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function createSubscriptionFromTransaction(
    transaction: Transaction, 
    categoryId: string
  ): Promise<Subscription> {
    loading.value = true
    error.value = null
    
    try {
      // Calculate next payment date (30 days from transaction)
      const nextDate = new Date(transaction.date)
      nextDate.setDate(nextDate.getDate() + 30)
      
      const newSubscription: Subscription = {
        id: crypto.randomUUID(),
        userId: authStore.userId || 'unknown',
        categoryId: categoryId,
        merchantName: transaction.merchantName,
        amount: transaction.amount,
        recurrence: 'monthly',
        nextPaymentDate: nextDate.toISOString().split('T')[0],
        status: 'active',
        source: 'manual',
        notes: `Created manually from transaction on ${transaction.date}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Save subscription
      await subscriptionsStore.save(newSubscription)
      
      // Mark the transaction as converted to subscription
      const updatedTransaction = {
        ...transaction,
        subscriptionId: newSubscription.id,
        categoryId: categoryId
      }
      await transactionsStore.updateTransaction(updatedTransaction)
      
      console.log('✅ Subscription created successfully:', newSubscription.merchantName)
      return newSubscription
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to create subscription'
      error.value = errorMessage
      console.error('❌ Failed to create subscription:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    createSubscriptionFromTransaction
  }
}

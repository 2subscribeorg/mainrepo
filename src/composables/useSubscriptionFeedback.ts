import { ref } from 'vue'
import type { SubscriptionFeedback, Category } from '@/domain/models'
import { useAuth } from './useAuth'
import { getFirebaseAuthToken } from '@/utils/authHelpers'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useCategoriesStore } from '@/stores/categories'

interface RecordFeedbackParams {
  transactionId: string
  merchantName: string
  amount: {
    amount: number
    currency: 'GBP' | 'EUR' | 'USD'
  }
  date: string
  userAction: 'confirmed' | 'rejected'
  detectionConfidence?: number
  detectionMethod?: 'rule_based' | 'ml_model' | 'pattern_matching'
  suggestedCategoryId?: string
  actualCategoryId?: string
}

export function useSubscriptionFeedback() {
  const { user } = useAuth()
  const subscriptionsStore = useSubscriptionsStore()
  const transactionsStore = useTransactionsDataStore()
  const categoriesStore = useCategoriesStore()
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  const API_BASE = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3002'
  
  // Category selection modal state
  const showCategoryModal = ref(false)
  const pendingSubscriptionData = ref<any>(null)

  async function getAuthToken(): Promise<string> {
    try {
      return await getFirebaseAuthToken()
    } catch (err) {
      console.error('Authentication error:', err)
      throw new Error('Authentication failed. Please sign in again.')
    }
  }

  async function recordFeedback(params: RecordFeedbackParams): Promise<SubscriptionFeedback | null> {
    loading.value = true
    error.value = null

    try {
      const token = await getAuthToken()
      
      const response = await fetch(`${API_BASE}/api/feedback/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to record feedback')
      }

      const result = await response.json()
      console.log(`✅ Feedback recorded: ${params.userAction} for ${params.merchantName}`)
      return result.data
    } catch (err: any) {
      error.value = err.message
      console.error('Error recording feedback:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function confirmSubscription(params: Omit<RecordFeedbackParams, 'userAction'>): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      // 1. First, record the feedback for ML improvement
      const feedbackSuccess = await recordFeedback({
        ...params,
        userAction: 'confirmed',
        detectionMethod: params.detectionMethod || 'pattern_matching',
      })

      if (!feedbackSuccess) {
        console.error('❌ Feedback recording failed, but continuing with subscription creation')
        // Don't throw error here - continue with subscription creation even if feedback fails
      }

      // 2. Store subscription data and show category selection modal
      pendingSubscriptionData.value = {
        ...params,
        feedbackRecorded: !!feedbackSuccess
      }
      
      showCategoryModal.value = true
      return true // Return true to indicate the process has started

    } catch (err: any) {
      error.value = err.message
      console.error('Error confirming subscription:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function handleCategorySelection(categoryId: string): Promise<boolean> {
    if (!pendingSubscriptionData.value) {
      error.value = 'No pending subscription data'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const params = pendingSubscriptionData.value

      // Create the actual subscription with selected category - following the same pattern as Transactions.vue
      const newSubscription = {
        id: crypto.randomUUID(),
        userId: user.value?.uid || 'unknown',
        merchantName: params.merchantName,
        amount: {
          amount: params.amount.amount,
          currency: params.amount.currency
        },
        recurrence: 'monthly',
        nextPaymentDate: params.date,
        categoryId: categoryId,
        status: 'active',
        source: 'pattern_detection',
        notes: `Created from pattern detection with ${Math.round(params.detectionConfidence * 100)}% confidence`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Use the correct save method
      await subscriptionsStore.save(newSubscription)

      // Update the transaction to link it to the subscription
      // First get the full transaction, then update it
      const existingTransaction = await transactionsStore.getById(params.transactionId)
      if (!existingTransaction) {
        throw new Error('Transaction not found')
      }
      
      const updatedTransaction = {
        ...existingTransaction,
        subscriptionId: newSubscription.id,
        isSubscription: true,
        categoryId: categoryId,
        updatedAt: new Date().toISOString()
      }
      
      await transactionsStore.save(updatedTransaction)

      console.log(`✅ Subscription created and linked: ${params.merchantName}`)
      
      // Clean up
      pendingSubscriptionData.value = null
      showCategoryModal.value = false
      
      return true

    } catch (err: any) {
      error.value = err.message
      console.error('Error creating subscription:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function handleCategoryCreation(categoryData: { name: string; colour: string; icon?: string }): Promise<boolean> {
    if (!pendingSubscriptionData.value) {
      error.value = 'No pending subscription data'
      return false
    }

    loading.value = true
    error.value = null

    try {
      // Create new category first - following the same pattern as useCategoryManagement.ts
      const newCategory = {
        id: crypto.randomUUID(),
        name: categoryData.name.trim(),
        colour: categoryData.colour,
        userId: user.value?.uid || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Only add icon field if it has a value (Firestore doesn't accept undefined)
      if (categoryData.icon) {
        newCategory.icon = categoryData.icon
      }
      
      await categoriesStore.save(newCategory)

      // Then create subscription with the new category
      return await handleCategorySelection(newCategory.id)

    } catch (err: any) {
      error.value = err.message
      console.error('Error creating category and subscription:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  function cancelCategorySelection() {
    pendingSubscriptionData.value = null
    showCategoryModal.value = false
  }

  async function rejectSubscription(params: Omit<RecordFeedbackParams, 'userAction'>): Promise<boolean> {
    const result = await recordFeedback({
      ...params,
      userAction: 'rejected',
      detectionMethod: params.detectionMethod || 'pattern_matching',
    })
    return result !== null
  }

  async function getUserFeedback(limit: number = 100): Promise<SubscriptionFeedback[]> {
    loading.value = true
    error.value = null

    try {
      const token = await getAuthToken()
      
      const response = await fetch(
        `${API_BASE}/api/feedback/user/${user.value?.uid}?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch feedback')
      }

      const result = await response.json()
      return result.data || []
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching feedback:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  async function getFeedbackStats() {
    loading.value = true
    error.value = null

    try {
      const token = await getAuthToken()
      
      const response = await fetch(`${API_BASE}/api/feedback/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch stats')
      }

      const result = await response.json()
      return result.data || {}
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching stats:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    recordFeedback,
    confirmSubscription,
    rejectSubscription,
    getUserFeedback,
    getFeedbackStats,
    // Category selection modal state and handlers
    showCategoryModal,
    pendingSubscriptionData,
    handleCategorySelection,
    handleCategoryCreation,
    cancelCategorySelection,
  }
}
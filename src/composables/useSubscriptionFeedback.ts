import { ref } from 'vue'
import type { SubscriptionFeedback, Category, Subscription } from '@/domain/models'
import { useAuth } from './useAuth'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useCategoriesStore } from '@/stores/categories'
import { FirebaseSubscriptionFeedbackRepo } from '@/data/repo/firebase/FirebaseSubscriptionFeedbackRepo'

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
  const feedbackRepo = new FirebaseSubscriptionFeedbackRepo()
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Category selection modal state
  const showCategoryModal = ref(false)
  const pendingSubscriptionData = ref<any>(null)

  async function recordFeedback(params: RecordFeedbackParams): Promise<SubscriptionFeedback | null> {
    loading.value = true
    error.value = null

    try {
      if (!user.value?.id) {
        throw new Error('User not authenticated')
      }

      const feedback = await feedbackRepo.recordFeedback(
        user.value.id,
        params.transactionId,
        params.merchantName,
        params.amount,
        params.date,
        params.userAction,
        params.detectionConfidence,
        params.detectionMethod
      )

      return feedback
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
      const newSubscription: Subscription = {
        id: crypto.randomUUID(),
        userId: user.value?.id || 'unknown',
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
      const newCategory: Category = {
        id: crypto.randomUUID(),
        name: categoryData.name.trim(),
        colour: categoryData.colour,
        userId: user.value?.id || 'unknown',
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

  async function rejectSubscription(params: Omit<RecordFeedbackParams, 'userAction'>): Promise<string | null> {
    // Optimistically cache the rejection in localStorage to prevent race conditions
    if (user.value?.id) {
      try {
        const cacheKey = `rejected_merchants_${user.value.id}`
        const cached = localStorage.getItem(cacheKey)
        const rejectedMerchants = cached ? JSON.parse(cached) : []
        
        // Add this merchant if not already cached (case-insensitive)
        const merchantLower = params.merchantName.toLowerCase()
        if (!rejectedMerchants.includes(merchantLower)) {
          rejectedMerchants.push(merchantLower)
          localStorage.setItem(cacheKey, JSON.stringify(rejectedMerchants))
        }
      } catch (err) {
        console.warn('Failed to cache rejection locally:', err)
      }
    }

    const result = await recordFeedback({
      ...params,
      userAction: 'rejected',
      detectionMethod: params.detectionMethod || 'pattern_matching',
    })
    return result?.id || null
  }

  async function getUserFeedback(limit: number = 100): Promise<SubscriptionFeedback[]> {
    loading.value = true
    error.value = null

    try {
      if (!user.value?.id) {
        return []
      }

      const dbFeedback = await feedbackRepo.getUserFeedback(user.value.id, limit)
      
      // Merge with locally cached rejections to handle race conditions
      try {
        const cacheKey = `rejected_merchants_${user.value.id}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const cachedMerchants: string[] = JSON.parse(cached)
          const dbMerchants = new Set(dbFeedback.map(f => f.merchantName.toLowerCase()))
          
          // Add synthetic feedback entries for cached merchants not yet in DB
          cachedMerchants.forEach(merchantName => {
            if (!dbMerchants.has(merchantName)) {
              dbFeedback.push({
                id: `cached_${merchantName}`,
                transactionId: 'pending',
                userId: user.value!.id,
                merchantName: merchantName,
                amount: { amount: 0, currency: 'GBP' },
                date: new Date().toISOString(),
                userAction: 'rejected',
                timestamp: new Date().toISOString()
              } as SubscriptionFeedback)
            }
          })
        }
      } catch (err) {
        console.warn('Failed to merge cached rejections:', err)
      }
      
      return dbFeedback
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
      if (!user.value?.id) {
        return { confirmed: 0, rejected: 0, total: 0 }
      }

      const feedback = await feedbackRepo.getUserFeedback(user.value.id, 1000)
      const confirmed = feedback.filter(f => f.userAction === 'confirmed').length
      const rejected = feedback.filter(f => f.userAction === 'rejected').length
      
      return {
        confirmed,
        rejected,
        total: feedback.length
      }
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching stats:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function undoFeedback(feedbackId: string, merchantName?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      // Remove from localStorage cache if merchant name provided
      if (merchantName && user.value?.id) {
        try {
          const cacheKey = `rejected_merchants_${user.value.id}`
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const rejectedMerchants: string[] = JSON.parse(cached)
            const filtered = rejectedMerchants.filter(m => m !== merchantName.toLowerCase())
            localStorage.setItem(cacheKey, JSON.stringify(filtered))
          }
        } catch (err) {
          console.warn('Failed to remove from cache:', err)
        }
      }

      await feedbackRepo.deleteFeedback(feedbackId)
      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error undoing feedback:', err)
      return false
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
    undoFeedback,
    // Category selection modal state and handlers
    showCategoryModal,
    pendingSubscriptionData,
    handleCategorySelection,
    handleCategoryCreation,
    cancelCategorySelection,
  }
}
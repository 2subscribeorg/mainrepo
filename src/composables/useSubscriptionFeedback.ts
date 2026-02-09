import { ref } from 'vue'
import type { SubscriptionFeedback } from '@/domain/models'
import { useAuth } from './useAuth'

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
  const { getIdToken } = useAuth()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  async function recordFeedback(params: RecordFeedbackParams): Promise<SubscriptionFeedback | null> {
    loading.value = true
    error.value = null

    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${API_BASE}/api/feedback/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const errorData = await response.json()
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
    const result = await recordFeedback({
      ...params,
      userAction: 'confirmed',
    })
    return result !== null
  }

  async function rejectSubscription(params: Omit<RecordFeedbackParams, 'userAction'>): Promise<boolean> {
    const result = await recordFeedback({
      ...params,
      userAction: 'rejected',
    })
    return result !== null
  }

  async function getUserFeedback(limit: number = 100): Promise<SubscriptionFeedback[]> {
    loading.value = true
    error.value = null

    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const { user } = useAuth()
      if (!user.value) {
        throw new Error('User not found')
      }

      const response = await fetch(
        `${API_BASE}/api/feedback/user/${user.value.uid}?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch feedback')
      }

      const result = await response.json()
      return result.data
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
      const token = await getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${API_BASE}/api/feedback/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch stats')
      }

      const result = await response.json()
      return result.data
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
  }
}

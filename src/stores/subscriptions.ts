import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Subscription, ID } from '@/domain/models'
import type { SubscriptionFilter } from '@/data/repo/interfaces/ISubscriptionsRepo'
import { repoFactory } from '@/data/repo/RepoFactory'
import { useLoadingStates } from '@/composables/useLoadingStates'
import { notificationScheduler } from '@/services/NotificationScheduler'

export const useSubscriptionsStore = defineStore('subscriptions', () => {
  const subscriptions = ref<Subscription[]>([])
  const error = ref<string | null>(null)
  
  // Consolidated loading states
  const { setLoading, withLoading, isLoading } = useLoadingStates()
  const loading = isLoading('subscriptions')
  
  // Track active subscription
  let unsubscribe: (() => void) | null = null
  let currentFilter: SubscriptionFilter | undefined = undefined
  let initialLoadDone = false

  const repo = repoFactory.getSubscriptionsRepo()

  async function fetchAll(filter?: SubscriptionFilter) {
    return await withLoading('subscriptions', async () => {
      error.value = null
      try {
        subscriptions.value = await repo.list(filter)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to fetch subscriptions'
        throw e
      }
    })
  }

  async function getById(id: ID): Promise<Subscription | null> {
    const cached = subscriptions.value.find((s) => s.id === id)
    if (cached) return cached

    return await withLoading('subscriptions', async () => {
      try {
        return await repo.get(id)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to fetch subscription'
        return null
      }
    })
  }

  async function save(subscription: Subscription) {
    return await withLoading('subscriptions', async () => {
      error.value = null
      try {
        await repo.upsert(subscription)
        if (!unsubscribe) {
          await fetchAll(currentFilter)
        }
        notificationScheduler.scheduleRenewalReminder(subscription)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to save subscription'
        throw e
      }
    })
  }

  async function cancel(id: ID) {
    return await withLoading('subscriptions', async () => {
      error.value = null
      try {
        const result = await repo.cancel(id)
        if (!unsubscribe) {
          await fetchAll(currentFilter)
        }
        notificationScheduler.cancelRenewalReminder(id)
        return result
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to cancel subscription'
        throw e
      }
    })
  }

  async function remove(id: ID) {
    return await withLoading('subscriptions', async () => {
      error.value = null
      try {
        await repo.delete(id)
        if (!unsubscribe) {
          subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
        }
        notificationScheduler.cancelRenewalReminder(id)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to delete subscription'
        throw e
      }
    })
  }

  // ============================================================================
  // Phase 2 Ready: Observable Pattern
  // ============================================================================

  /**
   * Start listening to data changes (Phase 2 ready)
   * Works with both mock repos (manual updates) and Firebase (real-time)
   */
  function startListening(filter?: SubscriptionFilter) {
    // Clean up existing subscription
    if (unsubscribe) {
      unsubscribe()
    }

    currentFilter = filter
    initialLoadDone = false
    setLoading('subscriptions', true)
    error.value = null

    unsubscribe = repo.subscribe((data) => {
      subscriptions.value = data
      setLoading('subscriptions', false)
      if (!initialLoadDone) {
        initialLoadDone = true
        notificationScheduler.rescheduleAll(data, [])
      }
    }, filter)
  }

  /**
   * Stop listening to data changes
   */
  function stopListening() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    currentFilter = undefined
    initialLoadDone = false
  }

  /**
   * Check if store is using real-time updates
   */
  function isRealtime(): boolean {
    return repo.supportsRealtime
  }

  return {
    subscriptions,
    loading,
    error,
    fetchAll,
    getById,
    save,
    cancel,
    remove,
    startListening,
    stopListening,
    isRealtime,
  }
})

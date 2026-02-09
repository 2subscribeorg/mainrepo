import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Subscription, ID } from '@/domain/models'
import type { SubscriptionFilter } from '@/data/repo/interfaces/ISubscriptionsRepo'
import { repoFactory } from '@/data/repo/RepoFactory'

export const useSubscriptionsStore = defineStore('subscriptions', () => {
  const subscriptions = ref<Subscription[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Track active subscription
  let unsubscribe: (() => void) | null = null
  let currentFilter: SubscriptionFilter | undefined = undefined

  const repo = repoFactory.getSubscriptionsRepo()

  async function fetchAll(filter?: SubscriptionFilter) {
    loading.value = true
    error.value = null
    try {
      subscriptions.value = await repo.list(filter)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch subscriptions'
    } finally {
      loading.value = false
    }
  }

  async function getById(id: ID): Promise<Subscription | null> {
    const cached = subscriptions.value.find((s) => s.id === id)
    if (cached) return cached

    loading.value = true
    try {
      return await repo.get(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch subscription'
      return null
    } finally {
      loading.value = false
    }
  }

  async function save(subscription: Subscription) {
    loading.value = true
    error.value = null
    try {
      await repo.upsert(subscription)
      // If not using real-time subscription, manually refetch
      if (!unsubscribe) {
        await fetchAll(currentFilter)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save subscription'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function cancel(id: ID) {
    loading.value = true
    error.value = null
    try {
      const result = await repo.cancel(id)
      // If not using real-time subscription, manually refetch
      if (!unsubscribe) {
        await fetchAll(currentFilter)
      }
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to cancel subscription'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(id: ID) {
    loading.value = true
    error.value = null
    try {
      await repo.delete(id)
      // If not using real-time subscription, manually update
      if (!unsubscribe) {
        subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete subscription'
      throw e
    } finally {
      loading.value = false
    }
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
    loading.value = true
    error.value = null

    // Subscribe to changes
    unsubscribe = repo.subscribe((data) => {
      subscriptions.value = data
      loading.value = false
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
    // Old API (still works, backward compatible)
    fetchAll,
    getById,
    save,
    cancel,
    remove,
    // New API (Phase 2 ready)
    startListening,
    stopListening,
    isRealtime,
  }
})

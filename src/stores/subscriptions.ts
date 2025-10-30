import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Subscription, ID } from '@/domain/models'
import type { SubscriptionFilter } from '@/data/repo/interfaces/ISubscriptionsRepo'
import { repoFactory } from '@/data/repo/RepoFactory'

export const useSubscriptionsStore = defineStore('subscriptions', () => {
  const subscriptions = ref<Subscription[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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
      await fetchAll()
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
      await fetchAll()
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
      subscriptions.value = subscriptions.value.filter((s) => s.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete subscription'
      throw e
    } finally {
      loading.value = false
    }
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
  }
})

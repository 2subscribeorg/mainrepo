import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MerchantCategoryRule, ID } from '@/domain/models'
import { repoFactory } from '@/data/repo/RepoFactory'
import { useLoadingStates } from '@/composables/useLoadingStates'

export const useAdminStore = defineStore('admin', () => {
  const merchantRules = ref<MerchantCategoryRule[]>([])
  const error = ref<string | null>(null)
  
  // Consolidated loading states
  const { setLoading, withLoading, isLoading } = useLoadingStates()
  const loading = isLoading('admin')
  
  let unsubscribe: (() => void) | null = null

  const repo = repoFactory.getMerchantRulesRepo()

  const merchantRulesById = computed(() => {
    return new Map(merchantRules.value.map((r) => [r.id, r]))
  })

  async function fetchRules() {
    return await withLoading('admin', async () => {
      error.value = null
      try {
        merchantRules.value = await repo.list()
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to fetch merchant rules'
        throw e
      }
    })
  }

  async function getRule(id: ID): Promise<MerchantCategoryRule | null> {
    const cached = merchantRulesById.value.get(id)
    if (cached) return cached

    try {
      return await repo.get(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch merchant rule'
      return null
    }
  }

  async function saveRule(rule: MerchantCategoryRule) {
    return await withLoading('admin', async () => {
      error.value = null
      try {
        await repo.upsert(rule)
        
        // Update local state if not using real-time subscription
        if (!unsubscribe) {
          const existingIndex = merchantRules.value.findIndex((r) => r.id === rule.id)
          if (existingIndex >= 0) {
            merchantRules.value[existingIndex] = rule
          } else {
            merchantRules.value.push(rule)
          }
        }
        
        if (!unsubscribe) {
          await fetchRules()
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to save rule'
        throw e
      }
    })
  }

  async function deleteRule(id: ID) {
    return await withLoading('admin', async () => {
      error.value = null
      try {
        await repo.remove(id)
        if (!unsubscribe) {
          merchantRules.value = merchantRules.value.filter((r) => r.id !== id)
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to delete rule'
        throw e
      }
    })
  }

  function startListening() {
    if (unsubscribe) unsubscribe()
    
    setLoading('admin', true)
    error.value = null
    
    unsubscribe = repo.subscribe((data) => {
      merchantRules.value = data
      setLoading('admin', false)
    })
  }

  function stopListening() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  function isRealtime(): boolean {
    return repo.supportsRealtime
  }

  return {
    merchantRules,
    merchantRulesById,
    loading,
    error,
    fetchRules,
    getRule,
    saveRule,
    deleteRule,
    startListening,
    stopListening,
    isRealtime,
  }
})

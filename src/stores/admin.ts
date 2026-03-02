import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MerchantCategoryRule, ID } from '@/domain/models'
import { repoFactory } from '@/data/repo/RepoFactory'

export const useAdminStore = defineStore('admin', () => {
  const merchantRules = ref<MerchantCategoryRule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  let unsubscribe: (() => void) | null = null

  const repo = repoFactory.getMerchantRulesRepo()

  const merchantRulesById = computed(() => {
    return new Map(merchantRules.value.map((r) => [r.id, r]))
  })

  async function fetchRules() {
    loading.value = true
    error.value = null
    try {
      merchantRules.value = await repo.list()
      console.log('📋 Merchant rules fetched:', merchantRules.value.length, 'rules')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch merchant rules'
      console.error('❌ Failed to fetch merchant rules:', e)
    } finally {
      loading.value = false
    }
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
    loading.value = true
    error.value = null
    try {
      console.log('💾 Saving merchant rule:', rule.merchantPattern, rule.id)
      await repo.upsert(rule)
      console.log('✅ Merchant rule saved successfully')
      
      const existingIndex = merchantRules.value.findIndex(r => r.id === rule.id)
      if (existingIndex >= 0) {
        merchantRules.value[existingIndex] = rule
      } else {
        merchantRules.value.push(rule)
      }
      
      if (!unsubscribe) {
        console.log('🔄 Refetching merchant rules list...')
        await fetchRules()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save merchant rule'
      console.error('❌ Failed to save merchant rule:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteRule(id: ID) {
    loading.value = true
    error.value = null
    try {
      await repo.remove(id)
      if (!unsubscribe) {
        merchantRules.value = merchantRules.value.filter((r) => r.id !== id)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete merchant rule'
      throw e
    } finally {
      loading.value = false
    }
  }

  function startListening() {
    if (unsubscribe) unsubscribe()
    
    loading.value = true
    error.value = null
    
    unsubscribe = repo.subscribe((data) => {
      merchantRules.value = data
      loading.value = false
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

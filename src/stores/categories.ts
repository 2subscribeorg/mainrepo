import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category, ID } from '@/domain/models'
import { repoFactory } from '@/data/repo/RepoFactory'
import { categorisationService } from '@/domain/services/CategorisationService'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Phase 2 ready - track subscription
  let unsubscribe: (() => void) | null = null

  const repo = repoFactory.getCategoriesRepo()

  const categoriesById = computed(() => {
    return new Map(categories.value.map((c) => [c.id, c]))
  })

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      categories.value = await repo.list()
      console.log('📋 Categories fetched:', categories.value.length, 'categories')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch categories'
      console.error('❌ Failed to fetch categories:', e)
    } finally {
      loading.value = false
    }
  }

  async function getById(id: ID): Promise<Category | null> {
    const cached = categoriesById.value.get(id)
    if (cached) return cached

    try {
      return await repo.get(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch category'
      return null
    }
  }

  async function save(category: Category) {
    loading.value = true
    error.value = null
    try {
      console.log('💾 Saving category:', category.name, category.id)
      await repo.upsert(category)
      console.log('✅ Category saved successfully')
      
      // Always update local state immediately for new categories
      const existingIndex = categories.value.findIndex(c => c.id === category.id)
      if (existingIndex >= 0) {
        categories.value[existingIndex] = category
      } else {
        categories.value.push(category)
      }
      
      // If not using real-time subscription, manually refetch
      if (!unsubscribe) {
        console.log('🔄 Refetching categories list...')
        await fetchAll()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save category'
      console.error('❌ Failed to save category:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function remove(id: ID) {
    loading.value = true
    error.value = null
    try {
      await repo.remove(id)
      // If not using real-time subscription, manually update
      if (!unsubscribe) {
        categories.value = categories.value.filter((c) => c.id !== id)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete category'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function overrideTransactionCategory(transactionId: ID, categoryId: ID) {
    loading.value = true
    error.value = null
    try {
      await categorisationService.overrideTransactionCategory(transactionId, categoryId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to override category'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Phase 2 ready - Observable pattern
  function startListening() {
    if (unsubscribe) unsubscribe()
    
    loading.value = true
    error.value = null
    
    unsubscribe = repo.subscribe((data) => {
      categories.value = data
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
    categories,
    categoriesById,
    loading,
    error,
    // Old API (backward compatible)
    fetchAll,
    getById,
    save,
    remove,
    overrideTransactionCategory,
    // New API (Phase 2 ready)
    startListening,
    stopListening,
    isRealtime,
  }
})

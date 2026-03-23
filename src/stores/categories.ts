import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category, ID } from '@/domain/models'
import { repoFactory } from '@/data/repo/RepoFactory'
import { useLoadingStates } from '@/composables/useLoadingStates'
import { categorisationService } from '@/domain/services/CategorisationService'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const error = ref<string | null>(null)
  
  // Consolidated loading states
  const { setLoading, withLoading, isLoading } = useLoadingStates()
  const loading = isLoading('categories')
  
  // Phase 2 ready - track subscription
  let unsubscribe: (() => void) | null = null

  const repo = repoFactory.getCategoriesRepo()

  const categoriesById = computed(() => {
    return new Map(categories.value.map((c) => [c.id, c]))
  })

  async function fetchAll() {
    return await withLoading('categories', async () => {
      error.value = null
      try {
        categories.value = await repo.list()
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to fetch categories'
        throw e
      }
    })
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
    return await withLoading('categories', async () => {
      error.value = null
      try {
        await repo.upsert(category)
        
        // Update local state if not using real-time subscription
        if (!unsubscribe) {
          const existingIndex = categories.value.findIndex((c) => c.id === category.id)
          if (existingIndex >= 0) {
            categories.value[existingIndex] = category
          } else {
            categories.value.push(category)
          }
        }
        
        // If not using real-time subscription, manually refetch
        if (!unsubscribe) {
          await fetchAll()
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to save category'
        throw e
      }
    })
  }

  async function remove(id: ID) {
    return await withLoading('categories', async () => {
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
      }
    })
  }

  async function overrideTransactionCategory(transactionId: ID, categoryId: ID) {
    return await withLoading('categories', async () => {
      error.value = null
      try {
        await categorisationService.overrideTransactionCategory(transactionId, categoryId)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to override category'
        throw e
      }
    })
  }

  // Phase 2 ready - Observable pattern
  function startListening() {
    if (unsubscribe) unsubscribe()
    
    setLoading('categories', true)
    error.value = null
    
    unsubscribe = repo.subscribe((data) => {
      categories.value = data
      setLoading('categories', false)
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

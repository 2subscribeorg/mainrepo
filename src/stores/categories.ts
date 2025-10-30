import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category, ID } from '@/domain/models'
import { repoFactory } from '@/data/repo/RepoFactory'
import { categorisationService } from '@/domain/services/CategorisationService'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const repo = repoFactory.getCategoriesRepo()

  const categoriesById = computed(() => {
    return new Map(categories.value.map((c) => [c.id, c]))
  })

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      categories.value = await repo.list()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch categories'
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
      await repo.upsert(category)
      await fetchAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save category'
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
      categories.value = categories.value.filter((c) => c.id !== id)
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

  return {
    categories,
    categoriesById,
    loading,
    error,
    fetchAll,
    getById,
    save,
    remove,
    overrideTransactionCategory,
  }
})

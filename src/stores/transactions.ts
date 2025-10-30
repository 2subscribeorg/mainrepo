import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Transaction, ID } from '@/domain/models'
import type { TransactionFilter } from '@/data/repo/interfaces/ITransactionsRepo'
import { repoFactory } from '@/data/repo/RepoFactory'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const repo = repoFactory.getTransactionsRepo()

  async function fetchAll(filter?: TransactionFilter) {
    loading.value = true
    error.value = null
    try {
      transactions.value = await repo.list(filter)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch transactions'
    } finally {
      loading.value = false
    }
  }

  async function getById(id: ID): Promise<Transaction | null> {
    const cached = transactions.value.find((t) => t.id === id)
    if (cached) return cached

    try {
      return await repo.get(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch transaction'
      return null
    }
  }

  async function save(transaction: Transaction) {
    loading.value = true
    error.value = null
    try {
      await repo.upsert(transaction)
      await fetchAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save transaction'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function seed(count = 150) {
    loading.value = true
    error.value = null
    try {
      await repo.seed(count)
      await fetchAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to seed transactions'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function clear() {
    loading.value = true
    error.value = null
    try {
      await repo.clear()
      transactions.value = []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to clear transactions'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    transactions,
    loading,
    error,
    fetchAll,
    getById,
    save,
    seed,
    clear,
  }
})

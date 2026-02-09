import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Transaction, ID } from '@/domain/models'
import type { TransactionFilter } from '@/data/repo/interfaces/ITransactionsRepo'
import { repoFactory } from '@/data/repo/RepoFactory'

/**
 * Data layer - Persistence only
 * Single Responsibility: CRUD operations and data persistence
 */
export const useTransactionsDataStore = defineStore('transactionsData', () => {
  // Data state
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Real-time subscription
  let unsubscribe: (() => void) | null = null
  let currentFilter: TransactionFilter | undefined = undefined

  const repo = repoFactory.getTransactionsRepo()

  // CRUD operations
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
      console.log('✅ Transaction saved successfully')
      
      // If not using real-time subscription, manually update
      if (!unsubscribe) {
        const existingIndex = transactions.value.findIndex(t => t.id === transaction.id)
        if (existingIndex >= 0) {
          transactions.value[existingIndex] = transaction
        } else {
          transactions.value.push(transaction)
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save transaction'
      console.error('❌ Failed to save transaction:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateTransaction(transaction: Transaction) {
    loading.value = true
    error.value = null
    try {
      await repo.upsert(transaction)
      console.log('✅ Transaction updated successfully')
      
      // If not using real-time subscription, manually update
      if (!unsubscribe) {
        const existingIndex = transactions.value.findIndex(t => t.id === transaction.id)
        if (existingIndex >= 0) {
          transactions.value[existingIndex] = transaction
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update transaction'
      console.error('❌ Failed to update transaction:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function seed() {
    loading.value = true
    error.value = null
    try {
      await repo.seed()
      // If not using real-time subscription, manually refetch
      if (!unsubscribe) {
        await fetchAll()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to seed transactions'
      console.error('❌ Failed to seed transactions:', e)
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
      // If not using real-time subscription, manually update
      if (!unsubscribe) {
        transactions.value = []
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to clear transactions'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Real-time features
  function startListening(filter?: TransactionFilter) {
    if (unsubscribe) unsubscribe()
    
    currentFilter = filter
    loading.value = true
    error.value = null
    
    unsubscribe = repo.subscribe((data) => {
      transactions.value = data
      loading.value = false
    }, filter)
  }

  function stopListening() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    currentFilter = undefined
  }

  function isRealtime(): boolean {
    return repo.supportsRealtime
  }

  // Alias for consistency with other stores
  const fetchTransactions = fetchAll

  return {
    // Data state
    transactions,
    loading,
    error,
    
    // CRUD operations
    fetchAll,
    fetchTransactions,
    getById,
    save,
    updateTransaction,
    seed,
    clear,
    
    // Real-time features
    startListening,
    stopListening,
    isRealtime,
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Transaction, ID } from '@/domain/models'
import type { TransactionFilter } from '@/data/repo/interfaces/ITransactionsRepo'
import { repoFactory } from '@/data/repo/RepoFactory'
import { useLoadingStates } from '@/composables/useLoadingStates'

/**
 * Data layer - Persistence only
 * Single Responsibility: CRUD operations and data persistence
 */
export const useTransactionsDataStore = defineStore('transactionsData', () => {
  // Data state
  const transactions = ref<Transaction[]>([])
  const error = ref<string | null>(null)
  
  // Consolidated loading states
  const { setLoading, withLoading, isLoading } = useLoadingStates()
  const loading = isLoading('transactionsData')
  
  // Real-time subscription
  let unsubscribe: (() => void) | null = null
  let currentFilter: TransactionFilter | undefined = undefined
  
  // Concurrency control for manual updates
  const pendingUpdates = new Map<string, Promise<void>>()
  const lastUpdateTimestamps = new Map<string, number>()

  const repo = repoFactory.getTransactionsRepo()

  // CRUD operations
  async function fetchAll(filter?: TransactionFilter) {
    return await withLoading('transactionsData', async () => {
      error.value = null
      try {
        transactions.value = await repo.list(filter)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to fetch transactions'
        throw e
      }
    })
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
    return await withLoading('transactionsData', async () => {
      error.value = null
      
      // Check for concurrent updates to the same transaction
      const existingUpdate = pendingUpdates.get(transaction.id)
      if (existingUpdate) {
        // Wait for existing update to complete before proceeding
        await existingUpdate
      }
      
      // Create a promise for this update to prevent concurrent modifications
      const updatePromise = (async () => {
        try {
          await repo.upsert(transaction)
          
          // If not using real-time subscription, manually update with conflict resolution
          if (!unsubscribe) {
            updateLocalState(transaction)
          }
        } finally {
          // Clean up the pending update
          pendingUpdates.delete(transaction.id)
        }
      })()
      
      // Track this update
      pendingUpdates.set(transaction.id, updatePromise)
      
      try {
        await updatePromise
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to save transaction'
        throw e
      }
    })
  }

  async function updateTransaction(transaction: Transaction) {
    return await withLoading('transactionsData', async () => {
      error.value = null
      
      // Check for concurrent updates to the same transaction
      const existingUpdate = pendingUpdates.get(transaction.id)
      if (existingUpdate) {
        // Wait for existing update to complete before proceeding
        await existingUpdate
      }
      
      // Create a promise for this update to prevent concurrent modifications
      const updatePromise = (async () => {
        try {
          await repo.upsert(transaction)
          
          // If not using real-time subscription, manually update with conflict resolution
          if (!unsubscribe) {
            updateLocalState(transaction)
          }
        } finally {
          // Clean up the pending update
          pendingUpdates.delete(transaction.id)
        }
      })()
      
      // Track this update
      pendingUpdates.set(transaction.id, updatePromise)
      
      try {
        await updatePromise
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to update transaction'
        throw e
      }
    })
  }

  async function seed() {
    return await withLoading('transactionsData', async () => {
      error.value = null
      try {
        await repo.seed()
        // If not using real-time subscription, manually refetch
        if (!unsubscribe) {
          await fetchAll()
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to seed transactions'
        throw e
      }
    })
  }

  async function clear() {
    return await withLoading('transactionsData', async () => {
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
      }
    })
  }

  // Real-time features
  function startListening(filter?: TransactionFilter) {
    if (unsubscribe) unsubscribe()
    
    currentFilter = filter
    setLoading('transactionsData', true)
    error.value = null
    
    unsubscribe = repo.subscribe((data) => {
      transactions.value = data
      setLoading('transactionsData', false)
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
  
  /**
   * Safely update local state with conflict resolution
   * Uses timestamps to prevent stale updates from overwriting newer data
   */
  function updateLocalState(transaction: Transaction) {
    const now = Date.now()
    const lastUpdate = lastUpdateTimestamps.get(transaction.id) || 0
    
    // Only update if this is a newer update (prevents stale overwrites)
    if (now >= lastUpdate) {
      const existingIndex = transactions.value.findIndex(t => t.id === transaction.id)
      if (existingIndex >= 0) {
        // Additional conflict check: compare updatedAt timestamps if available
        const existing = transactions.value[existingIndex]
        const existingUpdatedAt = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0
        const newUpdatedAt = transaction.updatedAt ? new Date(transaction.updatedAt).getTime() : now
        
        // Only update if the new transaction is actually newer
        if (newUpdatedAt >= existingUpdatedAt) {
          transactions.value[existingIndex] = transaction
          lastUpdateTimestamps.set(transaction.id, now)
        }
      } else {
        transactions.value.push(transaction)
        lastUpdateTimestamps.set(transaction.id, now)
      }
    }
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

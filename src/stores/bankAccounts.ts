import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ID, BankConnection, BankAccount } from '@/domain/models'
import { repoFactory } from '@/data/repo/RepoFactory'
import { useLoadingStates } from '@/composables/useLoadingStates'

export const useBankAccountsStore = defineStore('bankAccounts', () => {
  const connections = ref<BankConnection[]>([])
  const error = ref<string | null>(null)
  const connectingBank = ref(false)
  
  // Consolidated loading states
  const { setLoading, withLoading, isLoading } = useLoadingStates()
  const loading = isLoading('bankAccounts')

  const repo = repoFactory.getBankAccountsRepo()

  async function fetchConnections() {
    return await withLoading('bankAccounts', async () => {
      error.value = null
      try {
        connections.value = await repo.listConnections()
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to fetch bank connections'
        throw e
      }
    })
  }

  async function connectBank(): Promise<{ linkToken: string }> {
    return await withLoading('bankAccounts', async () => {
      connectingBank.value = true
      error.value = null
      try {
        const { linkToken } = await repo.initializeConnection()
        return { linkToken }
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to initialize bank connection'
        throw e
      } finally {
        connectingBank.value = false
      }
    })
  }

  async function completeConnection(publicToken: string) {
    return await withLoading('bankAccounts', async () => {
      error.value = null
      try {
        const connection = await repo.completeConnection(publicToken)
        connections.value.push(connection)
        return connection
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to complete bank connection'
        throw e
      }
    })
  }

  async function disconnectBank(connectionId: ID) {
    const connection = connections.value.find(c => c.id === connectionId)
    if (!connection) {
      throw new Error('Connection not found')
    }
    
    if (!confirm(`Disconnect from ${connection.institutionName}? This will remove all linked accounts.`)) {
      return
    }

    return await withLoading('bankAccounts', async () => {
      error.value = null
      try {
        await repo.disconnect(connectionId)
        connections.value = connections.value.filter(c => c.id !== connectionId)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to disconnect bank'
        throw e
      }
    })
  }

  async function syncTransactions(connectionId: ID) {
    return await withLoading('bankAccounts', async () => {
      error.value = null
      try {
        await repo.syncTransactions(connectionId)
        
        // Show success message
        const connection = connections.value.find(c => c.id === connectionId)
        const institutionName = connection?.institutionName || 'Unknown Bank'
        
        // Optionally refresh connections to get updated sync status
        await fetchConnections()
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to sync transactions'
        throw e
      }
    })
  }

  async function getAllAccounts(): Promise<BankAccount[]> {
    try {
      // Return accounts only from active connections (not disconnected)
      // Use the accounts embedded in connections rather than repo.listAccounts()
      // to ensure we only show accounts from active connections
      const activeAccounts: BankAccount[] = []
      
      connections.value
        .filter(c => c.status !== 'disconnected')
        .forEach(connection => {
          if (connection.accounts) {
            activeAccounts.push(...connection.accounts)
          }
        })
      
      return activeAccounts
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch accounts'
      return []
    }
  }

  return {
    connections,
    loading,
    error,
    connectingBank,
    fetchConnections,
    connectBank,
    completeConnection,
    disconnectBank,
    syncTransactions,
    getAllAccounts,
  }
})

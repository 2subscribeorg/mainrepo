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
        console.error('❌ Failed to fetch bank connections:', e)
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
        console.error('❌ Failed to initialize connection:', e)
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
        console.error('❌ Failed to complete connection:', e)
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
        console.log(`✅ Disconnected from ${connection.institutionName}`)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to disconnect bank'
        console.error('❌ Failed to disconnect bank:', e)
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
        console.log(`✅ Synced transactions from ${institutionName}`)
        
        // Optionally refresh connections to get updated sync status
        await fetchConnections()
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Failed to sync transactions'
        console.error('❌ Failed to sync transactions:', e)
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

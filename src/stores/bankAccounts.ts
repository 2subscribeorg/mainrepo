import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ID, BankConnection, BankAccount } from '@/domain/models'
import { repoFactory } from '@/data/repo/RepoFactory'

export const useBankAccountsStore = defineStore('bankAccounts', () => {
  const connections = ref<BankConnection[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const connectingBank = ref(false)

  const repo = repoFactory.getBankAccountsRepo()

  async function fetchConnections() {
    loading.value = true
    error.value = null
    try {
      connections.value = await repo.listConnections()
      console.log('🏦 Bank connections fetched:', connections.value.length)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch bank connections'
      console.error('❌ Failed to fetch bank connections:', e)
    } finally {
      loading.value = false
    }
  }

  async function connectBank(): Promise<{ linkToken: string }> {
    connectingBank.value = true
    error.value = null
    try {
      console.log('🔗 Initializing bank connection...')
      const { linkToken } = await repo.initializeConnection()
      return { linkToken }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to initialize bank connection'
      console.error('❌ Failed to initialize connection:', e)
      throw e
    } finally {
      connectingBank.value = false
    }
  }

  async function completeConnection(publicToken: string) {
    loading.value = true
    error.value = null
    try {
      console.log('✅ Completing bank connection...')
      const connection = await repo.completeConnection(publicToken)
      connections.value.push(connection)
      console.log('🎉 Bank connected:', connection.institutionName)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to complete bank connection'
      console.error('❌ Failed to complete connection:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function disconnectBank(connectionId: ID) {
    loading.value = true
    error.value = null
    try {
      const connection = connections.value.find(c => c.id === connectionId)
      if (!connection) {
        throw new Error('Connection not found')
      }
      
      if (!confirm(`Disconnect from ${connection.institutionName}? This will remove all linked accounts.`)) {
        loading.value = false
        return
      }

      console.log('🔌 Disconnecting bank:', connection.institutionName)
      await repo.disconnect(connectionId)
      connections.value = connections.value.filter(c => c.id !== connectionId)
      console.log('✅ Bank disconnected')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to disconnect bank'
      console.error('❌ Failed to disconnect bank:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function syncTransactions(connectionId: ID) {
    loading.value = true
    error.value = null
    try {
      console.log('🔄 Syncing transactions...')
      await repo.syncTransactions(connectionId)
      
      // Update lastSynced timestamp
      const connection = connections.value.find(c => c.id === connectionId)
      if (connection) {
        connection.lastSynced = new Date().toISOString()
      }
      
      console.log('✅ Transactions synced')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to sync transactions'
      console.error('❌ Failed to sync transactions:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getAllAccounts(): Promise<BankAccount[]> {
    try {
      return await repo.listAccounts()
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

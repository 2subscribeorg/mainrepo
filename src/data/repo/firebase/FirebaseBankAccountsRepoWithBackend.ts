import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore'
import type { ID, BankConnection, BankAccount } from '@/domain/models'
import type { IBankAccountsRepo } from '../interfaces/IBankAccountsRepo'
import { PlaidBackendService } from '@/services/plaid/PlaidBackendService'
import { PlaidTokenService } from '@/services/plaid/PlaidTokenService'
import { getFirebaseDb } from '@/config/firebase'

/**
 * Firebase implementation with backend API
 * Uses PlaidBackendService which calls localhost:3001
 * 
 * ✅ Ready to use! Just needs backend running.
 */
export class FirebaseBankAccountsRepoWithBackend implements IBankAccountsRepo {
  private backend = new PlaidBackendService()
  private tokens = new PlaidTokenService()

  /**
   * List all bank connections for current user
   */
  async listConnections(): Promise<BankConnection[]> {
    try {
      const userId = this.tokens.getCurrentUserId()
      const db = getFirebaseDb()
      
      const connectionsQuery = query(
        collection(db, 'bankConnections'),
        where('userId', '==', userId)
      )
      
      const snapshot = await getDocs(connectionsQuery)
      const connections = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as BankConnection[]
      
      console.log(`✅ Fetched ${connections.length} bank connections`)
      return connections
    } catch (error) {
      console.error('❌ Failed to list connections:', error)
      throw new Error('Failed to fetch bank connections')
    }
  }

  /**
   * Get a specific connection
   */
  async getConnection(id: ID): Promise<BankConnection | null> {
    try {
      const userId = this.tokens.getCurrentUserId()
      const db = getFirebaseDb()
      
      const connectionRef = doc(db, 'bankConnections', id)
      const connectionDoc = await getDoc(connectionRef)
      
      if (!connectionDoc.exists()) {
        return null
      }
      
      const connection = { ...connectionDoc.data(), id: connectionDoc.id } as BankConnection
      
      // Verify ownership
      if (connection.userId !== userId) {
        console.warn('⚠️ Attempted to access connection from different user')
        return null
      }
      
      return connection
    } catch (error) {
      console.error('❌ Failed to get connection:', error)
      return null
    }
  }

  /**
   * Initialize a new bank connection (get link token from backend)
   */
  async initializeConnection(): Promise<{ linkToken: string }> {
    try {
      console.log('📝 Initializing connection via backend...')
      const userId = this.tokens.getCurrentUserId()
      
      const linkToken = await this.backend.createLinkToken(userId)
      
      console.log('✅ Link token created via backend')
      return { linkToken }
    } catch (error) {
      console.error('❌ Failed to initialize connection:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to initialize bank connection: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Complete connection after user authenticates with Plaid Link
   * Backend handles: token exchange, fetching accounts, storing everything
   */
  async completeConnection(publicToken: string): Promise<BankConnection> {
    try {
      const userId = this.tokens.getCurrentUserId()
      const db = getFirebaseDb()
      
      console.log('🔄 Completing connection via backend...')
      
      // Backend does all the heavy lifting
      const { itemId } = await this.backend.exchangePublicToken(publicToken, userId)
      
      // Fetch the connection that backend created
      const connectionRef = doc(db, 'bankConnections', itemId)
      const connectionDoc = await getDoc(connectionRef)
      
      if (!connectionDoc.exists()) {
        throw new Error('Backend created connection but not found in Firestore')
      }
      
      const connection = { ...connectionDoc.data(), id: connectionDoc.id } as BankConnection
      
      console.log(`✅ Connection completed: ${connection.institutionName}`)
      return connection
    } catch (error) {
      console.error('❌ Failed to complete connection:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to complete bank connection: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Disconnect a bank connection
   */
  async disconnect(connectionId: ID): Promise<void> {
    try {
      const userId = this.tokens.getCurrentUserId()
      
      console.log('🔌 Disconnecting bank via backend...')
      
      // Backend handles Plaid item removal and Firestore cleanup
      await this.backend.disconnectBank(connectionId, userId)
      
      console.log(`✅ Bank connection disconnected: ${connectionId}`)
    } catch (error) {
      console.error('❌ Failed to disconnect bank:', error)
      throw new Error('Failed to disconnect bank')
    }
  }

  /**
   * Sync transactions for a connection
   * Backend handles: fetching from Plaid, transforming, storing
   */
  async syncTransactions(connectionId: ID): Promise<void> {
    try {
      const userId = this.tokens.getCurrentUserId()
      
      console.log('🔄 Syncing transactions via backend...')
      
      // Backend does all the work
      const { count } = await this.backend.syncTransactions(connectionId, userId)
      
      console.log(`✅ Synced ${count} transactions`)
    } catch (error) {
      console.error('❌ Failed to sync transactions:', error)
      throw new Error('Failed to sync transactions')
    }
  }

  /**
   * Get all accounts across all connections
   */
  async listAccounts(): Promise<BankAccount[]> {
    try {
      const userId = this.tokens.getCurrentUserId()
      const db = getFirebaseDb()
      
      const accountsQuery = query(
        collection(db, 'bankAccounts'),
        where('userId', '==', userId)
      )
      
      const snapshot = await getDocs(accountsQuery)
      const accounts = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as BankAccount[]
      
      console.log(`✅ Fetched ${accounts.length} bank accounts`)
      return accounts
    } catch (error) {
      console.error('❌ Failed to list accounts:', error)
      throw new Error('Failed to fetch bank accounts')
    }
  }
}

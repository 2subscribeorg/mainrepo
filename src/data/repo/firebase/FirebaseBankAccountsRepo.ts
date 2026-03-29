import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
} from 'firebase/firestore'
import type { ID, BankConnection, BankAccount } from '@/domain/models'
import { logger } from '@/utils/logger'
import type { IBankAccountsRepo } from '../interfaces/IBankAccountsRepo'
import { PlaidBackendService } from '@/services/plaid/PlaidBackendService'
import { PlaidTokenService } from '@/services/plaid/PlaidTokenService'
import { getFirebaseDb } from '@/config/firebase'

/**
 * Firebase implementation of bank accounts repository
 * Integrates with Plaid for real bank connections and transactions
 * 
 * ⚠️ DEPRECATED: This repo is no longer used in production.
 * Production uses FirebaseBankAccountsRepoWithBackend which calls the backend API.
 */
export class FirebaseBankAccountsRepo implements IBankAccountsRepo {
  private plaid = new PlaidBackendService() // Uses backend API
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
      
      logger.success(`Fetched ${connections.length} bank connections`)
      return connections
    } catch (error) {
      logger.error('❌ Failed to list connections:', error)
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
        logger.warn('⚠️ Attempted to access connection from different user')
        return null
      }
      
      return connection
    } catch (error) {
      logger.error('❌ Failed to get connection:', error)
      return null
    }
  }

  /**
   * Initialize a new bank connection (get link token)
   */
  async initializeConnection(): Promise<{ linkToken: string }> {
    try {
      logger.debug('📝 Getting current user ID...')
      const userId = this.tokens.getCurrentUserId()
      logger.success('User ID:', userId)
      
      logger.debug('🔑 Creating Plaid link token...')
      const linkToken = await this.plaid.createLinkToken(userId)
      
      logger.success('Link token created for user')
      return { linkToken }
    } catch (error) {
      logger.error('❌ Failed to initialize connection:', error)
      // Re-throw the original error with more context
      if (error instanceof Error) {
        throw new Error(`Failed to initialize bank connection: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Complete connection after user authenticates with Plaid Link
   */
  async completeConnection(publicToken: string): Promise<BankConnection> {
    try {
      const userId = this.tokens.getCurrentUserId()
      const db = getFirebaseDb()
      
      // Exchange public token via backend (backend handles all the details)
      const { itemId } = await this.plaid.exchangePublicToken(publicToken, userId)
      
      // Backend has already stored everything, just fetch the connection from Firestore
      const connectionRef = doc(db, 'bankConnections', itemId)
      const connectionDoc = await getDoc(connectionRef)
      
      if (!connectionDoc.exists()) {
        throw new Error('Connection not found after exchange')
      }
      
      const connection = { ...connectionDoc.data(), id: connectionDoc.id } as BankConnection
      return connection
      
    } catch (error) {
      logger.error('❌ Failed to complete connection:', error)
      throw new Error('Failed to complete bank connection')
    }
  }

  /**
   * Disconnect a bank connection
   */
  async disconnect(connectionId: ID): Promise<void> {
    try {
      const userId = this.tokens.getCurrentUserId()
      const db = getFirebaseDb()
      
      // Get access token
      const accessToken = await this.tokens.getAccessToken(userId, connectionId)
      
      if (accessToken) {
        // Remove item from Plaid
        await this.plaid.removeItem(accessToken)
      }
      
      // Delete access token from Firestore
      await this.tokens.deleteAccessToken(userId, connectionId)
      
      // Delete connection from Firestore
      const connectionRef = doc(db, 'bankConnections', connectionId)
      await deleteDoc(connectionRef)
      
      // Note: Not deleting accounts and transactions, just marking connection as disconnected
      // This preserves historical data
      
      logger.success(`Bank connection disconnected: ${connectionId}`)
    } catch (error) {
      logger.error('❌ Failed to disconnect bank:', error)
      throw new Error('Failed to disconnect bank')
    }
  }

  /**
   * Sync transactions for a connection
   */
  async syncTransactions(connectionId: ID): Promise<void> {
    try {
      const userId = this.tokens.getCurrentUserId()
      
      logger.debug(`🔄 Syncing transactions via backend for connection: ${connectionId}`)
      
      // Call backend to sync transactions
      const result = await this.plaid.syncTransactions(connectionId, userId)
      
      logger.success(`Backend synced ${result.count} transactions`)
    } catch (error) {
      logger.error('❌ Failed to sync transactions:', error)
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
      
      logger.success(`Fetched ${accounts.length} bank accounts`)
      return accounts
    } catch (error) {
      logger.error('❌ Failed to list accounts:', error)
      throw new Error('Failed to fetch bank accounts')
    }
  }

}

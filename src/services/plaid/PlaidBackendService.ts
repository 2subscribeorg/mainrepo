/**
 * Plaid Backend Service
 * Calls localhost backend API for Plaid operations
 * 
 * When ready to migrate to Cloud Functions:
 * 1. Replace fetch() calls with Firebase callable functions
 * 2. Keep the same interface
 * 3. No other code changes needed!
 */

import { getAuth } from 'firebase/auth'

const API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api'

export class PlaidBackendService {
  /**
   * Get Firebase authentication token for API calls
   */
  private async getAuthToken(): Promise<string> {
    const auth = getAuth()
    const user = auth.currentUser
    
    if (!user) {
      throw new Error('User not authenticated. Please sign in.')
    }
    
    try {
      return await user.getIdToken()
    } catch (error) {
      console.error('Failed to get auth token:', error)
      throw new Error('Failed to get authentication token')
    }
  }
  /**
   * Create a link token for Plaid Link
   */
  async createLinkToken(userId: string): Promise<string> {
    try {
      console.log('🔑 Calling backend to create link token...')
      const token = await this.getAuthToken()
      
      const response = await fetch(`${API_URL}/plaid/create-link-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create link token')
      }
      
      const data = await response.json()
      console.log('✅ Link token received from backend')
      return data.linkToken
    } catch (error: any) {
      console.error('❌ Backend createLinkToken error:', error)
      throw new Error(`Failed to create link token: ${error.message}`)
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string, userId: string): Promise<{ itemId: string }> {
    try {
      console.log('🔄 Calling backend to exchange token...')
      const token = await this.getAuthToken()
      
      const response = await fetch(`${API_URL}/plaid/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ publicToken, userId }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to exchange token')
      }
      
      const data = await response.json()
      console.log('✅ Token exchanged successfully')
      return { itemId: data.itemId }
    } catch (error: any) {
      console.error('❌ Backend exchangeToken error:', error)
      throw new Error(`Failed to exchange token: ${error.message}`)
    }
  }

  /**
   * Sync transactions for a connection
   */
  async syncTransactions(connectionId: string, userId: string): Promise<{ count: number }> {
    try {
      console.log('🔄 Calling backend to sync transactions...')
      const token = await this.getAuthToken()
      
      const response = await fetch(`${API_URL}/plaid/sync-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ connectionId, userId }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sync transactions')
      }
      
      const data = await response.json()
      console.log(`✅ Synced ${data.transactionCount} transactions`)
      return { count: data.transactionCount }
    } catch (error: any) {
      console.error('❌ Backend syncTransactions error:', error)
      throw new Error(`Failed to sync transactions: ${error.message}`)
    }
  }

  /**
   * Disconnect a bank connection
   */
  async disconnectBank(connectionId: string, userId: string): Promise<void> {
    try {
      console.log('🔌 Calling backend to disconnect bank...')
      const token = await this.getAuthToken()
      
      const response = await fetch(`${API_URL}/plaid/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ connectionId, userId }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to disconnect bank')
      }
      
      console.log('✅ Bank disconnected successfully')
    } catch (error: any) {
      console.error('❌ Backend disconnectBank error:', error)
      throw new Error(`Failed to disconnect bank: ${error.message}`)
    }
  }

  // These methods are handled by the backend - frontend doesn't need direct access
  async getItem(_accessToken: string) {
    throw new Error('getItem should be called from backend, not client')
  }

  async getInstitution(_institutionId: string) {
    throw new Error('getInstitution should be called from backend, not client')
  }

  async getAccounts(_accessToken: string) {
    throw new Error('getAccounts should be called from backend, not client')
  }

  async getTransactions(_accessToken: string, _startDate: string, _endDate: string) {
    throw new Error('getTransactions should be called from backend, not client')
  }

  async removeItem(_accessToken: string) {
    throw new Error('removeItem should be called from backend, not client')
  }
}

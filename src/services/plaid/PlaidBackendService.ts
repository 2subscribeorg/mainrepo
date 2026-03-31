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
import {
  validateUserId,
  validatePublicToken,
  validateConnectionId,
  validateLinkTokenResponse,
  validateExchangeTokenResponse,
  validateSyncTransactionsResponse,
  PlaidValidationError
} from './validation'
import { rateLimiter, RATE_LIMITS } from '@/utils/rateLimiter'

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
      throw new Error('Failed to get authentication token')
    }
  }
  /**
   * Create a link token for Plaid Link
   */
  async createLinkToken(userId: string): Promise<string> {
    try {
      // Client-side rate limiting check
      const rateLimitKey = `plaid:create-link-token:${userId}`
      if (!rateLimiter.check(rateLimitKey, RATE_LIMITS.PLAID_CREATE_LINK.maxAttempts, RATE_LIMITS.PLAID_CREATE_LINK.windowMs)) {
        throw new Error('Too many Plaid requests. Please wait a moment and try again.')
      }
      
      // Validate and sanitize input
      const validatedUserId = validateUserId(userId)
      
      const token = await this.getAuthToken()
      
      const response = await fetch(`${API_URL}/plaid/create-link-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: validatedUserId }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create link token')
      }
      
      const data = await response.json()
      
      // Validate response
      const validatedResponse = validateLinkTokenResponse(data)
      
      return validatedResponse.linkToken
    } catch (error: any) {
      if (error instanceof PlaidValidationError) {
        throw error
      }
      throw new Error(`Failed to create link token: ${error.message}`)
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string, userId: string): Promise<{ itemId: string }> {
    try {
      // Client-side rate limiting check
      const rateLimitKey = `plaid:exchange-token:${userId}`
      if (!rateLimiter.check(rateLimitKey, RATE_LIMITS.PLAID_EXCHANGE_TOKEN.maxAttempts, RATE_LIMITS.PLAID_EXCHANGE_TOKEN.windowMs)) {
        throw new Error('Too many Plaid requests. Please wait a moment and try again.')
      }
      
      // Validate and sanitize inputs
      const validatedPublicToken = validatePublicToken(publicToken)
      const validatedUserId = validateUserId(userId)
      
      const token = await this.getAuthToken()
      
      const response = await fetch(`${API_URL}/plaid/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ publicToken: validatedPublicToken, userId: validatedUserId }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to exchange token')
      }
      
      const data = await response.json()
      
      // Validate response
      const validatedResponse = validateExchangeTokenResponse(data)
      
      return validatedResponse
    } catch (error: any) {
      if (error instanceof PlaidValidationError) {
        throw error
      }
      throw new Error(`Failed to exchange token: ${error.message}`)
    }
  }

  /**
   * Sync transactions for a connection
   */
  async syncTransactions(connectionId: string, userId: string): Promise<{ count: number }> {
    try {
      // Client-side rate limiting check (more restrictive for sync operations)
      const rateLimitKey = `plaid:sync-transactions:${userId}`
      if (!rateLimiter.check(rateLimitKey, RATE_LIMITS.PLAID_SYNC_TRANSACTIONS.maxAttempts, RATE_LIMITS.PLAID_SYNC_TRANSACTIONS.windowMs)) {
        throw new Error('Too many transaction sync requests. Please wait a moment and try again.')
      }
      
      // Validate and sanitize inputs
      const validatedConnectionId = validateConnectionId(connectionId)
      const validatedUserId = validateUserId(userId)
      
      const token = await this.getAuthToken()
      
      const response = await fetch(`${API_URL}/plaid/sync-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ connectionId: validatedConnectionId, userId: validatedUserId }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sync transactions')
      }
      
      const data = await response.json()
      
      // Validate response
      const validatedResponse = validateSyncTransactionsResponse(data)
      
      return { count: validatedResponse.transactionCount }
    } catch (error: any) {
      if (error instanceof PlaidValidationError) {
        throw error
      }
      throw new Error(`Failed to sync transactions: ${error.message}`)
    }
  }

  /**
   * Disconnect a bank connection
   */
  async disconnectBank(connectionId: string, userId: string): Promise<void> {
    try {
      // Validate and sanitize inputs
      const validatedConnectionId = validateConnectionId(connectionId)
      const validatedUserId = validateUserId(userId)
      
      const token = await this.getAuthToken()
      
      const response = await fetch(`${API_URL}/plaid/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ connectionId: validatedConnectionId, userId: validatedUserId }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to disconnect bank')
      }
      
    } catch (error: any) {
      if (error instanceof PlaidValidationError) {
        throw error
      }
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

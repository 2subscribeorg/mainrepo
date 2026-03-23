import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { getFirebaseDb, getFirebaseAuth } from '@/config/firebase'

/**
 * Service for storing and retrieving Plaid access tokens
 * Tokens are stored securely in Firestore under user-scoped collections
 */
export class PlaidTokenService {
  /**
   * Store access token for a Plaid item
   */
  async storeAccessToken(userId: string, itemId: string, accessToken: string): Promise<void> {
    try {
      const db = getFirebaseDb()
      const tokenRef = doc(db, 'users', userId, 'plaidTokens', itemId)
      
      await setDoc(tokenRef, {
        accessToken,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      
    } catch (error) {
      throw new Error('Failed to store access token')
    }
  }

  /**
   * Get access token for a Plaid item
   */
  async getAccessToken(userId: string, itemId: string): Promise<string | null> {
    try {
      const db = getFirebaseDb()
      const tokenRef = doc(db, 'users', userId, 'plaidTokens', itemId)
      
      const tokenDoc = await getDoc(tokenRef)
      
      if (!tokenDoc.exists()) {
        return null
      }
      
      return tokenDoc.data().accessToken
    } catch (error) {
      return null
    }
  }

  /**
   * Delete access token for a Plaid item
   */
  async deleteAccessToken(userId: string, itemId: string): Promise<void> {
    try {
      const db = getFirebaseDb()
      const tokenRef = doc(db, 'users', userId, 'plaidTokens', itemId)
      
      await deleteDoc(tokenRef)
      
    } catch (error) {
      throw new Error('Failed to delete access token')
    }
  }

  /**
   * Get current authenticated user ID
   */
  getCurrentUserId(): string {
    const auth = getFirebaseAuth()
    
    if (!auth) {
      throw new Error('Firebase Auth not initialized. Please refresh the page.')
    }
    
    if (!auth.currentUser) {
      throw new Error('Firebase Auth currentUser is null')
    }
    
    return auth.currentUser.uid
  }
}

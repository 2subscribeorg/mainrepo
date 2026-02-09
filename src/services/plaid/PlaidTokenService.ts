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
      
      console.log(`✅ Access token stored for item: ${itemId}`)
    } catch (error) {
      console.error('❌ Failed to store access token:', error)
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
        console.warn(`⚠️ No access token found for item: ${itemId}`)
        return null
      }
      
      return tokenDoc.data().accessToken
    } catch (error) {
      console.error('❌ Failed to get access token:', error)
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
      
      console.log(`✅ Access token deleted for item: ${itemId}`)
    } catch (error) {
      console.error('❌ Failed to delete access token:', error)
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
      console.error('❌ Firebase Auth currentUser is null')
      console.error('Auth state:', { 
        app: auth.app?.name,
        config: auth.config,
      })
      throw new Error('User not authenticated. Please log in again.')
    }
    
    return auth.currentUser.uid
  }
}

import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getFirebaseDb } from '@/config/firebase'
import type { User as FirebaseUser } from 'firebase/auth'

/**
 * Syncs Firebase Auth user to Firestore users collection
 */
export async function syncUserToFirestore(user: FirebaseUser): Promise<void> {
  try {
    const db = getFirebaseDb()
    const userRef = doc(db, 'users', user.uid)

    await setDoc(
      userRef,
      {
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        lastLogin: new Date().toISOString(),
        isActive: true,
        // Don't overwrite these fields if they already exist
      },
      { merge: true }
    )

    console.log('✅ User synced to Firestore:', user.email)
  } catch (error) {
    console.error('❌ Failed to sync user to Firestore:', error)
    // Don't throw - we don't want to block login if Firestore sync fails
  }
}

/**
 * Creates a new user profile in Firestore on signup
 */
export async function createUserProfile(user: FirebaseUser): Promise<void> {
  try {
    const db = getFirebaseDb()
    const userRef = doc(db, 'users', user.uid)

    await setDoc(userRef, {
      id: user.uid,
      email: user.email,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      subscriptionCount: 0,
      bankConnectionCount: 0,
      transactionCount: 0,
      isActive: true,
      preferences: {
        theme: 'light',
        notifications: true,
        currency: 'GBP',
      },
    })

    console.log('✅ User profile created in Firestore:', user.email)
  } catch (error) {
    console.error('❌ Failed to create user profile:', error)
    throw error
  }
}

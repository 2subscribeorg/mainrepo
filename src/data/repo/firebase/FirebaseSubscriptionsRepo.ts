import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  Unsubscribe,
} from 'firebase/firestore'
import type { ID, Subscription } from '@/domain/models'
import type {
  ISubscriptionsRepo,
  SubscriptionFilter,
  CancellationResult,
  DataChangeCallback,
} from '../interfaces/ISubscriptionsRepo'
import { getFirebaseDb, getFirebaseAuth } from '@/config/firebase'

export class FirebaseSubscriptionsRepo implements ISubscriptionsRepo {
  private readonly collectionName = 'subscriptions'

  private getUserId(): string {
    const auth = getFirebaseAuth()
    if (!auth.currentUser) {
      throw new Error('User not authenticated')
    }
    return auth.currentUser.uid
  }

  private buildQuery(filter?: SubscriptionFilter) {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    let q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId)
    )

    if (filter?.status) {
      q = query(q, where('status', '==', filter.status))
    }

    if (filter?.categoryId) {
      q = query(q, where('categoryId', '==', filter.categoryId))
    }

    return q
  }

  async list(filter?: SubscriptionFilter): Promise<Subscription[]> {
    const q = this.buildQuery(filter)
    const snapshot = await getDocs(q)
    
    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Subscription[]

    // Client-side filters (Firestore doesn't support all filters)
    if (filter?.search) {
      const searchLower = filter.search.toLowerCase()
      results = results.filter(s =>
        s.merchantName.toLowerCase().includes(searchLower)
      )
    }

    if (filter?.from) {
      results = results.filter(s => s.nextPaymentDate >= filter.from!)
    }

    if (filter?.to) {
      results = results.filter(s => s.nextPaymentDate <= filter.to!)
    }

    return results
  }

  async get(id: ID): Promise<Subscription | null> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    const docRef = doc(db, this.collectionName, id)
    const snapshot = await getDoc(docRef)
    
    if (!snapshot.exists()) return null
    
    const data = snapshot.data() as Subscription
    
    // Security: Verify ownership
    if (data.userId !== userId) {
      throw new Error('Unauthorized: Cannot access this subscription')
    }
    
    return { ...data, id: snapshot.id }
  }

  async upsert(s: Subscription): Promise<void> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    const data = {
      ...s,
      userId,
      updatedAt: new Date().toISOString(),
      createdAt: s.createdAt || new Date().toISOString(),
    }
    
    const docRef = doc(db, this.collectionName, s.id)
    await setDoc(docRef, data, { merge: true })
  }

  async cancel(id: ID): Promise<CancellationResult> {
    const subscription = await this.get(id)
    if (!subscription) {
      return { supported: false, message: 'Subscription not found' }
    }

    const updatedSubscription: Subscription = {
      ...subscription,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    }

    await this.upsert(updatedSubscription)

    return {
      supported: true,
      message: 'Subscription cancelled successfully',
    }
  }

  async delete(id: ID): Promise<void> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    // Verify ownership first
    const subscription = await this.get(id)
    if (!subscription) {
      throw new Error('Subscription not found')
    }
    
    if (subscription.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete this subscription')
    }
    
    const docRef = doc(db, this.collectionName, id)
    await deleteDoc(docRef)
  }

  // ============================================================================
  // Phase 2 Ready - Observable Pattern with REAL-TIME UPDATES! 🔥
  // ============================================================================

  subscribe(
    callback: DataChangeCallback<Subscription>,
    filter?: SubscriptionFilter
  ): () => void {
    const q = this.buildQuery(filter)
    
    // Firestore real-time listener!
    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Subscription[]

        // Apply client-side filters
        if (filter?.search) {
          const searchLower = filter.search.toLowerCase()
          results = results.filter(s =>
            s.merchantName.toLowerCase().includes(searchLower)
          )
        }

        if (filter?.from) {
          results = results.filter(s => s.nextPaymentDate >= filter.from!)
        }

        if (filter?.to) {
          results = results.filter(s => s.nextPaymentDate <= filter.to!)
        }

        callback(results)
      },
      (error) => {
        console.error('Firebase subscription error:', error)
        callback([]) // Return empty on error
      }
    )

    return unsubscribe
  }

  get supportsRealtime(): boolean {
    return true // Firebase has native real-time support! 🎉
  }
}

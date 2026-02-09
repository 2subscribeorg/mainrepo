import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore'
import type { ID, Transaction } from '@/domain/models'
import type {
  ITransactionsRepo,
  TransactionFilter,
  DataChangeCallback,
} from '../interfaces/ITransactionsRepo'
import { getFirebaseDb, getFirebaseAuth } from '@/config/firebase'
import { validateFirebaseTransaction, validateFirebaseTransactions } from '@/schemas/api.schema'

export class FirebaseTransactionsRepo implements ITransactionsRepo {
  private readonly collectionName = 'transactions'

  private getUserId(): string {
    const auth = getFirebaseAuth()
    if (!auth.currentUser) {
      throw new Error('User not authenticated')
    }
    return auth.currentUser.uid
  }

  private buildQuery(filter?: TransactionFilter) {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    let q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId)
    )

    if (filter?.subscriptionId) {
      q = query(q, where('subscriptionId', '==', filter.subscriptionId))
    }

    if (filter?.categoryId) {
      q = query(q, where('categoryId', '==', filter.categoryId))
    }

    return q
  }

  async list(filter?: TransactionFilter): Promise<Transaction[]> {
    const q = this.buildQuery(filter)
    const snapshot = await getDocs(q)
    
    const rawResults = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Validate Firebase response with Zod
    const validation = validateFirebaseTransactions(rawResults)
    if (!validation.success) {
      console.error('Firebase transaction validation failed:', validation.error)
      throw new Error(`Invalid transaction data from Firebase: ${validation.error.errors[0]?.message}`)
    }

    let results = validation.data

    // Client-side date filtering
    if (filter?.from) {
      results = results.filter(t => t.date >= filter.from!)
    }

    if (filter?.to) {
      results = results.filter(t => t.date <= filter.to!)
    }

    // Sort by date descending
    return results.sort((a, b) => b.date.localeCompare(a.date))
  }

  async get(id: ID): Promise<Transaction | null> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    const docRef = doc(db, this.collectionName, id)
    const snapshot = await getDoc(docRef)
    
    if (!snapshot.exists()) return null
    
    const rawData = { ...snapshot.data(), id: snapshot.id }
    
    // Validate Firebase response with Zod
    const validation = validateFirebaseTransaction(rawData)
    if (!validation.success) {
      console.error('Firebase transaction validation failed:', validation.error)
      throw new Error(`Invalid transaction data from Firebase: ${validation.error.errors[0]?.message}`)
    }
    
    const data = validation.data
    
    // Security: Verify ownership
    if (data.userId !== userId) {
      throw new Error('Unauthorized: Cannot access this transaction')
    }
    
    return data
  }

  async upsert(t: Transaction): Promise<void> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    const data = {
      ...t,
      userId,
      createdAt: t.createdAt || new Date().toISOString(),
    }
    
    const docRef = doc(db, this.collectionName, t.id)
    await setDoc(docRef, data, { merge: true })
  }

  async seed(_count = 150): Promise<void> {
    // Seeding not supported in Firebase
    console.warn('Seed operation not supported in Firebase backend')
  }

  async clear(): Promise<void> {
    // Batch delete would require Cloud Functions or client-side loop
    console.warn('Clear operation requires manual implementation in Firebase')
  }

  // Phase 2 - Observable pattern
  subscribe(
    callback: DataChangeCallback<Transaction>,
    filter?: TransactionFilter
  ): () => void {
    const q = this.buildQuery(filter)
    
    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[]

        // Apply client-side filters
        if (filter?.from) {
          results = results.filter(t => t.date >= filter.from!)
        }

        if (filter?.to) {
          results = results.filter(t => t.date <= filter.to!)
        }

        // Sort by date descending
        results.sort((a, b) => b.date.localeCompare(a.date))

        callback(results)
      },
      (error) => {
        console.error('Firebase transactions error:', error)
        callback([])
      }
    )
    
    return unsubscribe
  }

  get supportsRealtime(): boolean {
    return true
  }
}

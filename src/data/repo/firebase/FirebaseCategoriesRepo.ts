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
import type { ID, Category } from '@/domain/models'
import type { ICategoriesRepo, DataChangeCallback } from '../interfaces/ICategoriesRepo'
import { getFirebaseDb, getFirebaseAuth } from '@/config/firebase'

export class FirebaseCategoriesRepo implements ICategoriesRepo {
  private readonly collectionName = 'categories'

  private getUserId(): string {
    const auth = getFirebaseAuth()
    if (!auth.currentUser) {
      throw new Error('User not authenticated')
    }
    return auth.currentUser.uid
  }

  async list(): Promise<Category[]> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    // Get user's categories only
    // Note: System categories (userId = null) are a Phase 2 feature
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId)
    )
    
    const snapshot = await getDocs(q)
    console.log('🔥 Firestore query returned:', snapshot.docs.length, 'categories')
    
    const categories = snapshot.docs.map(doc => {
      const data = doc.data()
      console.log('  📄 Category:', doc.id, data.name, 'userId:', data.userId)
      return {
        id: doc.id,
        ...data,
      }
    }) as Category[]
    
    return categories
  }

  async get(id: ID): Promise<Category | null> {
    const db = getFirebaseDb()
    const docRef = doc(db, this.collectionName, id)
    const snapshot = await getDoc(docRef)
    
    if (!snapshot.exists()) return null
    
    return { id: snapshot.id, ...snapshot.data() } as Category
  }

  async upsert(c: Category): Promise<void> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    const data = {
      ...c,
      userId,
      updatedAt: new Date().toISOString(),
      createdAt: c.createdAt || new Date().toISOString(),
    }
    
    const docRef = doc(db, this.collectionName, c.id)
    await setDoc(docRef, data, { merge: true })
  }

  async remove(id: ID): Promise<void> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    // Verify ownership
    const category = await this.get(id)
    if (!category) {
      throw new Error('Category not found')
    }
    
    if (category.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete this category')
    }
    
    const docRef = doc(db, this.collectionName, id)
    await deleteDoc(docRef)
  }

  async resolveForMerchant(_merchant: string): Promise<Category | null> {
    // TODO: Implement merchant rules lookup
    // For now, return null
    return null
  }

  async overrideForTransaction(_txId: ID, _categoryId: ID): Promise<void> {
    // TODO: Implement transaction category override
    // This would update the transaction's categoryId
  }

  // Phase 2 - Observable pattern
  subscribe(callback: DataChangeCallback<Category>): () => void {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId)
    )
    
    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[]
        callback(results)
      },
      (error) => {
        console.error('Firebase categories error:', error)
        callback([])
      }
    )
    
    return unsubscribe
  }

  get supportsRealtime(): boolean {
    return true
  }
}

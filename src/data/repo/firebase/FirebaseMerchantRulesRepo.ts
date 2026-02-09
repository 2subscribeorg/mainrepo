import {
  collection,
  doc,
  query,
  where,
  or,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  Unsubscribe,
  orderBy,
} from 'firebase/firestore'
import type { ID, MerchantCategoryRule } from '@/domain/models'
import type {
  IMerchantRulesRepo,
  DataChangeCallback,
} from '../interfaces/IMerchantRulesRepo'
import { getFirebaseDb, getFirebaseAuth } from '@/config/firebase'

export class FirebaseMerchantRulesRepo implements IMerchantRulesRepo {
  private readonly collectionName = 'merchantRules'

  private getUserId(): string {
    const auth = getFirebaseAuth()
    if (!auth.currentUser) {
      throw new Error('User not authenticated')
    }
    return auth.currentUser.uid
  }

  async list(): Promise<MerchantCategoryRule[]> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    // Get user's rules + global rules (userId = null)
    const q = query(
      collection(db, this.collectionName),
      or(
        where('userId', '==', userId),
        where('userId', '==', null)
      ),
      orderBy('priority', 'desc')
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MerchantCategoryRule[]
  }

  async get(id: ID): Promise<MerchantCategoryRule | null> {
    const db = getFirebaseDb()
    const docRef = doc(db, this.collectionName, id)
    const snapshot = await getDoc(docRef)
    
    if (!snapshot.exists()) return null
    
    return { id: snapshot.id, ...snapshot.data() } as MerchantCategoryRule
  }

  async upsert(rule: MerchantCategoryRule): Promise<void> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    const data = {
      ...rule,
      userId,
      createdAt: rule.createdAt || new Date().toISOString(),
      isActive: rule.isActive ?? true,
    }
    
    const docRef = doc(db, this.collectionName, rule.id)
    await setDoc(docRef, data, { merge: true })
  }

  async remove(id: ID): Promise<void> {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    // Verify ownership
    const rule = await this.get(id)
    if (!rule) {
      throw new Error('Rule not found')
    }
    
    if (rule.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete this rule')
    }
    
    const docRef = doc(db, this.collectionName, id)
    await deleteDoc(docRef)
  }

  async findMatchingRule(merchantName: string): Promise<MerchantCategoryRule | null> {
    const rules = await this.list()
    const merchantLower = merchantName.toLowerCase()

    for (const rule of rules) {
      if (!rule.isActive) continue
      
      const pattern = rule.merchantPattern.toLowerCase()
      if (merchantLower.includes(pattern) || pattern.includes(merchantLower)) {
        return rule
      }
    }

    return null
  }

  // Phase 2 - Observable pattern
  subscribe(callback: DataChangeCallback<MerchantCategoryRule>): () => void {
    const db = getFirebaseDb()
    const userId = this.getUserId()
    
    const q = query(
      collection(db, this.collectionName),
      or(
        where('userId', '==', userId),
        where('userId', '==', null)
      ),
      orderBy('priority', 'desc')
    )
    
    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as MerchantCategoryRule[]
        callback(results)
      },
      (error) => {
        console.error('Firebase merchant rules error:', error)
        callback([])
      }
    )
    
    return unsubscribe
  }

  get supportsRealtime(): boolean {
    return true
  }
}

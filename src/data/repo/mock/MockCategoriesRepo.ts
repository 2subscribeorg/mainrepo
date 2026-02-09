import type { ID, Category } from '@/domain/models'
import type { ICategoriesRepo, DataChangeCallback } from '../interfaces/ICategoriesRepo'
import { getDB } from './db'

export class MockCategoriesRepo implements ICategoriesRepo {
  private listeners: Map<number, DataChangeCallback<Category>> = new Map()
  private listenerIdCounter = 0
  async list(): Promise<Category[]> {
    const db = await getDB()
    return (await db.getAll('categories')) as Category[]
  }

  async get(id: ID): Promise<Category | null> {
    const db = await getDB()
    const item = await db.get('categories', id)
    return item ? (item as Category) : null
  }

  async upsert(c: Category): Promise<void> {
    const db = await getDB()
    await db.put('categories', c)
    await this.notifyListeners()
  }

  async remove(id: ID): Promise<void> {
    const db = await getDB()
    await db.delete('categories', id)
    await this.notifyListeners()
  }

  async resolveForMerchant(merchant: string): Promise<Category | null> {
    const db = await getDB()
    
    // Get merchant rules
    const rules = await db.getAll('merchantRules')
    const sortedRules = rules.sort((a: any, b: any) => b.priority - a.priority)

    const merchantLower = merchant.toLowerCase()

    // Find matching rule
    for (const rule of sortedRules) {
      const pattern = (rule as any).merchantPattern.toLowerCase()
      if (merchantLower.includes(pattern) || pattern.includes(merchantLower)) {
        const category = await db.get('categories', (rule as any).categoryId)
        if (category) return category as Category
      }
    }

    return null
  }

  async overrideForTransaction(txId: ID, categoryId: ID): Promise<void> {
    const db = await getDB()
    
    // Store the override
    await db.put('transactionCategoryOverrides', {
      transactionId: txId,
      categoryId,
    })

    // Update the transaction
    const tx = await db.get('transactions', txId) as any
    if (tx) {
      tx.categoryId = categoryId
      await db.put('transactions', tx)
    }
  }

  // Phase 2 ready - Observable pattern
  subscribe(callback: DataChangeCallback<Category>): () => void {
    const listenerId = this.listenerIdCounter++
    this.listeners.set(listenerId, callback)
    
    // Immediately call with current data
    this.list().then(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listenerId)
    }
  }

  get supportsRealtime(): boolean {
    return false
  }

  private async notifyListeners(): Promise<void> {
    const data = await this.list()
    for (const callback of this.listeners.values()) {
      callback(data)
    }
  }
}

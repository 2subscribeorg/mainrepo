import type { ID, MerchantCategoryRule } from '@/domain/models'
import type { IMerchantRulesRepo, DataChangeCallback } from '../interfaces/IMerchantRulesRepo'
import { getDB } from './db'

export class MockMerchantRulesRepo implements IMerchantRulesRepo {
  private listeners: Map<number, DataChangeCallback<MerchantCategoryRule>> = new Map()
  private listenerIdCounter = 0
  async list(): Promise<MerchantCategoryRule[]> {
    const db = await getDB()
    const rules = (await db.getAll('merchantRules')) as MerchantCategoryRule[]
    return rules.sort((a, b) => b.priority - a.priority)
  }

  async get(id: ID): Promise<MerchantCategoryRule | null> {
    const db = await getDB()
    const item = await db.get('merchantRules', id)
    return item ? (item as MerchantCategoryRule) : null
  }

  async upsert(rule: MerchantCategoryRule): Promise<void> {
    const db = await getDB()
    await db.put('merchantRules', rule)
    await this.notifyListeners()
  }

  async remove(id: ID): Promise<void> {
    const db = await getDB()
    await db.delete('merchantRules', id)
    await this.notifyListeners()
  }

  async findMatchingRule(merchantName: string): Promise<MerchantCategoryRule | null> {
    const rules = await this.list()
    const merchantLower = merchantName.toLowerCase()

    for (const rule of rules) {
      const pattern = rule.merchantPattern.toLowerCase()
      if (merchantLower.includes(pattern) || pattern.includes(merchantLower)) {
        return rule
      }
    }

    return null
  }

  // Phase 2 ready - Observable pattern
  subscribe(callback: DataChangeCallback<MerchantCategoryRule>): () => void {
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

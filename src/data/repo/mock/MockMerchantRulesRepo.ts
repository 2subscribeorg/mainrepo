import type { ID, MerchantCategoryRule } from '@/domain/models'
import type { IMerchantRulesRepo } from '../interfaces/IMerchantRulesRepo'
import { getDB } from './db'

export class MockMerchantRulesRepo implements IMerchantRulesRepo {
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
  }

  async remove(id: ID): Promise<void> {
    const db = await getDB()
    await db.delete('merchantRules', id)
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
}

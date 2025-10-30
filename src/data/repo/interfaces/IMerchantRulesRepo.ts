import type { ID, MerchantCategoryRule } from '@/domain/models'

export interface IMerchantRulesRepo {
  list(): Promise<MerchantCategoryRule[]>
  get(id: ID): Promise<MerchantCategoryRule | null>
  upsert(rule: MerchantCategoryRule): Promise<void>
  remove(id: ID): Promise<void>
  findMatchingRule(merchantName: string): Promise<MerchantCategoryRule | null>
}

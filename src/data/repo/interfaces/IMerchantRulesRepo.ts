import type { ID, MerchantCategoryRule } from '@/domain/models'

export type DataChangeCallback<T> = (data: T[]) => void

export interface IMerchantRulesRepo {
  // Existing methods (Phase 1)
  list(): Promise<MerchantCategoryRule[]>
  get(id: ID): Promise<MerchantCategoryRule | null>
  upsert(rule: MerchantCategoryRule): Promise<void>
  remove(id: ID): Promise<void>
  findMatchingRule(merchantName: string): Promise<MerchantCategoryRule | null>
  
  // Phase 2 ready - Observable pattern
  subscribe(callback: DataChangeCallback<MerchantCategoryRule>): () => void
  get supportsRealtime(): boolean
}

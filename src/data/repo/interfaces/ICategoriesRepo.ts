import type { ID, Category } from '@/domain/models'

export type DataChangeCallback<T> = (data: T[]) => void

export interface ICategoriesRepo {
  // Existing methods (Phase 1)
  list(): Promise<Category[]>
  get(id: ID): Promise<Category | null>
  upsert(c: Category): Promise<void>
  remove(id: ID): Promise<void>
  resolveForMerchant(merchant: string): Promise<Category | null>
  overrideForTransaction(txId: ID, categoryId: ID): Promise<void>
  
  // Phase 2 ready - Observable pattern
  subscribe(callback: DataChangeCallback<Category>): () => void
  get supportsRealtime(): boolean
}

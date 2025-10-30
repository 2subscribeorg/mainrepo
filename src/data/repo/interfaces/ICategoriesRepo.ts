import type { ID, Category } from '@/domain/models'

export interface ICategoriesRepo {
  list(): Promise<Category[]>
  get(id: ID): Promise<Category | null>
  upsert(c: Category): Promise<void>
  remove(id: ID): Promise<void>
  resolveForMerchant(merchant: string): Promise<Category | null>
  overrideForTransaction(txId: ID, categoryId: ID): Promise<void>
}

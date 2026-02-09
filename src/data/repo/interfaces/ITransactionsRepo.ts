import type { ID, Transaction } from '@/domain/models'

export interface TransactionFilter {
  subscriptionId?: ID
  from?: string
  to?: string
  categoryId?: ID
}

export type DataChangeCallback<T> = (data: T[]) => void

export interface ITransactionsRepo {
  // Existing methods (Phase 1)
  list(filter?: TransactionFilter): Promise<Transaction[]>
  get(id: ID): Promise<Transaction | null>
  upsert(t: Transaction): Promise<void>
  seed(count?: number): Promise<void>
  clear(): Promise<void>
  
  // Phase 2 ready - Observable pattern
  subscribe(callback: DataChangeCallback<Transaction>, filter?: TransactionFilter): () => void
  get supportsRealtime(): boolean
}

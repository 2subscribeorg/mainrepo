import type { ID, Transaction } from '@/domain/models'

export interface TransactionFilter {
  subscriptionId?: ID
  from?: string
  to?: string
  categoryId?: ID
}

export interface ITransactionsRepo {
  list(filter?: TransactionFilter): Promise<Transaction[]>
  get(id: ID): Promise<Transaction | null>
  upsert(t: Transaction): Promise<void>
  seed(count?: number): Promise<void>
  clear(): Promise<void>
}

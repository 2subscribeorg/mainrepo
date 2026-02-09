import type { ID, Subscription } from '@/domain/models'

export interface SubscriptionFilter {
  search?: string
  categoryId?: ID
  from?: string
  to?: string
  status?: 'active' | 'paused' | 'cancelled'
}

export interface CancellationResult {
  supported: boolean
  message: string
}

export type DataChangeCallback<T> = (data: T[]) => void

export interface ISubscriptionsRepo {
  // Existing methods (Phase 1)
  list(filter?: SubscriptionFilter): Promise<Subscription[]>
  get(id: ID): Promise<Subscription | null>
  upsert(s: Subscription): Promise<void>
  cancel(id: ID): Promise<CancellationResult>
  delete(id: ID): Promise<void>
  
  // Phase 2 ready - Observable pattern
  subscribe(callback: DataChangeCallback<Subscription>, filter?: SubscriptionFilter): () => void
  get supportsRealtime(): boolean
}

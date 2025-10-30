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

export interface ISubscriptionsRepo {
  list(filter?: SubscriptionFilter): Promise<Subscription[]>
  get(id: ID): Promise<Subscription | null>
  upsert(s: Subscription): Promise<void>
  cancel(id: ID): Promise<CancellationResult>
  delete(id: ID): Promise<void>
}

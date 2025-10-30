import type { ID, Subscription } from '@/domain/models'
import type {
  ISubscriptionsRepo,
  SubscriptionFilter,
  CancellationResult,
} from '../interfaces/ISubscriptionsRepo'
import { getDB } from './db'

export class MockSubscriptionsRepo implements ISubscriptionsRepo {
  async list(filter?: SubscriptionFilter): Promise<Subscription[]> {
    const db = await getDB()
    let items = await db.getAll('subscriptions') as Subscription[]

    if (!filter) return items

    // Apply filters
    if (filter.search) {
      const search = filter.search.toLowerCase()
      items = items.filter((s) => s.merchantName.toLowerCase().includes(search))
    }

    if (filter.categoryId) {
      items = items.filter((s) => s.categoryId === filter.categoryId)
    }

    if (filter.status) {
      items = items.filter((s) => s.status === filter.status)
    }

    if (filter.from) {
      items = items.filter((s) => s.nextPaymentDate >= filter.from!)
    }

    if (filter.to) {
      items = items.filter((s) => s.nextPaymentDate <= filter.to!)
    }

    return items
  }

  async get(id: ID): Promise<Subscription | null> {
    const db = await getDB()
    const item = await db.get('subscriptions', id)
    return item ? (item as Subscription) : null
  }

  async upsert(s: Subscription): Promise<void> {
    const db = await getDB()
    await db.put('subscriptions', s)
  }

  async cancel(id: ID): Promise<CancellationResult> {
    const db = await getDB()
    const subscription = await db.get('subscriptions', id) as Subscription | undefined

    if (!subscription) {
      return {
        supported: false,
        message: 'Subscription not found',
      }
    }

    // Mock cancellation: update status
    subscription.status = 'cancelled'
    await db.put('subscriptions', subscription)

    return {
      supported: true,
      message: `Successfully cancelled ${subscription.merchantName} subscription. This is a mock cancellation.`,
    }
  }

  async delete(id: ID): Promise<void> {
    const db = await getDB()
    await db.delete('subscriptions', id)
  }
}

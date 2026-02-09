import type { ID, Subscription } from '@/domain/models'
import type {
  ISubscriptionsRepo,
  SubscriptionFilter,
  CancellationResult,
  DataChangeCallback,
} from '../interfaces/ISubscriptionsRepo'
import { getDB } from './db'

export class MockSubscriptionsRepo implements ISubscriptionsRepo {
  private listeners: Map<number, { callback: DataChangeCallback<Subscription>; filter?: SubscriptionFilter }> = new Map()
  private listenerIdCounter = 0
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
    await this.notifyListeners() // Notify about change
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

    await this.notifyListeners() // Notify about change

    return {
      supported: true,
      message: `Successfully cancelled ${subscription.merchantName} subscription. This is a mock cancellation.`,
    }
  }

  async delete(id: ID): Promise<void> {
    const db = await getDB()
    await db.delete('subscriptions', id)
    await this.notifyListeners() // Notify about change
  }

  // ============================================================================
  // Phase 2 Ready: Observable Pattern
  // ============================================================================

  /**
   * Subscribe to data changes
   * For mock repos, we manually trigger notifications after mutations
   * For Firebase repos, this will hook into Firestore's onSnapshot
   */
  subscribe(callback: DataChangeCallback<Subscription>, filter?: SubscriptionFilter): () => void {
    const listenerId = this.listenerIdCounter++
    this.listeners.set(listenerId, { callback, filter })

    // Immediately call with current data
    this.list(filter).then(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listenerId)
    }
  }

  /**
   * Mock repos don't have real-time updates
   * Firebase repos will return true
   */
  get supportsRealtime(): boolean {
    return false
  }

  /**
   * Notify all listeners about data changes
   * Called after mutations (upsert, delete, cancel)
   */
  private async notifyListeners(): Promise<void> {
    for (const { callback, filter } of this.listeners.values()) {
      const data = await this.list(filter)
      callback(data)
    }
  }
}

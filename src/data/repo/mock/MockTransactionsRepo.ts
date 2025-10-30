import type { ID, Transaction } from '@/domain/models'
import type { ITransactionsRepo, TransactionFilter } from '../interfaces/ITransactionsRepo'
import { getDB } from './db'
import { seedTransactions } from './seedData'

export class MockTransactionsRepo implements ITransactionsRepo {
  async list(filter?: TransactionFilter): Promise<Transaction[]> {
    const db = await getDB()
    let items = await db.getAll('transactions') as Transaction[]

    if (!filter) return items

    if (filter.subscriptionId) {
      items = items.filter((t) => t.subscriptionId === filter.subscriptionId)
    }

    if (filter.categoryId) {
      items = items.filter((t) => t.categoryId === filter.categoryId)
    }

    if (filter.from) {
      items = items.filter((t) => t.date >= filter.from!)
    }

    if (filter.to) {
      items = items.filter((t) => t.date <= filter.to!)
    }

    return items.sort((a, b) => b.date.localeCompare(a.date))
  }

  async get(id: ID): Promise<Transaction | null> {
    const db = await getDB()
    const item = await db.get('transactions', id)
    return item ? (item as Transaction) : null
  }

  async upsert(t: Transaction): Promise<void> {
    const db = await getDB()
    await db.put('transactions', t)
  }

  async seed(count = 150): Promise<void> {
    await seedTransactions(count)
  }

  async clear(): Promise<void> {
    const db = await getDB()
    await db.clear('transactions')
  }
}

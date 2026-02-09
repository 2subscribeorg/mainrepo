import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'SubscriptionManagerDB'
const DB_VERSION = 1

export interface DBSchema {
  subscriptions: {
    key: string
    value: unknown
  }
  transactions: {
    key: string
    value: unknown
    indexes: { subscriptionId: string; date: string; categoryId: string }
  }
  categories: {
    key: string
    value: unknown
  }
  merchantRules: {
    key: string
    value: unknown
    indexes: { priority: number }
  }
  transactionCategoryOverrides: {
    key: string
    value: { transactionId: string; categoryId: string }
  }
}

let dbInstance: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Subscriptions store
      if (!db.objectStoreNames.contains('subscriptions')) {
        db.createObjectStore('subscriptions', { keyPath: 'id' })
      }

      // Transactions store with indexes
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' })
        txStore.createIndex('subscriptionId', 'subscriptionId', { unique: false })
        txStore.createIndex('date', 'date', { unique: false })
        txStore.createIndex('categoryId', 'categoryId', { unique: false })
      }

      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' })
      }

      // Merchant rules store
      if (!db.objectStoreNames.contains('merchantRules')) {
        const rulesStore = db.createObjectStore('merchantRules', { keyPath: 'id' })
        rulesStore.createIndex('priority', 'priority', { unique: false })
      }


      // Transaction category overrides
      if (!db.objectStoreNames.contains('transactionCategoryOverrides')) {
        db.createObjectStore('transactionCategoryOverrides', { keyPath: 'transactionId' })
      }
    },
  })

  return dbInstance
}

export async function clearDB(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(
    ['subscriptions', 'transactions', 'categories', 'merchantRules', 'transactionCategoryOverrides'],
    'readwrite'
  )
  
  await Promise.all([
    tx.objectStore('subscriptions').clear(),
    tx.objectStore('transactions').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('merchantRules').clear(),
    tx.objectStore('transactionCategoryOverrides').clear(),
  ])
  
  await tx.done
}

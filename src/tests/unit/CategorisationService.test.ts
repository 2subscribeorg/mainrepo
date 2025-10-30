import { describe, it, expect, beforeEach } from 'vitest'
import { CategorisationService } from '@/domain/services/CategorisationService'
import { clearDB, getDB } from '@/data/repo/mock/db'
import type { Category, Transaction, MerchantCategoryRule } from '@/domain/models'

describe('CategorisationService', () => {
  let service: CategorisationService

  beforeEach(async () => {
    await clearDB()
    service = new CategorisationService()
  })

  it('should use transaction-specific category override', async () => {
    const db = await getDB()

    const category1: Category = {
      id: 'cat-1',
      name: 'Category 1',
    }
    const category2: Category = {
      id: 'cat-2',
      name: 'Category 2',
    }

    await db.put('categories', category1)
    await db.put('categories', category2)

    const transaction: Transaction = {
      id: 'tx-1',
      merchantName: 'Test Merchant',
      amount: { amount: 10, currency: 'GBP' },
      date: '2024-01-01',
      categoryId: 'cat-2', // Override
    }

    const result = await service.categoriseTransaction(transaction)

    expect(result.id).toBe('cat-2')
    expect(result.name).toBe('Category 2')
  })

  it('should use merchant rule when no override exists', async () => {
    const db = await getDB()

    const category: Category = {
      id: 'cat-streaming',
      name: 'Streaming',
    }
    await db.put('categories', category)

    const rule: MerchantCategoryRule = {
      id: 'rule-1',
      merchantPattern: 'spotify',
      categoryId: 'cat-streaming',
      priority: 10,
    }
    await db.put('merchantRules', rule)

    const transaction: Transaction = {
      id: 'tx-1',
      merchantName: 'Spotify Premium',
      amount: { amount: 9.99, currency: 'GBP' },
      date: '2024-01-01',
    }

    const result = await service.categoriseTransaction(transaction)

    expect(result.id).toBe('cat-streaming')
    expect(result.name).toBe('Streaming')
  })

  it('should prioritize higher priority rules', async () => {
    const db = await getDB()

    const category1: Category = {
      id: 'cat-1',
      name: 'Category 1',
    }
    const category2: Category = {
      id: 'cat-2',
      name: 'Category 2',
    }

    await db.put('categories', category1)
    await db.put('categories', category2)

    const rule1: MerchantCategoryRule = {
      id: 'rule-1',
      merchantPattern: 'test',
      categoryId: 'cat-1',
      priority: 5,
    }
    const rule2: MerchantCategoryRule = {
      id: 'rule-2',
      merchantPattern: 'test',
      categoryId: 'cat-2',
      priority: 10, // Higher priority
    }

    await db.put('merchantRules', rule1)
    await db.put('merchantRules', rule2)

    const transaction: Transaction = {
      id: 'tx-1',
      merchantName: 'Test Merchant',
      amount: { amount: 10, currency: 'GBP' },
      date: '2024-01-01',
    }

    const result = await service.categoriseTransaction(transaction)

    expect(result.id).toBe('cat-2')
  })

  it('should fall back to uncategorised when no rules match', async () => {
    const db = await getDB()

    const uncategorised: Category = {
      id: 'cat-uncat',
      name: 'Uncategorised',
    }
    await db.put('categories', uncategorised)

    const transaction: Transaction = {
      id: 'tx-1',
      merchantName: 'Unknown Merchant',
      amount: { amount: 10, currency: 'GBP' },
      date: '2024-01-01',
    }

    const result = await service.categoriseTransaction(transaction)

    expect(result.name).toBe('Uncategorised')
  })

  it('should override transaction category', async () => {
    const db = await getDB()

    const category: Category = {
      id: 'cat-new',
      name: 'New Category',
    }
    await db.put('categories', category)

    const transaction: Transaction = {
      id: 'tx-1',
      merchantName: 'Test',
      amount: { amount: 10, currency: 'GBP' },
      date: '2024-01-01',
      categoryId: 'cat-old',
    }
    await db.put('transactions', transaction)

    await service.overrideTransactionCategory('tx-1', 'cat-new')

    const updated = (await db.get('transactions', 'tx-1')) as Transaction
    expect(updated.categoryId).toBe('cat-new')
  })
})

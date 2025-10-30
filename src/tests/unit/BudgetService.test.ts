import { describe, it, expect, beforeEach } from 'vitest'
import { BudgetService } from '@/domain/services/BudgetService'
import { clearDB, getDB } from '@/data/repo/mock/db'
import type { Transaction, Category, BudgetConfig } from '@/domain/models'

describe('BudgetService', () => {
  let service: BudgetService

  beforeEach(async () => {
    await clearDB()
    service = new BudgetService()
  })

  it('should calculate monthly spending correctly', async () => {
    const db = await getDB()

    // Add a category
    const category: Category = {
      id: 'cat-1',
      name: 'Test Category',
    }
    await db.put('categories', category)

    // Add transactions for current month
    const now = new Date()
    const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        merchantName: 'Test Merchant 1',
        amount: { amount: 10.50, currency: 'GBP' },
        date: `${monthISO}-05`,
        categoryId: 'cat-1',
      },
      {
        id: 'tx-2',
        merchantName: 'Test Merchant 2',
        amount: { amount: 20.25, currency: 'GBP' },
        date: `${monthISO}-10`,
        categoryId: 'cat-1',
      },
      {
        id: 'tx-3',
        merchantName: 'Test Merchant 3',
        amount: { amount: 15.00, currency: 'GBP' },
        date: `${monthISO}-15`,
        categoryId: 'cat-1',
      },
    ]

    for (const tx of transactions) {
      await db.put('transactions', tx)
    }

    const status = await service.evaluateMonth(monthISO)

    expect(status.totalSpent.amount).toBe(45.75)
    expect(status.totalSpent.currency).toBe('GBP')
  })

  it('should detect budget breaches', async () => {
    const db = await getDB()

    const category: Category = {
      id: 'cat-1',
      name: 'Test Category',
    }
    await db.put('categories', category)

    // Set budget with monthly limit
    const config: BudgetConfig = {
      currency: 'GBP',
      monthlyLimit: { amount: 100, currency: 'GBP' },
    }
    await db.put('budgetConfig', config, 'default')

    // Add transactions that exceed the budget
    const now = new Date()
    const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        merchantName: 'Test',
        amount: { amount: 60, currency: 'GBP' },
        date: `${monthISO}-05`,
        categoryId: 'cat-1',
      },
      {
        id: 'tx-2',
        merchantName: 'Test',
        amount: { amount: 50, currency: 'GBP' },
        date: `${monthISO}-10`,
        categoryId: 'cat-1',
      },
    ]

    for (const tx of transactions) {
      await db.put('transactions', tx)
    }

    const status = await service.evaluateMonth(monthISO)

    expect(status.isOverBudget).toBe(true)
    expect(status.breaches.length).toBeGreaterThan(0)
    expect(status.breaches[0].type).toBe('monthly')
    expect(status.breaches[0].overage.amount).toBe(10)
  })

  it('should detect category budget breaches', async () => {
    const db = await getDB()

    const category: Category = {
      id: 'cat-1',
      name: 'Test Category',
    }
    await db.put('categories', category)

    // Set budget with category limit
    const config: BudgetConfig = {
      currency: 'GBP',
      perCategoryLimits: {
        'cat-1': { amount: 50, currency: 'GBP' },
      },
    }
    await db.put('budgetConfig', config, 'default')

    const now = new Date()
    const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const transaction: Transaction = {
      id: 'tx-1',
      merchantName: 'Test',
      amount: { amount: 75, currency: 'GBP' },
      date: `${monthISO}-05`,
      categoryId: 'cat-1',
    }

    await db.put('transactions', transaction)

    const status = await service.evaluateMonth(monthISO)

    expect(status.isOverBudget).toBe(true)
    const categoryBreach = status.breaches.find((b) => b.type === 'category')
    expect(categoryBreach).toBeDefined()
    expect(categoryBreach?.overage.amount).toBe(25)
  })

  it('should predict budget overage', async () => {
    const db = await getDB()

    const config: BudgetConfig = {
      currency: 'GBP',
      monthlyLimit: { amount: 100, currency: 'GBP' },
    }
    await db.put('budgetConfig', config, 'default')

    const now = new Date()
    const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Current spending: 80
    const transaction: Transaction = {
      id: 'tx-1',
      merchantName: 'Test',
      amount: { amount: 80, currency: 'GBP' },
      date: `${monthISO}-05`,
    }
    await db.put('transactions', transaction)

    // Try to add 30 more (would exceed)
    const result = await service.willExceedOnAdd({ amount: 30, currency: 'GBP' })

    expect(result.willExceed).toBe(true)
    expect(result.reason).toContain('monthly budget')
  })

  it('should handle edge case with exactly zero overage', async () => {
    const db = await getDB()

    const config: BudgetConfig = {
      currency: 'GBP',
      monthlyLimit: { amount: 100.00, currency: 'GBP' },
    }
    await db.put('budgetConfig', config, 'default')

    const now = new Date()
    const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const transaction: Transaction = {
      id: 'tx-1',
      merchantName: 'Test',
      amount: { amount: 100.00, currency: 'GBP' },
      date: `${monthISO}-05`,
    }
    await db.put('transactions', transaction)

    const status = await service.evaluateMonth(monthISO)

    expect(status.isOverBudget).toBe(false)
    expect(status.totalSpent.amount).toBe(100.00)
  })
})

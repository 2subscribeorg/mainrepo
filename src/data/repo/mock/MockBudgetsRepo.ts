import type { BudgetConfig, BudgetStatus, Money } from '@/domain/models'
import type { IBudgetsRepo } from '../interfaces/IBudgetsRepo'
import { getDB } from './db'

const DEFAULT_BUDGET: BudgetConfig = {
  currency: 'GBP',
  monthlyLimit: undefined,
  yearlyLimit: undefined,
  perCategoryLimits: {},
}

export class MockBudgetsRepo implements IBudgetsRepo {
  async get(): Promise<BudgetConfig> {
    const db = await getDB()
    const config = await db.get('budgetConfig', 'default')
    return config ? (config as BudgetConfig) : DEFAULT_BUDGET
  }

  async set(cfg: BudgetConfig): Promise<void> {
    const db = await getDB()
    await db.put('budgetConfig', cfg, 'default')
  }

  async evaluate(monthISO: string): Promise<BudgetStatus> {
    const db = await getDB()
    const config = await this.get()

    // Parse month (format: YYYY-MM)
    const [year, month] = monthISO.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    // Get transactions for the month
    const allTransactions = (await db.getAll('transactions')) as any[]
    const monthTransactions = allTransactions.filter(
      (t) => t.date >= startDate && t.date <= endDate
    )

    // Calculate total spent
    const totalSpent: Money = {
      amount: monthTransactions.reduce((sum, t) => sum + t.amount.amount, 0),
      currency: config.currency,
    }

    // Group by category
    const categorySpending = new Map<string, number>()
    for (const tx of monthTransactions) {
      const catId = tx.categoryId || 'uncategorised'
      categorySpending.set(catId, (categorySpending.get(catId) || 0) + tx.amount.amount)
    }

    // Get all categories
    const categories = (await db.getAll('categories')) as any[]
    const categoryMap = new Map(categories.map((c) => [c.id, c]))

    // Build category status
    const categoryStatus = Array.from(categorySpending.entries()).map(([catId, spent]) => {
      const category = categoryMap.get(catId)
      const limit = config.perCategoryLimits?.[catId] || category?.monthlyLimit
      return {
        categoryId: catId,
        categoryName: category?.name || 'Uncategorised',
        spent: { amount: spent, currency: config.currency },
        limit,
        isOver: limit ? spent > limit.amount : false,
      }
    })

    // Detect breaches
    const breaches: BudgetStatus['breaches'] = []

    // Monthly breach
    if (config.monthlyLimit && totalSpent.amount > config.monthlyLimit.amount) {
      breaches.push({
        type: 'monthly',
        spent: totalSpent,
        limit: config.monthlyLimit,
        overage: {
          amount: totalSpent.amount - config.monthlyLimit.amount,
          currency: config.currency,
        },
      })
    }

    // Category breaches
    for (const status of categoryStatus) {
      if (status.isOver && status.limit) {
        breaches.push({
          type: 'category',
          categoryId: status.categoryId,
          categoryName: status.categoryName,
          spent: status.spent,
          limit: status.limit,
          overage: {
            amount: status.spent.amount - status.limit.amount,
            currency: config.currency,
          },
        })
      }
    }

    return {
      month: monthISO,
      totalSpent,
      monthlyLimit: config.monthlyLimit,
      yearlyLimit: config.yearlyLimit,
      isOverBudget: breaches.length > 0,
      categoryStatus,
      breaches,
    }
  }
}

import type { Money, BudgetStatus, ID } from '../models'
import { repoFactory } from '@/data/repo/RepoFactory'

export class BudgetService {
  private budgetsRepo = repoFactory.getBudgetsRepo()

  async evaluateMonth(monthISO: string): Promise<BudgetStatus> {
    return await this.budgetsRepo.evaluate(monthISO)
  }

  async getCurrentMonthStatus(): Promise<BudgetStatus> {
    const now = new Date()
    const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return await this.evaluateMonth(monthISO)
  }

  async willExceedOnAdd(
    amount: Money,
    categoryId?: ID,
    date?: string
  ): Promise<{ willExceed: boolean; reason?: string }> {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const [year, month] = targetDate.split('-').map(Number)
    const monthISO = `${year}-${String(month).padStart(2, '0')}`

    const currentStatus = await this.evaluateMonth(monthISO)
    const config = await this.budgetsRepo.get()

    // Check monthly limit
    if (config.monthlyLimit) {
      const newTotal = currentStatus.totalSpent.amount + amount.amount
      if (newTotal > config.monthlyLimit.amount) {
        return {
          willExceed: true,
          reason: `Would exceed monthly budget of ${config.monthlyLimit.currency}${config.monthlyLimit.amount.toFixed(2)}`,
        }
      }
    }

    // Check category limit
    if (categoryId) {
      const categoryLimit = config.perCategoryLimits?.[categoryId]
      if (categoryLimit) {
        const categoryStatus = currentStatus.categoryStatus.find((cs) => cs.categoryId === categoryId)
        const currentSpent = categoryStatus?.spent.amount || 0
        const newSpent = currentSpent + amount.amount

        if (newSpent > categoryLimit.amount) {
          return {
            willExceed: true,
            reason: `Would exceed ${categoryStatus?.categoryName || 'category'} budget of ${categoryLimit.currency}${categoryLimit.amount.toFixed(2)}`,
          }
        }
      }
    }

    return { willExceed: false }
  }

  async getYearlySpending(year: number): Promise<{ month: string; total: number }[]> {
    const results = []

    for (let month = 1; month <= 12; month++) {
      const monthISO = `${year}-${String(month).padStart(2, '0')}`
      const status = await this.evaluateMonth(monthISO)
      results.push({
        month: monthISO,
        total: status.totalSpent.amount,
      })
    }

    return results
  }
}

export const budgetService = new BudgetService()

import type { ID, Category, Transaction } from '../models'
import { repoFactory } from '@/data/repo/RepoFactory'

/**
 * Categorisation precedence:
 * 1. Transaction-specific override
 * 2. Merchant-specific rule
 * 3. Keyword match
 * 4. Default "Uncategorised"
 */
export class CategorisationService {
  private categoriesRepo = repoFactory.getCategoriesRepo()
  private merchantRulesRepo = repoFactory.getMerchantRulesRepo()
  private transactionsRepo = repoFactory.getTransactionsRepo()

  async categoriseTransaction(transaction: Transaction): Promise<Category> {
    // 1. Check for transaction-specific override
    if (transaction.categoryId) {
      const category = await this.categoriesRepo.get(transaction.categoryId)
      if (category) return category
    }

    // 2. Check merchant rules
    const merchantCategory = await this.categoriesRepo.resolveForMerchant(transaction.merchantName)
    if (merchantCategory) {
      return merchantCategory
    }

    // 3. Return uncategorised
    return await this.getUncategorisedCategory()
  }

  async overrideTransactionCategory(transactionId: ID, categoryId: ID): Promise<void> {
    await this.categoriesRepo.overrideForTransaction(transactionId, categoryId)
  }

  async bulkCategorise(transactions: Transaction[]): Promise<Map<ID, Category>> {
    const result = new Map<ID, Category>()

    for (const tx of transactions) {
      const category = await this.categoriseTransaction(tx)
      result.set(tx.id, category)
    }

    return result
  }

  async addMerchantRule(merchantPattern: string, categoryId: ID): Promise<void> {
    const existingRules = await this.merchantRulesRepo.list()
    const maxPriority = Math.max(...existingRules.map((r) => r.priority), 0)

    await this.merchantRulesRepo.upsert({
      id: crypto.randomUUID(),
      merchantPattern,
      categoryId,
      priority: maxPriority + 1,
    })
  }

  private async getUncategorisedCategory(): Promise<Category> {
    const categories = await this.categoriesRepo.list()
    const uncategorised = categories.find((c) => c.name === 'Uncategorised')

    if (uncategorised) return uncategorised

    // Create it if it doesn't exist
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name: 'Uncategorised',
      colour: '#9E9E9E',
    }
    await this.categoriesRepo.upsert(newCategory)
    return newCategory
  }

  async recategoriseAll(): Promise<void> {
    const transactions = await this.transactionsRepo.list()

    for (const tx of transactions) {
      const category = await this.categoriseTransaction(tx)
      tx.categoryId = category.id
      await this.transactionsRepo.upsert(tx)
    }
  }
}

export const categorisationService = new CategorisationService()

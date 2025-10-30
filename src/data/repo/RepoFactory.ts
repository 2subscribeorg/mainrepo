import type { ISubscriptionsRepo } from './interfaces/ISubscriptionsRepo'
import type { ITransactionsRepo } from './interfaces/ITransactionsRepo'
import type { ICategoriesRepo } from './interfaces/ICategoriesRepo'
import type { IBudgetsRepo } from './interfaces/IBudgetsRepo'
import type { IMerchantRulesRepo } from './interfaces/IMerchantRulesRepo'

import { MockSubscriptionsRepo } from './mock/MockSubscriptionsRepo'
import { MockTransactionsRepo } from './mock/MockTransactionsRepo'
import { MockCategoriesRepo } from './mock/MockCategoriesRepo'
import { MockBudgetsRepo } from './mock/MockBudgetsRepo'
import { MockMerchantRulesRepo } from './mock/MockMerchantRulesRepo'

type DataBackend = 'MOCK' | 'FIREBASE'

class RepoFactory {
  private backend: DataBackend

  constructor() {
    this.backend = (import.meta.env.VITE_DATA_BACKEND as DataBackend) || 'MOCK'
  }

  getBackend(): DataBackend {
    return this.backend
  }

  getSubscriptionsRepo(): ISubscriptionsRepo {
    return new MockSubscriptionsRepo()
  }

  getTransactionsRepo(): ITransactionsRepo {
    return new MockTransactionsRepo()
  }

  getCategoriesRepo(): ICategoriesRepo {
    return new MockCategoriesRepo()
  }

  getBudgetsRepo(): IBudgetsRepo {
    return new MockBudgetsRepo()
  }

  getMerchantRulesRepo(): IMerchantRulesRepo {
    return new MockMerchantRulesRepo()
  }
}

export const repoFactory = new RepoFactory()

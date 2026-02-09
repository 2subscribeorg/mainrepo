import type { ISubscriptionsRepo } from './interfaces/ISubscriptionsRepo'
import type { ITransactionsRepo } from './interfaces/ITransactionsRepo'
import type { ICategoriesRepo } from './interfaces/ICategoriesRepo'
import type { IMerchantRulesRepo } from './interfaces/IMerchantRulesRepo'
import type { IBankAccountsRepo } from './interfaces/IBankAccountsRepo'
import type { IBankTransactionsRepo } from './interfaces/IBankTransactionsRepo'

// Mock implementations
import { MockSubscriptionsRepo } from './mock/MockSubscriptionsRepo'
import { MockTransactionsRepo } from './mock/MockTransactionsRepo'
import { MockCategoriesRepo } from './mock/MockCategoriesRepo'
import { MockMerchantRulesRepo } from './mock/MockMerchantRulesRepo'
import { MockBankAccountsRepo } from './mock/MockBankAccountsRepo'
import { MockBankTransactionsRepo } from './mock/MockBankTransactionsRepo'

// Firebase implementations
import { FirebaseSubscriptionsRepo } from './firebase/FirebaseSubscriptionsRepo'
import { FirebaseCategoriesRepo } from './firebase/FirebaseCategoriesRepo'
import { FirebaseTransactionsRepo } from './firebase/FirebaseTransactionsRepo'
import { FirebaseMerchantRulesRepo } from './firebase/FirebaseMerchantRulesRepo'
import { FirebaseBankAccountsRepo } from './firebase/FirebaseBankAccountsRepo'
import { FirebaseBankAccountsRepoWithBackend } from './firebase/FirebaseBankAccountsRepoWithBackend'

type DataBackend = 'MOCK' | 'FIREBASE'

class RepoFactory {
  private backend: DataBackend

  constructor() {
    this.backend = (import.meta.env.VITE_DATA_BACKEND as DataBackend) || 'MOCK'
    console.log(`📦 Repository Factory initialized with backend: ${this.backend}`)
  }

  getBackend(): DataBackend {
    return this.backend
  }

  getSubscriptionsRepo(): ISubscriptionsRepo {
    if (this.backend === 'FIREBASE') {
      return new FirebaseSubscriptionsRepo()
    }
    return new MockSubscriptionsRepo()
  }

  getTransactionsRepo(): ITransactionsRepo {
    if (this.backend === 'FIREBASE') {
      return new FirebaseTransactionsRepo()
    }
    return new MockTransactionsRepo()
  }

  getCategoriesRepo(): ICategoriesRepo {
    if (this.backend === 'FIREBASE') {
      return new FirebaseCategoriesRepo()
    }
    return new MockCategoriesRepo()
  }


  getMerchantRulesRepo(): IMerchantRulesRepo {
    if (this.backend === 'FIREBASE') {
      return new FirebaseMerchantRulesRepo()
    }
    return new MockMerchantRulesRepo()
  }

  getBankAccountsRepo(): IBankAccountsRepo {
    if (this.backend === 'FIREBASE') {
      // Use backend-enabled repo if VITE_USE_PLAID_BACKEND is true
      const usePlaidBackend = import.meta.env.VITE_USE_PLAID_BACKEND === 'true'
      console.log('🔧 VITE_USE_PLAID_BACKEND:', import.meta.env.VITE_USE_PLAID_BACKEND)
      console.log('🔧 usePlaidBackend:', usePlaidBackend)
      if (usePlaidBackend) {
        console.log('🔧 Using FirebaseBankAccountsRepoWithBackend')
        return new FirebaseBankAccountsRepoWithBackend()
      }
      console.log('🔧 Using FirebaseBankAccountsRepo')
      return new FirebaseBankAccountsRepo()
    }
    console.log('🔧 Using MockBankAccountsRepo')
    return new MockBankAccountsRepo()
  }

  getBankTransactionsRepo(): IBankTransactionsRepo {
    // Bank transactions always use mock for now
    // Will add PlaidBankTransactionsRepo in Phase 2
    return new MockBankTransactionsRepo()
  }
}

export const repoFactory = new RepoFactory()

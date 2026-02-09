import type { Transaction, Subscription } from '@/domain/models'

export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingSubscription?: Subscription
  existingTransactions?: Transaction[]
  merchantName: string
  normalizedMerchant: string
}

export interface DuplicateCheckOptions {
  checkActiveOnly?: boolean
  amountTolerance?: number // Percentage tolerance for amount matching
}

/**
 * Service to check for duplicate subscriptions before marking transactions
 * Uses same normalization logic as SubscriptionMatcher for consistency
 */
export class DuplicateSubscriptionChecker {
  private readonly defaultOptions: Required<DuplicateCheckOptions> = {
    checkActiveOnly: true,
    amountTolerance: 0.15 // 15% tolerance
  }

  /**
   * Normalize merchant name using same logic as SubscriptionMatcher
   */
  private normalizeMerchant(merchantName: string): string {
    return merchantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '')
      .replace(/^(www|http|https)/, '')
      .substring(0, 20)
  }

  /**
   * Check if marking this transaction as a subscription would create a duplicate
   */
  checkForDuplicates(
    transaction: Transaction,
    existingSubscriptions: Subscription[],
    existingTransactions: Transaction[],
    options: DuplicateCheckOptions = {}
  ): DuplicateCheckResult {
    const opts = { ...this.defaultOptions, ...options }
    const normalizedMerchant = this.normalizeMerchant(transaction.merchantName)

    // Check for existing subscription with same merchant
    const matchingSubscription = this.findMatchingSubscription(
      transaction,
      existingSubscriptions,
      normalizedMerchant,
      opts
    )

    // Check for other transactions already marked as subscriptions from same merchant
    const matchingTransactions = this.findMatchingTransactions(
      transaction,
      existingTransactions,
      normalizedMerchant
    )

    const isDuplicate = !!matchingSubscription || matchingTransactions.length > 0

    return {
      isDuplicate,
      existingSubscription: matchingSubscription,
      existingTransactions: matchingTransactions,
      merchantName: transaction.merchantName,
      normalizedMerchant
    }
  }

  /**
   * Find existing subscription that matches the transaction
   */
  private findMatchingSubscription(
    transaction: Transaction,
    subscriptions: Subscription[],
    normalizedMerchant: string,
    options: Required<DuplicateCheckOptions>
  ): Subscription | undefined {
    return subscriptions.find(sub => {
      // Skip cancelled subscriptions if checkActiveOnly is true
      if (options.checkActiveOnly && sub.status === 'cancelled') {
        return false
      }

      // Match by normalized merchant name
      const subNormalizedMerchant = this.normalizeMerchant(sub.merchantName)
      if (subNormalizedMerchant !== normalizedMerchant) {
        return false
      }

      // Optional: Match by amount within tolerance
      if (transaction.amount && sub.amount) {
        const txAmount = Math.abs(transaction.amount.amount)
        const subAmount = Math.abs(sub.amount.amount)
        const amountDiff = Math.abs(txAmount - subAmount)
        const tolerance = subAmount * options.amountTolerance
        
        // If amounts are significantly different, might be different subscription
        if (amountDiff > tolerance) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Find other transactions from same merchant already marked as subscriptions
   */
  private findMatchingTransactions(
    transaction: Transaction,
    transactions: Transaction[],
    normalizedMerchant: string
  ): Transaction[] {
    return transactions.filter(tx => {
      // Skip the current transaction
      if (tx.id === transaction.id) return false
      
      // Only check transactions already marked as subscriptions
      if (!tx.subscriptionId) return false

      // Match by normalized merchant name
      const txNormalizedMerchant = this.normalizeMerchant(tx.merchantName)
      return txNormalizedMerchant === normalizedMerchant
    })
  }

  /**
   * Generate user-friendly message for duplicate warning
   */
  generateWarningMessage(result: DuplicateCheckResult): string {
    if (!result.isDuplicate) return ''

    const merchantName = result.merchantName

    if (result.existingSubscription) {
      return `You already have an active subscription for "${merchantName}". Adding this transaction would create a duplicate.`
    }

    if (result.existingTransactions && result.existingTransactions.length > 0) {
      const count = result.existingTransactions.length
      const plural = count === 1 ? 'transaction' : 'transactions'
      return `You have ${count} other ${plural} from "${merchantName}" already marked as subscriptions.`
    }

    return `Potential duplicate subscription detected for "${merchantName}".`
  }
}

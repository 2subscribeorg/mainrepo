import { ref } from 'vue'
import type { CustomerInfo, Entitlement } from '@/types/billing'

const STORAGE_KEY = 'mock_revenuecat_customer'

/**
 * Mock RevenueCat service that simulates the @revenuecat/purchases-js SDK
 */
class MockRevenueCatService {
  private _customerInfo = ref<CustomerInfo | null>(null)

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Reactive customer info that components can watch
   */
  get customerInfo() {
    return this._customerInfo
  }

  /**
   * Initialize the service (simulates Purchases.configure)
   */
  async configure(userId: string): Promise<void> {
    if (!this._customerInfo.value || this._customerInfo.value.userId !== userId) {
      this._customerInfo.value = this.createDefaultCustomerInfo(userId)
      this.saveToStorage()
    }
  }

  /**
   * Get current customer info (simulates Purchases.getCustomerInfo)
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    if (!this._customerInfo.value) {
      throw new Error('RevenueCat not configured. Call configure() first.')
    }
    return this._customerInfo.value
  }

  /**
   * Grant pro access (called when Paddle purchase succeeds)
   */
  async grantProAccess(transactionId: string): Promise<void> {
    if (!this._customerInfo.value) {
      throw new Error('RevenueCat not configured')
    }

    const now = new Date()
    const expirationDate = new Date()
    expirationDate.setFullYear(expirationDate.getFullYear() + 1) // 1 year from now

    const entitlement: Entitlement = {
      identifier: 'pro_access',
      isActive: true,
      willRenew: true,
      periodType: 'normal',
      latestPurchaseDate: now.toISOString(),
      originalPurchaseDate: now.toISOString(),
      expirationDate: expirationDate.toISOString(),
      store: 'stripe', // Using stripe as the store since we're mocking Paddle
      productIdentifier: 'pro_monthly',
      isSandbox: true
    }

    this._customerInfo.value.entitlements.active['pro_access'] = entitlement
    this._customerInfo.value.activeSubscriptions = ['pro_monthly']
    this._customerInfo.value.allPurchaseDates['pro_monthly'] = now.toISOString()
    this._customerInfo.value.latestExpirationDate = expirationDate.toISOString()
    this._customerInfo.value.originalPurchaseDate = now.toISOString()

    this.saveToStorage()
    console.log('✅ Mock RevenueCat: Granted pro access with transaction', transactionId)
  }

  /**
   * Revoke pro access (for testing)
   */
  async revokeProAccess(): Promise<void> {
    if (!this._customerInfo.value) {
      return
    }

    delete this._customerInfo.value.entitlements.active['pro_access']
    this._customerInfo.value.activeSubscriptions = []
    this._customerInfo.value.latestExpirationDate = null

    this.saveToStorage()
    console.log('✅ Mock RevenueCat: Revoked pro access')
  }

  /**
   * Check if user has pro access
   */
  hasProAccess(): boolean {
    return this._customerInfo.value?.entitlements.active['pro_access']?.isActive ?? false
  }

  private createDefaultCustomerInfo(userId: string): CustomerInfo {
    return {
      userId,
      entitlements: {
        active: {}
      },
      activeSubscriptions: [],
      allPurchaseDates: {},
      latestExpirationDate: null,
      originalPurchaseDate: null
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this._customerInfo.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load RevenueCat data from storage:', error)
    }
  }

  private saveToStorage(): void {
    try {
      if (this._customerInfo.value) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._customerInfo.value))
      }
    } catch (error) {
      console.error('Failed to save RevenueCat data to storage:', error)
    }
  }
}

// Export singleton instance
export const mockRevenueCat = new MockRevenueCatService()

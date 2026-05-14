import { ref } from 'vue'
import type { CustomerInfo, Entitlement } from '@/types/billing'
import { LOG_LEVEL, MakePurchaseResult, Purchases } from '@revenuecat/purchases-capacitor'
import { Browser } from '@capacitor/browser'

const STORAGE_KEY = 'mock_revenuecat_customer'
const ENTITLEMENT_ID = '2Subscribe Pro'
const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY

/**
 * Mock RevenueCat service that simulates the @revenuecat/purchases-js SDK
 */
class MockRevenueCatService {
  private _customerInfo = ref<CustomerInfo | null>(null)
  private _cancel = false

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
   * Initialize the service
   */
  async configure(userId: string): Promise<void> {
    try {
      if (!apiKey || this._cancel) {
        console.error(
          'RevenueCat API key is missing! Please set VITE_REVENUECAT_API_KEY in your .env file.'
        )
        return
      }

      await Purchases.configure({
        apiKey,
        appUserID: userId
      })

      const rcCustomerInfo = await Purchases.getCustomerInfo()
      if (!rcCustomerInfo) {
        throw new Error('User ID mismatch')
      }

      this._customerInfo.value = {
        userId: rcCustomerInfo.customerInfo.originalAppUserId,
        entitlements: rcCustomerInfo.customerInfo.entitlements,
        activeSubscriptions: rcCustomerInfo.customerInfo.activeSubscriptions,
        allPurchaseDates: rcCustomerInfo.customerInfo.allPurchaseDates,
        latestExpirationDate: rcCustomerInfo.customerInfo.latestExpirationDate,
        originalPurchaseDate: rcCustomerInfo.customerInfo.originalPurchaseDate,
        managementURL: rcCustomerInfo.customerInfo.managementURL,
      }
      this.saveToStorage()
    } catch (error) {
      console.error('RevenueCat configuration error:', error)
    }
  }

  async refreshSubscriptionStatus(): Promise<void> {
    // const rcCustomerInfo = await Purchases.getCustomerInfo()

    // this._customerInfo.value = {
    //   userId: rcCustomerInfo.customerInfo.originalAppUserId,
    //   entitlements: rcCustomerInfo.customerInfo.entitlements,
    //   activeSubscriptions: rcCustomerInfo.customerInfo.activeSubscriptions,
    //   allPurchaseDates: rcCustomerInfo.customerInfo.allPurchaseDates,
    //   latestExpirationDate: rcCustomerInfo.customerInfo.latestExpirationDate,
    //   originalPurchaseDate: rcCustomerInfo.customerInfo.originalPurchaseDate,
    //   managementURL: rcCustomerInfo.customerInfo.managementURL,
    // }

    // this.saveToStorage()
  }

  /**
   * Get current customer info (simulates Purchases.getCustomerInfo)
   */
  async getCustomerInfo() {
    if (!this._customerInfo.value) {
      throw new Error('RevenueCat not configured. Call configure() first.')
    }
    return this._customerInfo.value
  }

  async purchase(selectedPackage: any): Promise<boolean> {
    if (!this._customerInfo.value) {
      throw new Error('RevenueCat not configured')
    }

    const response =  await Purchases.purchasePackage({
      aPackage: selectedPackage,
    })
    if (!response || !response.customerInfo) {
      return false
    }

    this._customerInfo.value = {
      userId: response.customerInfo.originalAppUserId,
      entitlements: response.customerInfo.entitlements,
      activeSubscriptions: response.customerInfo.activeSubscriptions,
      allPurchaseDates: response.customerInfo.allPurchaseDates,
      latestExpirationDate: response.customerInfo.latestExpirationDate,
      originalPurchaseDate: response.customerInfo.originalPurchaseDate,
      managementURL: response.customerInfo.managementURL,
    }
    console.log(this._customerInfo.value)
    this.saveToStorage()
    this._cancel = false

    return true
  }

  /**
   * Revoke pro access (for testing)
   */
  async revokeProAccess(): Promise<void> {
    const managementURL =
      this._customerInfo.value?.entitlements.active[ENTITLEMENT_ID]?.managementURL

    if (managementURL) {
      await Browser.open({ url: managementURL })
    } else {
      const info = this._customerInfo.value
      if (!info) {
        return
      }

      const entitlement = info.entitlements.active?.[ENTITLEMENT_ID]

      this._customerInfo.value = {
        ...info,
        entitlements: {
          ...info.entitlements,
          active: {
            ...info.entitlements.active,
            [ENTITLEMENT_ID]: {
              ...entitlement,
              willRenew: false,
              isActive: false,
              unsubscribeDetectedAt: new Date().toISOString(),
              unsubscribeDetectedAtMillis: Date.now(),
            },
          },
        },
      }
    }
    this._cancel = true
    this.saveToStorage()
  }

  /**
   * Check if user has pro access
   */
  hasProAccess(): boolean {
    console.log('Checking pro access for user:', this._customerInfo.value)
    console.log(this._customerInfo.value?.entitlements.active[ENTITLEMENT_ID]?.isActive)
    return this._customerInfo.value?.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this._customerInfo.value = JSON.parse(stored)
      }
    } catch (error) {
      // Failed to load RevenueCat data from storage
    }
  }

  private saveToStorage(): void {
    try {
      if (this._customerInfo.value) {
        console.log(JSON.stringify(this._customerInfo.value.entitlements.active))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._customerInfo.value))
      }
    } catch (error) {
      // Failed to save RevenueCat data to storage
    }
  }
}

// Export singleton instance
export const mockRevenueCat = new MockRevenueCatService()

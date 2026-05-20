import { ref } from 'vue'
import type { CustomerInfo, Entitlement } from '@/types/billing'
import { LOG_LEVEL, MakePurchaseResult, Purchases } from '@revenuecat/purchases-capacitor'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { getFirebaseAuth } from '@/config/firebase'

const STORAGE_KEY = 'mock_revenuecat_customer'
const ENTITLEMENT_ID = '2Subscribe Pro'
const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY
const baseUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3002/api'
const PLAN_PRICES: Record<string, number> = { '$rc_monthly': 5, '$rc_annual': 50 }

export interface PurchaseTransaction {
  id: string
  productId: string
  amount: number
  currency: string
  type: 'purchase' | 'refund' | 'subscription' | 'renewal'
  status: 'completed' | 'failed' | 'pending'
  timestamp: string
  autoRenews: boolean
}

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
    const rcCustomerInfo = await Purchases.getCustomerInfo()
    if (!rcCustomerInfo?.customerInfo) return

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
    await this.recordPurchase(selectedPackage.product.identifier, this._customerInfo.value!)

    this.saveToStorage()
    this._cancel = false
    return true
  }

  private async recordPurchase(productId: string, customerInfo: CustomerInfo): Promise<void> {
    const rawPlatform = Capacitor.getPlatform()
    const platform = (rawPlatform === 'ios' || rawPlatform === 'android') ? rawPlatform : 'web'

    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')

    await fetch(`${baseUrl}/purchases/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ productId, platform, customerInfo }),
    })
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

  async fetchTransactionHistory(): Promise<PurchaseTransaction[]> {
    const rcCustomerInfo = await Purchases.getCustomerInfo()
    if (!rcCustomerInfo?.customerInfo) return []

    const { allPurchaseDates, allExpirationDates, activeSubscriptions, entitlements, nonSubscriptionTransactions } = rcCustomerInfo.customerInfo
    const willRenew = entitlements.active[ENTITLEMENT_ID]?.willRenew ?? false
    const transactions: PurchaseTransaction[] = []

    for (const [productId, purchaseDate] of Object.entries(allPurchaseDates)) {
      if (!purchaseDate) continue
      const expiresDate = allExpirationDates?.[productId]
      const isActive = activeSubscriptions.includes(productId)
      const isExpired = expiresDate ? new Date(expiresDate) < new Date() : false

      transactions.push({
        id: `${productId}_${purchaseDate}`,
        productId,
        amount: PLAN_PRICES[productId] ?? 0,
        currency: 'GBP',
        type: isActive ? 'subscription' : isExpired ? 'renewal' : 'purchase',
        status: 'completed',
        timestamp: purchaseDate,
        autoRenews: isActive ? willRenew : false,
      })
    }

    for (const t of nonSubscriptionTransactions ?? []) {
      transactions.push({
        id: t.transactionIdentifier,
        productId: t.productIdentifier,
        amount: PLAN_PRICES[t.productIdentifier] ?? 0,
        currency: 'GBP',
        type: 'purchase',
        status: 'completed',
        timestamp: t.purchaseDate,
        autoRenews: false,
      })
    }

    return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  private saveToStorage(): void {
    try {
      if (this._customerInfo.value) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._customerInfo.value))
      }
    } catch (error) {
      // Failed to save RevenueCat data to storage
    }
  }
}

export const revenueCat = new MockRevenueCatService()

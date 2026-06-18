import { ref } from 'vue'
import type { CustomerInfo } from '@/types/billing'
import { PACKAGE_TYPE, Purchases } from '@revenuecat/purchases-capacitor'
import type { PurchasePackageOptions } from '@revenuecat/purchases-capacitor'
import type { PurchasesPackage } from '@revenuecat/purchases-typescript-internal-esm'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

const STORAGE_KEY = 'revenuecat_customer'
const ENTITLEMENT_ID = '2Subscribe Pro'
const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY

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

function mapCustomerInfo(rc: Awaited<ReturnType<typeof Purchases.getCustomerInfo>>['customerInfo']): CustomerInfo {
  return {
    userId: rc.originalAppUserId,
    entitlements: rc.entitlements,
    activeSubscriptions: rc.activeSubscriptions,
    allPurchaseDates: rc.allPurchaseDates,
    latestExpirationDate: rc.latestExpirationDate,
    originalPurchaseDate: rc.originalPurchaseDate,
    managementURL: rc.managementURL,
  }
}

function isSubscriptionPackage(pkg: PurchasesPackage): boolean {
  return pkg.packageType !== PACKAGE_TYPE.LIFETIME
}

function isActiveSubscriptionProduct(info: CustomerInfo | null, productId?: string): boolean {
  if (!info || !productId) return false
  return info.activeSubscriptions.includes(productId)
}

class RevenueCatService {
  private _customerInfo = ref<CustomerInfo | null>(null)
  private configuredUserId: string | null = null

  constructor() {
    this.loadFromStorage()
  }

  get customerInfo() {
    return this._customerInfo
  }

  async configure(userId: string): Promise<void> {
    if (!apiKey) {
      console.error('VITE_REVENUECAT_API_KEY is not set')
      return
    }

    try {
      const { isConfigured } = await Purchases.isConfigured().catch(() => ({ isConfigured: false }))
      let customerInfo

      if (isConfigured) {
        if (this.configuredUserId !== userId) {
          ;({ customerInfo } = await Purchases.logIn({ appUserID: userId }))
        } else {
          ;({ customerInfo } = await Purchases.getCustomerInfo())
        }
      } else {
        await Purchases.configure({ apiKey, appUserID: userId })
        ;({ customerInfo } = await Purchases.getCustomerInfo())
      }

      this.configuredUserId = userId
      this._customerInfo.value = mapCustomerInfo(customerInfo)
      this.saveToStorage()
    } catch (error: unknown) {
      console.error('RevenueCat configuration error:', error)
    }
  }

  async logOut(): Promise<void> {
    try {
      const { isConfigured } = await Purchases.isConfigured()
      if (isConfigured) {
        await Purchases.logOut()
      }
    } catch {
      // RC may be unavailable on web or before configuration.
    } finally {
      this.configuredUserId = null
      this._customerInfo.value = null
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  async refreshSubscriptionStatus(): Promise<void> {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo()
      if (!customerInfo) return
      this._customerInfo.value = mapCustomerInfo(customerInfo)
      this.saveToStorage()
    } catch {
      // RC unavailable — keep existing cached state
    }
  }

  async purchase(selectedPackage: PurchasesPackage, currentProductId?: string): Promise<boolean> {
    if (!this._customerInfo.value) {
      throw new Error('RevenueCat not configured')
    }

    const options: PurchasePackageOptions = { aPackage: selectedPackage }
    const activeCurrentProductId = isActiveSubscriptionProduct(this._customerInfo.value, currentProductId)
      ? currentProductId
      : undefined
    const shouldSendUpgradeInfo = Boolean(
      activeCurrentProductId
      && activeCurrentProductId !== selectedPackage.product.identifier
      && Capacitor.getPlatform() === 'android'
      && isSubscriptionPackage(selectedPackage)
    )

    if (shouldSendUpgradeInfo) {
      options.storeProductChangeInfo = { oldProductIdentifier: activeCurrentProductId }
    }

    const response = await Purchases.purchasePackage(options)
    if (!response?.customerInfo) return false

    this._customerInfo.value = mapCustomerInfo(response.customerInfo)
    this.saveToStorage()
    return true
  }

  async openSubscriptionManagement(): Promise<boolean> {
    const managementURL = this._customerInfo.value?.managementURL

    if (managementURL) {
      await Browser.open({ url: managementURL })
      return true
    }

    return false
  }

  async revokeProAccess(): Promise<void> {
    if (await this.openSubscriptionManagement()) return

    const info = this._customerInfo.value
    if (!info) return

  hasProAccess(): boolean {
    return this._customerInfo.value?.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false
  }

  async restorePurchases(): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.restorePurchases()
    this._customerInfo.value = mapCustomerInfo(customerInfo)
    this.saveToStorage()
    return this._customerInfo.value!
  }

  async fetchTransactionHistory(): Promise<PurchaseTransaction[]> {
    try {
      const [{ customerInfo }, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ])
      if (!customerInfo) return []

      const priceByProductId: Record<string, { amount: number; currency: string }> = {}
      for (const pkg of offerings?.current?.availablePackages ?? []) {
        priceByProductId[pkg.product.identifier] = {
          amount: pkg.product.price,
          currency: pkg.product.currencyCode,
        }
      }

      const { allPurchaseDates, allExpirationDates, activeSubscriptions, entitlements, nonSubscriptionTransactions } = customerInfo
      const willRenew = entitlements.active[ENTITLEMENT_ID]?.willRenew ?? false
      const transactions: PurchaseTransaction[] = []

      for (const [productId, purchaseDate] of Object.entries(allPurchaseDates)) {
        if (!purchaseDate) continue
        const expiresDate = allExpirationDates?.[productId]
        const isActive = activeSubscriptions.includes(productId)
        const isExpired = expiresDate ? new Date(expiresDate) < new Date() : false
        const pricing = priceByProductId[productId]

        transactions.push({
          id: `${productId}_${purchaseDate}`,
          productId,
          amount: pricing?.amount ?? 0,
          currency: pricing?.currency ?? 'GBP',
          type: isActive ? 'subscription' : isExpired ? 'renewal' : 'purchase',
          status: 'completed',
          timestamp: purchaseDate,
          autoRenews: isActive ? willRenew : false,
        })
      }

      for (const t of nonSubscriptionTransactions ?? []) {
        const pricing = priceByProductId[t.productIdentifier]
        transactions.push({
          id: t.transactionIdentifier,
          productId: t.productIdentifier,
          amount: pricing?.amount ?? 0,
          currency: pricing?.currency ?? 'GBP',
          type: 'purchase',
          status: 'completed',
          timestamp: t.purchaseDate,
          autoRenews: false,
        })
      }

      return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch {
    return []
    }
  }

  async restorePurchases(): Promise<CustomerInfo | null> {
    const { customerInfo } = await Purchases.restorePurchases()
    this._customerInfo.value = mapCustomerInfo(customerInfo)
    this.saveToStorage()
    return this._customerInfo.value
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) this._customerInfo.value = JSON.parse(stored)
    } catch {
      // Corrupt storage — start fresh
    }
  }

  private saveToStorage(): void {
    try {
      if (this._customerInfo.value) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._customerInfo.value))
      }
    } catch {
      // Storage unavailable — in-memory only
    }
  }
}

export const revenueCat = new RevenueCatService()

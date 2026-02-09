/**
 * Billing system types for Paddle + RevenueCat integration
 */

export interface PricingPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  paddlePriceId: string
}

export interface CustomerInfo {
  userId: string
  entitlements: {
    active: {
      [key: string]: Entitlement
    }
  }
  activeSubscriptions: string[]
  allPurchaseDates: { [key: string]: string }
  latestExpirationDate: string | null
  originalPurchaseDate: string | null
}

export interface Entitlement {
  identifier: string
  isActive: boolean
  willRenew: boolean
  periodType: 'normal' | 'trial' | 'intro'
  latestPurchaseDate: string
  originalPurchaseDate: string
  expirationDate: string | null
  store: 'app_store' | 'play_store' | 'stripe' | 'promotional'
  productIdentifier: string
  isSandbox: boolean
}

export interface PurchaseResult {
  success: boolean
  transactionId?: string
  error?: string
}

export interface CheckoutOptions {
  priceId: string
  customData?: Record<string, any>
}

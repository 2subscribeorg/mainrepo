import { computed, ref } from 'vue'
import { revenueCat } from './revenueCat'
import type { PricingPlan, PurchaseResult, CustomerInfo } from '@/types/billing'
import { Purchases, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor'
import type { PurchasesPackage } from '@revenuecat/purchases-typescript-internal-esm'
import { Capacitor } from '@capacitor/core'
import { getFirebaseAuth } from '@/config/firebase'

const baseUrl = import.meta.env.VITE_BACKEND_API_URL

const ACTIVE_PLAN_KEY = 'billing_active_plan_id'
const ENTITLEMENT_ID = '2Subscribe Pro'

const FREE_PLAN: PricingPlan = {
  id: 'free',
  name: 'Free',
  price: 0,
  currency: 'GBP',
  interval: 'month',
  features: ['Up to 5 subscriptions', 'Basic categorization', 'Manual transaction entry'],
}

const PLAN_FEATURES: Record<string, string[]> = {
  '$rc_monthly': [
    'Unlimited subscriptions',
    'Advanced categorization',
    'Automatic sync',
    'Budget tracking',
    'Email notifications',
    'Priority support',
  ],
  '$rc_annual': [
    'Unlimited subscriptions',
    'Advanced categorization',
    'Automatic sync',
    'Budget tracking',
    'Email notifications',
    'Priority support',
    '2 months free (vs monthly)',
  ],
  '$rc_lifetime': [
    'Unlimited subscriptions',
    'Advanced categorization',
    'Automatic sync',
    'Budget tracking',
    'Email notifications',
    'Priority support',
    'Lifetime access — pay once',
  ],
}

function intervalFromPackageType(packageType: PACKAGE_TYPE): PricingPlan['interval'] {
  switch (packageType) {
    case PACKAGE_TYPE.ANNUAL: return 'year'
    case PACKAGE_TYPE.LIFETIME: return 'lifetime'
    default: return 'month'
  }
}

function packageToPlan(pkg: PurchasesPackage): PricingPlan {
  return {
    id: pkg.identifier,
    name: pkg.product.title,
    price: pkg.product.price,
    currency: pkg.product.currencyCode,
    interval: intervalFromPackageType(pkg.packageType),
    features: PLAN_FEATURES[pkg.identifier] ?? [],
  }
}

class BillingService {
  private initialized = false
  private _activePlanId = ref<string | null>(localStorage.getItem(ACTIVE_PLAN_KEY))
  private _plans = ref<PricingPlan[]>([FREE_PLAN])

  get activePlanId() {
    return this._activePlanId
  }

  get activePlan() {
    return computed(() => this._plans.value.find(p => p.id === this._activePlanId.value) ?? null)
  }

  get isProReactive() {
    return computed(() => revenueCat.hasProAccess())
  }

  get customerInfo() {
    return revenueCat.customerInfo
  }

  isPro(): boolean {
    return revenueCat.hasProAccess()
  }

  getPricingPlans(): PricingPlan[] {
    return this._plans.value
  }

  getPlan(planId: string): PricingPlan | undefined {
    return this._plans.value.find(p => p.id === planId)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return
    await Promise.all([this.loadOfferings(), this.syncActivePlanFromRC()])
    this.initialized = true
  }

  async purchase(planId: string): Promise<PurchaseResult> {
    const plan = this._plans.value.find(p => p.id === planId)
    if (!plan || plan.id === 'free') {
      return { success: false, error: plan ? 'Cannot purchase free plan' : 'Invalid plan ID' }
    }

    try {
      const offerings = await Purchases.getOfferings()
      const packages = offerings?.current?.availablePackages ?? []
      if (!packages.length) {
        return { success: false, error: 'No available packages found in RevenueCat.' }
      }

      const selectedPackage = packages.find(pkg => pkg.identifier === planId) ?? packages[0]
      const success = await revenueCat.purchase(selectedPackage)
      if (success) {
        this._activePlanId.value = planId
        localStorage.setItem(ACTIVE_PLAN_KEY, planId)
        const customerInfo = revenueCat.customerInfo.value
        if (customerInfo) this.recordPurchase(selectedPackage.product.identifier, customerInfo)
      }
      return { success }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'RevenueCat purchase failed'
      return { success: false, error: message }
    }
  }

  async restorePurchases(): Promise<{ hadPurchases: boolean }> {
    const customerInfo = await revenueCat.restorePurchases()
    const isActive = !!customerInfo.entitlements.active[ENTITLEMENT_ID]
    if (isActive) {
      await this.syncActivePlanFromRC()
    }
    return { hadPurchases: isActive }
  }

  async cancelSubscription(): Promise<void> {
    await revenueCat.revokeProAccess()
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

  private async loadOfferings(): Promise<void> {
    try {
      const offerings = await Purchases.getOfferings()
      const packages = offerings?.current?.availablePackages ?? []
      if (!packages.length) return

      const rcPlans = packages
        .map(packageToPlan)
        .sort((a, b) => a.price - b.price)

      this._plans.value = [FREE_PLAN, ...rcPlans]
    } catch {
      // RC unavailable (web/emulator) — plans stay as [FREE_PLAN]
    }
  }

  private async syncActivePlanFromRC(): Promise<void> {
    if (this._activePlanId.value) return

    const activeProductId = this.customerInfo.value
      ?.entitlements.active[ENTITLEMENT_ID]?.productIdentifier
    if (!activeProductId) return

    try {
      const offerings = await Purchases.getOfferings()
      const activePackage = offerings?.current?.availablePackages.find(
        p => p.product.identifier === activeProductId
      )
      if (activePackage) {
        this._activePlanId.value = activePackage.identifier
        localStorage.setItem(ACTIVE_PLAN_KEY, activePackage.identifier)
      }
    } catch {
      // offerings unavailable — activePlanId stays null
    }
  }
}

export const billingService = new BillingService()

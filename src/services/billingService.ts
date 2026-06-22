import { computed, ref } from 'vue'
import { revenueCat } from './revenueCat'
import type { PricingPlan, PurchaseResult, CustomerInfo } from '@/types/billing'
import { Purchases, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor'
import type { PurchasesPackage } from '@revenuecat/purchases-typescript-internal-esm'
import { Capacitor } from '@capacitor/core'
import { getFirebaseAuth } from '@/config/firebase'
import { buildBackendApiUrl } from '@/config/backendApi'

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

  constructor() {
    // When RevenueCat finishes configuring (after user login), reload offerings
    // so the subscription screen shows plans without needing a manual retry.
    revenueCat.onConfigured(() => {
      this.initialized = false
      this.initialize().catch(() => {})
    })
  }

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
    // Re-run if not yet initialized OR if we still only have the free plan
    // (means offerings failed on first call, e.g. RC not yet configured).
    if (this.initialized && this._plans.value.length > 1) return
    await Promise.all([this.loadOfferings(), this.syncActivePlanFromRC()])
    this.initialized = true
  }

  async refreshSubscriptionStatus(): Promise<void> {
    await revenueCat.refreshSubscriptionStatus()
    await this.syncActivePlanFromRC()
  }

  async purchase(planId: string): Promise<PurchaseResult> {
    const plan = this._plans.value.find(p => p.id === planId)
    if (!plan || plan.id === 'free') {
      return { success: false, error: plan ? 'Cannot purchase free plan' : 'Invalid plan ID' }
    }

    try {
      await revenueCat.refreshSubscriptionStatus()

      const offerings = await Purchases.getOfferings()
      const packages = offerings?.current?.availablePackages ?? []
      if (!packages.length) {
        return { success: false, error: 'No available packages found in RevenueCat.' }
      }

      const selectedPackage = packages.find(pkg => pkg.identifier === planId) ?? packages[0]
      const currentEntitlement = this.customerInfo.value?.entitlements.active[ENTITLEMENT_ID]
      const currentProductId = currentEntitlement?.isActive
        && currentEntitlement.productIdentifier
        && this.customerInfo.value?.activeSubscriptions.includes(currentEntitlement.productIdentifier)
        ? currentEntitlement.productIdentifier
        : undefined
      const success = await revenueCat.purchase(selectedPackage, currentProductId)
      if (success) {
        this._activePlanId.value = planId
        localStorage.setItem(ACTIVE_PLAN_KEY, planId)
        const customerInfo = revenueCat.customerInfo.value
        if (customerInfo) {
          await this.recordPurchase(selectedPackage.product.identifier, customerInfo).catch(() => {
            // Purchase succeeded; backend can reconcile from RevenueCat webhooks if configured.
          })
        }
      }
      return { success }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'RevenueCat purchase failed'
      return { success: false, error: message }
    }
  }

  async cancelSubscription(): Promise<{ openedManagement: boolean }> {
    const hasManagementUrl = !!revenueCat.customerInfo.value?.managementURL
    await revenueCat.revokeProAccess()

    if (!hasManagementUrl) {
      this._activePlanId.value = null
      localStorage.removeItem(ACTIVE_PLAN_KEY)
      await this.recordCancellation()
    }

    return { openedManagement: hasManagementUrl }
  }

  async openSubscriptionManagement(): Promise<boolean> {
    return revenueCat.openSubscriptionManagement()
  }

  async restorePurchases(): Promise<PurchaseResult> {
    try {
      const customerInfo = await revenueCat.restorePurchases()
      if (!customerInfo) return { success: false, error: 'No purchases found to restore' }
      await this.syncActivePlanFromRC()
      return { success: revenueCat.hasProAccess() }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to restore purchases'
      return { success: false, error: message }
    }
  }

  private async recordCancellation(): Promise<void> {
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')

    await fetch(buildBackendApiUrl('/purchases/cancel'), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
  }

  private async recordPurchase(productId: string, customerInfo: CustomerInfo): Promise<void> {
    const rawPlatform = Capacitor.getPlatform()
    const platform = (rawPlatform === 'ios' || rawPlatform === 'android') ? rawPlatform : 'web'

    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')

    await fetch(buildBackendApiUrl('/purchases/record'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ productId, platform, customerInfo }),
    })
  }

  private async loadOfferings(): Promise<void> {
    try {
      const { isConfigured } = await Purchases.isConfigured().catch(() => ({ isConfigured: false }))
      if (!isConfigured) {
        console.warn('[BillingService] RevenueCat not yet configured — skipping getOfferings. Will retry when subscription screen opens.')
        return
      }
      const offerings = await Purchases.getOfferings()
      const packages = offerings?.current?.availablePackages ?? []
      if (!packages.length) {
        console.warn('[BillingService] RevenueCat returned 0 packages. Check that a "Current" offering with packages is set in the RevenueCat dashboard.')
        return
      }
      const rcPlans = packages
        .map(packageToPlan)
        .sort((a, b) => a.price - b.price)
      this._plans.value = [FREE_PLAN, ...rcPlans]
      console.log('[BillingService] Loaded', rcPlans.length, 'plan(s) from RevenueCat:', rcPlans.map(p => p.id).join(', '))
    } catch (err) {
      console.warn('[BillingService] getOfferings failed:', err)
    }
  }

  private async syncActivePlanFromRC(): Promise<void> {
    const activeProductId = this.customerInfo.value
      ?.entitlements.active[ENTITLEMENT_ID]?.productIdentifier
    if (!activeProductId) {
      this._activePlanId.value = null
      localStorage.removeItem(ACTIVE_PLAN_KEY)
      return
    }

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

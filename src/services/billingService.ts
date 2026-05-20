import { computed, ref } from 'vue'
import { revenueCat } from './revenueCat'
import type { PricingPlan, PurchaseResult } from '@/types/billing'
import { Purchases } from '@revenuecat/purchases-capacitor'

const ACTIVE_PLAN_KEY = 'billing_active_plan_id'

class BillingService {
  private initialized = false
  private _activePlanId = ref<string | null>(localStorage.getItem(ACTIVE_PLAN_KEY))

  get activePlanId() {
    return this._activePlanId
  }

  get activePlan() {
    return computed(() => this.plans.find(p => p.id === this._activePlanId.value) ?? null)
  }

  /**
   * Available pricing plans
   */
  readonly plans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'GBP',
      interval: 'month',
      features: [
        'Up to 5 subscriptions',
        'Basic categorization',
        'Manual transaction entry'
      ],
      paddlePriceId: 'free'
    },
    {
      id: '$rc_monthly',
      name: 'Monthly Pro',
      price: 5,
      currency: 'GBP',
      interval: 'month',
      features: [
        'Unlimited subscriptions',
        'Advanced categorization',
        'Automatic sync',
        'Budget tracking',
        'Email notifications',
        'Priority support'
      ],
      paddlePriceId: 'pri_01jh8xm9k2n3p4q5r6s7t8u9v0'
    },
    {
      id: '$rc_annual',
      name: 'Annual Pro',
      price: 50,
      currency: 'GBP',
      interval: 'year',
      features: [
        'Unlimited subscriptions',
        'Advanced categorization',
        'Automatic sync',
        'Budget tracking',
        'Email notifications',
        'Priority support',
        '2 months free (vs monthly)'
      ],
      paddlePriceId: 'pri_01jh8xm9k2n3p4q5r6s7t8u9v1'
    }
  ]

  /**
   * Initialize the billing service
   */
  async initialize(userId: string): Promise<void> {
    if (this.initialized) return

    try {
      if(!this.customerInfo.value) {
        await Promise.all([
          //revenueCat.configure(userId)
        ])
      }
      await this.syncActivePlanFromRC()
      this.initialized = true
    } catch (error) {
      throw error
    }
  }

  private async syncActivePlanFromRC(): Promise<void> {
    if (this._activePlanId.value) return

    const customerInfo = this.customerInfo.value
    if (!customerInfo) return

    const activeProductId = customerInfo.entitlements.active['2Subscribe Pro']?.productIdentifier
    if (!activeProductId) return

    const offerings = await Purchases.getOfferings()
    const activePackage = offerings?.current?.availablePackages.find(
      p => p.product.identifier === activeProductId
    )
    if (activePackage) {
      this._activePlanId.value = activePackage.identifier
      localStorage.setItem(ACTIVE_PLAN_KEY, activePackage.identifier)
    }
  }

  /**
   * Check if user has pro access
   */
  isPro(): boolean {
    return revenueCat.hasProAccess()
  }

  /**
   * Reactive computed property for pro status
   */
  get isProReactive() {
    return computed(() => {
      return revenueCat.hasProAccess()
    })
  }

  /**
   * Get customer info reactively
   */
  get customerInfo() {
    return revenueCat.customerInfo
  }

  /**
   * Purchase a subscription plan
   */
  async purchase(planId: string): Promise<PurchaseResult> {
    const plan = this.plans.find(p => p.id === planId)
    if (!plan) {
      return {
        success: false,
        error: 'Invalid plan ID'
      }
    }

    if (plan.id === 'free') {
      return {
        success: false,
        error: 'Cannot purchase free plan'
      }
    }

    try {
      const offerings = await Purchases.getOfferings();
      if (!offerings.current || !offerings.current.availablePackages.length) {
        return {
          success: false,
          error: 'No available packages found in RevenueCat.'
        };
      }

      const selectedPackage = offerings.current.availablePackages.find(pkg => pkg.identifier === planId) || offerings.current.availablePackages[0];
      if (!selectedPackage) {
        return {
          success: false,
          error: 'No matching package found for planId.'
        };
      }

      const success = await revenueCat.purchase(selectedPackage)
      if (success) {
        this._activePlanId.value = planId
        localStorage.setItem(ACTIVE_PLAN_KEY, planId)
      }
      return { success }
    } catch (error: any) {
      console.error('RevenueCat purchase error:', error);
      return {
        success: false,
        error: error.message || 'RevenueCat purchase failed'
      };
    } 
  }

  /**
   * Cancel subscription (for testing)
   */
  async cancelSubscription(): Promise<void> {
    await revenueCat.revokeProAccess()
  }

  /**
   * Get pricing plans
   */
  getPricingPlans(): PricingPlan[] {
    return this.plans
  }

  /**
   * Get a specific plan by ID
   */
  getPlan(planId: string): PricingPlan | undefined {
    return this.plans.find(p => p.id === planId)
  }
}

// Export singleton instance
export const billingService = new BillingService()

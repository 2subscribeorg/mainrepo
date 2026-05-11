import { computed } from 'vue'
import { mockPaddle } from './mockPaddle'
import { mockRevenueCat } from './mockRevenueCat'
import type { PricingPlan, PurchaseResult } from '@/types/billing'
import { Purchases } from '@revenuecat/purchases-capacitor'

/**
 * Main billing service that wraps Paddle + RevenueCat integration
 * This is the only service Vue components should interact with
 */
class BillingService {
  private initialized = false

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
      // Initialize both Paddle and RevenueCat
      await Promise.all([
        mockPaddle.initialize(),
        mockRevenueCat.configure(userId)
      ])

      this.initialized = true
    } catch (error) {
      throw error
    }
  }

  /**
   * Check if user has pro access
   */
  isPro(): boolean {
    return mockRevenueCat.hasProAccess()
  }

  /**
   * Reactive computed property for pro status
   */
  get isProReactive() {
    return computed(() => {
      const customerInfo = mockRevenueCat.customerInfo.value
      return customerInfo?.entitlements.active['pro_access']?.isActive ?? false
    })
  }

  /**
   * Get customer info reactively
   */
  get customerInfo() {
    return mockRevenueCat.customerInfo
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
      // Find the package that matches the planId (if possible)
      const selectedPackage = offerings.current.availablePackages.find(pkg => pkg.identifier === planId) || offerings.current.availablePackages[0];
      if (!selectedPackage) {
        return {
          success: false,
          error: 'No matching package found for planId.'
        };
      }
      const purchaseResult = await Purchases.purchasePackage({
        aPackage: selectedPackage
      });

      const isPro = purchaseResult.customerInfo.entitlements.active['2Subscribe Pro']?.isActive;

      // If Paddle payment succeeded, grant access via RevenueCat
      if (isPro) {
        await mockRevenueCat.grantProAccess();
      }

      return {
        success: true,
        transactionId: purchaseResult.customerInfo.originalAppUserId
      };
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
    await mockRevenueCat.revokeProAccess()
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

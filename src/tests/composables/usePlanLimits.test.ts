import { describe, test, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { mockIsPro, mockIsProReactive } = vi.hoisted(() => ({
  mockIsPro: vi.fn().mockReturnValue(false),
  mockIsProReactive: { value: false },
}))

vi.mock('@/services/billingService', () => ({
  billingService: {
    isPro: mockIsPro,
    isProReactive: mockIsProReactive,
  },
}))

vi.mock('@/services/revenueCat', () => ({
  revenueCat: {
    hasProAccess: vi.fn().mockReturnValue(false),
  },
}))

import { usePlanLimits, FREE_SUBSCRIPTION_LIMIT, FREE_BANK_CONNECTION_LIMIT, PLAN_LIMIT_ERROR } from '@/composables/usePlanLimits'

describe('usePlanLimits', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockIsPro.mockReturnValue(false)
    mockIsProReactive.value = false
  })

  describe('constants', () => {
    test('exports correct free subscription limit', () => {
      expect(FREE_SUBSCRIPTION_LIMIT).toBe(5)
    })

    test('exports correct free bank connection limit', () => {
      expect(FREE_BANK_CONNECTION_LIMIT).toBe(1)
    })

    test('exports plan limit error string', () => {
      expect(PLAN_LIMIT_ERROR).toBe('PLAN_LIMIT_REACHED')
    })
  })

  describe('free user', () => {
    test('isPro is false', () => {
      const { isPro } = usePlanLimits()
      expect(isPro.value).toBe(false)
    })

    test('subscriptionLimit is 5', () => {
      const { subscriptionLimit } = usePlanLimits()
      expect(subscriptionLimit.value).toBe(5)
    })

    test('bankConnectionLimit is 1', () => {
      const { bankConnectionLimit } = usePlanLimits()
      expect(bankConnectionLimit.value).toBe(1)
    })

    test('canAddSubscription returns true when under limit', () => {
      const { canAddSubscription } = usePlanLimits()
      expect(canAddSubscription()).toBe(true)
    })

    test('canConnectBank returns true when under limit', () => {
      const { canConnectBank } = usePlanLimits()
      expect(canConnectBank()).toBe(true)
    })
  })

  describe('pro user', () => {
    beforeEach(() => {
      mockIsPro.mockReturnValue(true)
      mockIsProReactive.value = true
    })

    test('isPro is true', () => {
      const { isPro } = usePlanLimits()
      expect(isPro.value).toBe(true)
    })

    test('subscriptionLimit is Infinity', () => {
      const { subscriptionLimit } = usePlanLimits()
      expect(subscriptionLimit.value).toBe(Infinity)
    })

    test('bankConnectionLimit is Infinity', () => {
      const { bankConnectionLimit } = usePlanLimits()
      expect(bankConnectionLimit.value).toBe(Infinity)
    })

    test('canAddSubscription always returns true', () => {
      const { canAddSubscription } = usePlanLimits()
      expect(canAddSubscription()).toBe(true)
    })

    test('canConnectBank always returns true', () => {
      const { canConnectBank } = usePlanLimits()
      expect(canConnectBank()).toBe(true)
    })
  })
})

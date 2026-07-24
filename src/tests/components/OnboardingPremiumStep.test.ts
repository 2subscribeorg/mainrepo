import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OnboardingPremiumStep from '@/components/onboarding/OnboardingPremiumStep.vue'

vi.mock('@/composables/useHaptics', () => ({
  useHaptics: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}))

vi.mock('@/services/revenueCat', () => ({
  revenueCat: {
    purchase: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    isConfigured: vi.fn().mockResolvedValue({ isConfigured: false }),
    getOfferings: vi.fn().mockResolvedValue({
      current: {
        availablePackages: [
          { identifier: 'monthly', product: { priceString: '$3.99' } },
        ],
      },
    }),
  },
}))

vi.mock('@capacitor/purchases-typescript-internal-esm', () => ({}))

const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

describe('OnboardingPremiumStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    test('displays upgrade heading', () => {
      const wrapper = mount(OnboardingPremiumStep)
      expect(wrapper.text()).toContain('Upgrade to 2Subscribe Pro')
    })

    test('displays description', () => {
      const wrapper = mount(OnboardingPremiumStep)
      expect(wrapper.text()).toContain('Unlock the full power')
    })

    test('renders Free plan section', () => {
      const wrapper = mount(OnboardingPremiumStep)
      expect(wrapper.text()).toContain('Free')
      expect(wrapper.text()).toContain('Always included')
    })

    test('renders Pro plan section', () => {
      const wrapper = mount(OnboardingPremiumStep)
      expect(wrapper.text()).toContain('Pro')
    })

    test('lists free features', () => {
      const wrapper = mount(OnboardingPremiumStep)
      expect(wrapper.text()).toContain('Up to 5 subscriptions')
      expect(wrapper.text()).toContain('1 bank connection')
      expect(wrapper.text()).toContain('Renewal reminders')
      expect(wrapper.text()).toContain('Pattern detection')
    })

    test('lists pro features', () => {
      const wrapper = mount(OnboardingPremiumStep)
      expect(wrapper.text()).toContain('Unlimited subscriptions')
      expect(wrapper.text()).toContain('Unlimited bank connections')
      expect(wrapper.text()).toContain('All features included')
    })

    test('renders Start Free Trial button', () => {
      const wrapper = mount(OnboardingPremiumStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Start Free Trial'))
      expect(btn).toBeTruthy()
    })

    test('renders Continue with Free button', () => {
      const wrapper = mount(OnboardingPremiumStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Continue with Free'))
      expect(btn).toBeTruthy()
    })
  })

  describe('Continue with Free button', () => {
    test('emits skip event on click', async () => {
      const wrapper = mount(OnboardingPremiumStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Continue with Free'))
      await btn?.trigger('click')
      expect(wrapper.emitted('skip')).toBeTruthy()
    })
  })

  describe('Start Free Trial button', () => {
    test('is not disabled initially', () => {
      const wrapper = mount(OnboardingPremiumStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Start Free Trial'))
      expect(btn?.attributes('disabled')).toBeUndefined()
    })
  })
})

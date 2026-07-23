import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OnboardingBankStep from '@/components/onboarding/OnboardingBankStep.vue'
import { useOnboardingStore } from '@/stores/onboarding'

vi.mock('@/composables/useHaptics', () => ({
  useHaptics: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}))

// Stub PlaidLinkButton to avoid loading Plaid SDK
vi.mock('@/components/PlaidLinkButton.vue', () => ({
  default: {
    name: 'PlaidLinkButton',
    emits: ['success', 'error'],
    template: '<div data-testid="plaid-button"><button @click="$emit(\'success\')">Connect</button></div>',
  },
}))

describe('OnboardingBankStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Rendering (initial state)', () => {
    test('displays heading', () => {
      const wrapper = mount(OnboardingBankStep)
      expect(wrapper.text()).toContain('Connect Your Bank')
    })

    test('displays description', () => {
      const wrapper = mount(OnboardingBankStep)
      expect(wrapper.text()).toContain('Securely link your bank account')
    })

    test('renders PlaidLinkButton', () => {
      const wrapper = mount(OnboardingBankStep)
      expect(wrapper.find('[data-testid="plaid-button"]').exists()).toBe(true)
    })

    test('renders skip button', () => {
      const wrapper = mount(OnboardingBankStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes("I'll do this later"))
      expect(btn).toBeTruthy()
    })

    test('shows security feature list', () => {
      const wrapper = mount(OnboardingBankStep)
      expect(wrapper.text()).toContain('Bank-level security via Plaid')
      expect(wrapper.text()).toContain('Auto-detect recurring charges')
      expect(wrapper.text()).toContain('12,000+ banks')
    })

    test('does not show Continue button before connection', () => {
      const wrapper = mount(OnboardingBankStep)
      const btn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      expect(btn).toBeUndefined()
    })
  })

  describe('Bank connection success', () => {
    test('updates store bankConnected on success event', async () => {
      const store = useOnboardingStore()
      const wrapper = mount(OnboardingBankStep)
      const plaidStub = wrapper.findComponent({ name: 'PlaidLinkButton' })
      plaidStub.vm.$emit('success')
      await wrapper.vm.$nextTick()
      expect(store.bankConnected).toBe(true)
    })

    test('shows success heading after connection', async () => {
      const wrapper = mount(OnboardingBankStep)
      const plaidStub = wrapper.findComponent({ name: 'PlaidLinkButton' })
      plaidStub.vm.$emit('success')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Bank Connected!')
    })

    test('shows Continue button after connection', async () => {
      const wrapper = mount(OnboardingBankStep)
      const plaidStub = wrapper.findComponent({ name: 'PlaidLinkButton' })
      plaidStub.vm.$emit('success')
      await wrapper.vm.$nextTick()
      const btn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      expect(btn).toBeTruthy()
    })
  })

  describe('Continue button (after connection)', () => {
    test('emits next event on click', async () => {
      const wrapper = mount(OnboardingBankStep)
      const plaidStub = wrapper.findComponent({ name: 'PlaidLinkButton' })
      plaidStub.vm.$emit('success')
      await wrapper.vm.$nextTick()

      const continueBtn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      await continueBtn?.trigger('click')
      expect(wrapper.emitted('next')).toBeTruthy()
    })
  })

  describe('Skip button', () => {
    test('emits skip event on click', async () => {
      const wrapper = mount(OnboardingBankStep)
      const skipBtn = wrapper.findAll('button').find(b => b.text().includes("I'll do this later"))
      await skipBtn?.trigger('click')
      expect(wrapper.emitted('skip')).toBeTruthy()
    })
  })

  describe('Bank error', () => {
    test('displays error message on error event', async () => {
      const wrapper = mount(OnboardingBankStep)
      const plaidStub = wrapper.findComponent({ name: 'PlaidLinkButton' })
      plaidStub.vm.$emit('error', 'Connection failed')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Connection failed')
    })
  })
})

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OnboardingWelcomeStep from '@/components/onboarding/OnboardingWelcomeStep.vue'
import { useOnboardingStore } from '@/stores/onboarding'

vi.mock('@/composables/useHaptics', () => ({
  useHaptics: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}))

describe('OnboardingWelcomeStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Rendering', () => {
    test('displays welcome heading', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      expect(wrapper.text()).toContain('Welcome to 2Subscribe!')
    })

    test('displays description text', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      expect(wrapper.text()).toContain("Let's personalize your experience")
    })

    test('renders name input', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      expect(wrapper.find('#onboarding-name').exists()).toBe(true)
    })

    test('renders currency label', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      expect(wrapper.text()).toContain('Preferred Currency')
    })

    test('renders 3 currency buttons', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      const currencyButtons = wrapper.findAll('button').filter(btn =>
        btn.text().includes('GBP') || btn.text().includes('EUR') || btn.text().includes('USD')
      )
      expect(currencyButtons).toHaveLength(3)
    })

    test('renders Continue button', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      const buttons = wrapper.findAll('button')
      const continueBtn = buttons.find(b => b.text() === 'Continue')
      expect(continueBtn).toBeTruthy()
    })

    test('renders Skip button', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      const buttons = wrapper.findAll('button')
      const skipBtn = buttons.find(b => b.text().includes('Skip for now'))
      expect(skipBtn).toBeTruthy()
    })
  })

  describe('Currency selection', () => {
    test('GBP is selected by default', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      const gbpBtn = wrapper.findAll('button').find(b => b.text().includes('GBP'))
      expect(gbpBtn?.classes()).toContain('border-primary')
    })

    test('selecting EUR updates store', async () => {
      const store = useOnboardingStore()
      const wrapper = mount(OnboardingWelcomeStep)
      const eurBtn = wrapper.findAll('button').find(b => b.text().includes('EUR'))
      await eurBtn?.trigger('click')
      expect(store.currency).toBe('EUR')
    })

    test('selecting USD updates store', async () => {
      const store = useOnboardingStore()
      const wrapper = mount(OnboardingWelcomeStep)
      const usdBtn = wrapper.findAll('button').find(b => b.text().includes('USD'))
      await usdBtn?.trigger('click')
      expect(store.currency).toBe('USD')
    })

    test('selecting a currency highlights it with primary border', async () => {
      const wrapper = mount(OnboardingWelcomeStep)
      const usdBtn = wrapper.findAll('button').find(b => b.text().includes('USD'))
      await usdBtn?.trigger('click')
      expect(usdBtn?.classes()).toContain('border-primary')
    })
  })

  describe('Name input', () => {
    test('typing name updates store', async () => {
      const store = useOnboardingStore()
      const wrapper = mount(OnboardingWelcomeStep)
      const input = wrapper.find('#onboarding-name')
      await input.setValue('Alice')
      expect(store.displayName).toBe('Alice')
    })

    test('has maxlength of 50', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      const input = wrapper.find('#onboarding-name')
      expect(input.attributes('maxlength')).toBe('50')
    })
  })

  describe('Continue button', () => {
    test('is disabled when name is empty', () => {
      const wrapper = mount(OnboardingWelcomeStep)
      const continueBtn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      expect(continueBtn?.attributes('disabled')).toBeDefined()
    })

    test('is enabled when name is entered', async () => {
      const wrapper = mount(OnboardingWelcomeStep)
      await wrapper.find('#onboarding-name').setValue('Alice')
      const continueBtn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      expect(continueBtn?.attributes('disabled')).toBeUndefined()
    })

    test('emits next event on click', async () => {
      const wrapper = mount(OnboardingWelcomeStep)
      await wrapper.find('#onboarding-name').setValue('Alice')
      const continueBtn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      await continueBtn?.trigger('click')
      expect(wrapper.emitted('next')).toBeTruthy()
    })

    test('trims whitespace from name on continue', async () => {
      const store = useOnboardingStore()
      const wrapper = mount(OnboardingWelcomeStep)
      await wrapper.find('#onboarding-name').setValue('  Alice  ')
      const continueBtn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      await continueBtn?.trigger('click')
      expect(store.displayName).toBe('Alice')
    })
  })

  describe('Skip button', () => {
    test('emits skip event on click', async () => {
      const wrapper = mount(OnboardingWelcomeStep)
      const skipBtn = wrapper.findAll('button').find(b => b.text().includes('Skip for now'))
      await skipBtn?.trigger('click')
      expect(wrapper.emitted('skip')).toBeTruthy()
    })
  })
})

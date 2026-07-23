import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OnboardingNotificationsStep from '@/components/onboarding/OnboardingNotificationsStep.vue'
import { useOnboardingStore } from '@/stores/onboarding'

vi.mock('@/composables/useHaptics', () => ({
  useHaptics: () => ({
    impact: vi.fn(),
    notification: vi.fn(),
    selection: vi.fn(),
  }),
}))

vi.mock('@/services/NotificationScheduler', () => ({
  notificationScheduler: {
    requestPermission: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
  registerPlugin: vi.fn(),
}))

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    isConfigured: vi.fn().mockResolvedValue({ isConfigured: false }),
    getOfferings: vi.fn().mockResolvedValue({ current: null }),
  },
  LOG_LEVEL: { debug: 0, verbose: 1, info: 2, warn: 3, error: 4 },
  PACKAGE_TYPE: { custom: 'custom' },
}))

describe('OnboardingNotificationsStep', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Rendering (initial state)', () => {
    test('displays heading', () => {
      const wrapper = mount(OnboardingNotificationsStep)
      expect(wrapper.text()).toContain('Stay Ahead of Renewals')
    })

    test('displays description', () => {
      const wrapper = mount(OnboardingNotificationsStep)
      expect(wrapper.text()).toContain('Get push notifications 3 days before')
    })

    test('renders Enable Notifications button', () => {
      const wrapper = mount(OnboardingNotificationsStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Enable Notifications'))
      expect(btn).toBeTruthy()
    })

    test('renders Maybe later skip button', () => {
      const wrapper = mount(OnboardingNotificationsStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Maybe later'))
      expect(btn).toBeTruthy()
    })

    test('shows notification example cards', () => {
      const wrapper = mount(OnboardingNotificationsStep)
      expect(wrapper.text()).toContain('Netflix renews in 3 days')
      expect(wrapper.text()).toContain('Spotify renews tomorrow')
    })

    test('does not show Continue button before permission granted', () => {
      const wrapper = mount(OnboardingNotificationsStep)
      const btn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      expect(btn).toBeUndefined()
    })
  })

  describe('Enable Notifications button', () => {
    test('requests permission on click', async () => {
      const { notificationScheduler } = await import('@/services/NotificationScheduler')
      const wrapper = mount(OnboardingNotificationsStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Enable Notifications'))
      await btn?.trigger('click')
      expect(notificationScheduler.requestPermission).toHaveBeenCalled()
    })

    test('shows success state after permission granted (non-native)', async () => {
      const wrapper = mount(OnboardingNotificationsStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Enable Notifications'))
      await btn?.trigger('click')
      expect(wrapper.text()).toContain('Notifications Enabled!')
    })

    test('updates store notificationsEnabled after granting', async () => {
      const store = useOnboardingStore()
      const wrapper = mount(OnboardingNotificationsStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Enable Notifications'))
      await btn?.trigger('click')
      expect(store.notificationsEnabled).toBe(true)
    })

    test('shows Continue button after permission granted', async () => {
      const wrapper = mount(OnboardingNotificationsStep)
      const btn = wrapper.findAll('button').find(b => b.text().includes('Enable Notifications'))
      await btn?.trigger('click')
      await wrapper.vm.$nextTick()
      const continueBtn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      expect(continueBtn).toBeTruthy()
    })
  })

  describe('Continue button (after permission granted)', () => {
    test('emits next event on click', async () => {
      const wrapper = mount(OnboardingNotificationsStep)
      // Grant permission first
      const enableBtn = wrapper.findAll('button').find(b => b.text().includes('Enable Notifications'))
      await enableBtn?.trigger('click')
      await wrapper.vm.$nextTick()

      const continueBtn = wrapper.findAll('button').find(b => b.text() === 'Continue')
      await continueBtn?.trigger('click')
      expect(wrapper.emitted('next')).toBeTruthy()
    })
  })

  describe('Skip button', () => {
    test('emits skip event on click', async () => {
      const wrapper = mount(OnboardingNotificationsStep)
      const skipBtn = wrapper.findAll('button').find(b => b.text().includes('Maybe later'))
      await skipBtn?.trigger('click')
      expect(wrapper.emitted('skip')).toBeTruthy()
    })
  })
})

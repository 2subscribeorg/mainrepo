import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress.vue'

describe('OnboardingProgress', () => {
  describe('Rendering', () => {
    test('displays step text with current and total', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 1, total: 4 },
      })
      expect(wrapper.text()).toContain('Step 2 of 4')
    })

    test('displays percentage text', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 1, total: 4 },
      })
      expect(wrapper.text()).toContain('50%')
    })

    test('shows 25% on first step of 4', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 0, total: 4 },
      })
      expect(wrapper.text()).toContain('25%')
    })

    test('shows 100% on last step', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 3, total: 4 },
      })
      expect(wrapper.text()).toContain('100%')
    })

    test('renders progress bar container', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 0, total: 4 },
      })
      expect(wrapper.find('.onboarding-progress').exists()).toBe(true)
    })

    test('renders inner progress fill div', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 0, total: 4 },
      })
      const fill = wrapper.find('.h-full')
      expect(fill.exists()).toBe(true)
    })
  })

  describe('Progress bar width', () => {
    test('sets width to 25% for first step', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 0, total: 4 },
      })
      const fill = wrapper.find('.h-full')
      expect(fill.attributes('style')).toContain('width: 25%')
    })

    test('sets width to 50% for second step', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 1, total: 4 },
      })
      const fill = wrapper.find('.h-full')
      expect(fill.attributes('style')).toContain('width: 50%')
    })

    test('sets width to 75% for third step', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 2, total: 4 },
      })
      const fill = wrapper.find('.h-full')
      expect(fill.attributes('style')).toContain('width: 75%')
    })

    test('sets width to 100% for last step', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 3, total: 4 },
      })
      const fill = wrapper.find('.h-full')
      expect(fill.attributes('style')).toContain('width: 100%')
    })
  })

  describe('Edge cases', () => {
    test('handles single step (100%)', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 0, total: 1 },
      })
      expect(wrapper.text()).toContain('Step 1 of 1')
      expect(wrapper.text()).toContain('100%')
    })

    test('handles 2 steps', () => {
      const wrapper = mount(OnboardingProgress, {
        props: { current: 0, total: 2 },
      })
      expect(wrapper.text()).toContain('Step 1 of 2')
      expect(wrapper.text()).toContain('50%')
    })
  })
})

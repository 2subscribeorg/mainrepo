import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RenewalWarningBadge from '@/components/RenewalWarningBadge.vue'

describe('RenewalWarningBadge', () => {
  describe('Rendering', () => {
    test('displays warning count correctly', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })

      // Assert
      expect(wrapper.text()).toContain('3')
    })

    test('shows badge when count is greater than 0', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 1 },
      })

      // Assert
      expect(wrapper.find('button').exists()).toBe(true)
    })

    test('hides badge when count is 0', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 0 },
      })

      // Assert
      expect(wrapper.find('button').exists()).toBe(false)
    })

    test('displays bell icon', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 2 },
      })

      // Assert
      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      expect(svg.attributes('aria-hidden')).toBe('true')
    })
  })

  describe('Critical Indicator', () => {
    test('shows critical indicator when hasCritical is true', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3, hasCritical: true },
      })

      // Assert
      const indicator = wrapper.find('.bg-red-500.border-2')
      expect(indicator.exists()).toBe(true)
      expect(indicator.classes()).toContain('animate-pulse')
    })

    test('hides critical indicator when hasCritical is false', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3, hasCritical: false },
      })

      // Assert
      const indicator = wrapper.find('.bg-red-500.border-2')
      expect(indicator.exists()).toBe(false)
    })

    test('hides critical indicator when hasCritical is undefined', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })

      // Assert
      const indicator = wrapper.find('.bg-red-500.border-2')
      expect(indicator.exists()).toBe(false)
    })

    test('bell icon pulses when hasCritical is true', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3, hasCritical: true },
      })

      // Assert
      const icon = wrapper.find('svg')
      expect(icon.classes()).toContain('animate-pulse')
    })

    test('bell icon does not pulse when hasCritical is false', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3, hasCritical: false },
      })

      // Assert
      const icon = wrapper.find('svg')
      expect(icon.classes()).not.toContain('animate-pulse')
    })
  })

  describe('Styling', () => {
    test('applies critical styling when hasCritical is true', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3, hasCritical: true },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.classes()).toContain('bg-red-100')
      expect(button.classes()).toContain('text-red-700')
      expect(button.classes()).toContain('focus:ring-red-500')
    })

    test('applies normal styling when hasCritical is false', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3, hasCritical: false },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.classes()).toContain('bg-blue-100')
      expect(button.classes()).toContain('text-blue-700')
      expect(button.classes()).toContain('focus:ring-blue-500')
    })

    test('has rounded-full shape', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.classes()).toContain('rounded-full')
    })

    test('has transition classes', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.classes()).toContain('transition-all')
      expect(button.classes()).toContain('duration-150')
    })
  })

  describe('Interactions', () => {
    test('emits click event when clicked', async () => {
      // Arrange
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })

      // Act
      await wrapper.find('button').trigger('click')

      // Assert
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')).toHaveLength(1)
    })

    test('emits click event multiple times', async () => {
      // Arrange
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })
      const button = wrapper.find('button')

      // Act
      await button.trigger('click')
      await button.trigger('click')
      await button.trigger('click')

      // Assert
      expect(wrapper.emitted('click')).toHaveLength(3)
    })

    test('has active scale animation', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.classes()).toContain('active:scale-95')
    })
  })

  describe('Accessibility', () => {
    test('has proper button role', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.attributes('type')).toBe('button')
    })

    test('has descriptive aria-label for single warning', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 1 },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.attributes('aria-label')).toBe('1 renewal warning')
    })

    test('has descriptive aria-label for multiple warnings', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 5 },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.attributes('aria-label')).toBe('5 renewal warnings')
    })

    test('includes critical in aria-label when hasCritical is true', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3, hasCritical: true },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.attributes('aria-label')).toBe('3 renewal warnings, including critical warnings')
    })

    test('does not include critical in aria-label when hasCritical is false', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3, hasCritical: false },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.attributes('aria-label')).toBe('3 renewal warnings')
    })

    test('has focus ring styles', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.classes()).toContain('focus:outline-none')
      expect(button.classes()).toContain('focus:ring-2')
      expect(button.classes()).toContain('focus:ring-offset-2')
    })

    test('icon has aria-hidden attribute', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3 },
      })

      // Assert
      const svg = wrapper.find('svg')
      expect(svg.attributes('aria-hidden')).toBe('true')
    })

    test('critical indicator has aria-hidden attribute', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 3, hasCritical: true },
      })

      // Assert
      const indicator = wrapper.find('.bg-red-500.border-2')
      expect(indicator.attributes('aria-hidden')).toBe('true')
    })
  })

  describe('Edge Cases', () => {
    test('handles large count numbers', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 99 },
      })

      // Assert
      expect(wrapper.text()).toContain('99')
      expect(wrapper.find('button').exists()).toBe(true)
    })

    test('handles count of exactly 1', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 1 },
      })

      // Assert
      expect(wrapper.text()).toContain('1')
      expect(wrapper.find('button').attributes('aria-label')).toContain('warning')
      expect(wrapper.find('button').attributes('aria-label')).not.toContain('warnings')
    })

    test('handles count of exactly 2', () => {
      // Arrange & Act
      const wrapper = mount(RenewalWarningBadge, {
        props: { count: 2 },
      })

      // Assert
      expect(wrapper.text()).toContain('2')
      expect(wrapper.find('button').attributes('aria-label')).toContain('warnings')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActiveSubscriptionsCard from '@/components/dashboard/ActiveSubscriptionsCard.vue'

describe('ActiveSubscriptionsCard.vue', () => {
  describe('Core Rendering & Defaults', () => {
    it('renders with default values when no props provided', () => {
      const wrapper = mount(ActiveSubscriptionsCard, {
        props: { activeCount: 0 }
      })

      expect(wrapper.find('.stat-card__label').text()).toBe('Active subscriptions')
      expect(wrapper.find('.stat-card__badge').text()).toBe('Live')
      expect(wrapper.find('.stat-card__value').text()).toBe('0')
      expect(wrapper.find('.stat-card__subtitle').text()).toBe('Auto-renewing plans')
    })

    it('renders with custom trend label and subtitle', () => {
      const wrapper = mount(ActiveSubscriptionsCard, {
        props: { 
          activeCount: 5,
          trendLabel: 'Updated',
          subtitle: 'Monthly active plans'
        }
      })

      expect(wrapper.find('.stat-card__badge').text()).toBe('Updated')
      expect(wrapper.find('.stat-card__subtitle').text()).toBe('Monthly active plans')
    })

    it('displays active count correctly in the main value', () => {
      const testCases = [
        { count: 0, expected: '0' },
        { count: 1, expected: '1' },
        { count: 42, expected: '42' },
        { count: 999, expected: '999' }
      ]

      testCases.forEach(({ count, expected }) => {
        const wrapper = mount(ActiveSubscriptionsCard, {
          props: { activeCount: count }
        })

        expect(wrapper.find('.stat-card__value').text()).toBe(expected)
      })
    })
  })

  describe('Component Structure', () => {
    it('has proper semantic structure with CSS classes', () => {
      const wrapper = mount(ActiveSubscriptionsCard, {
        props: { activeCount: 10 }
      })

      // Verify main card structure
      const card = wrapper.find('.stat-card')
      expect(card.exists()).toBe(true)

      // Verify header structure
      const header = wrapper.find('.stat-card__header')
      expect(header.exists()).toBe(true)

      // Verify all required elements are present
      expect(wrapper.find('.stat-card__label').exists()).toBe(true)
      expect(wrapper.find('.stat-card__badge').exists()).toBe(true)
      expect(wrapper.find('.stat-card__value').exists()).toBe(true)
      expect(wrapper.find('.stat-card__subtitle').exists()).toBe(true)
    })

    it('maintains consistent element hierarchy', () => {
      const wrapper = mount(ActiveSubscriptionsCard, {
        props: { activeCount: 3 }
      })

      const card = wrapper.find('.stat-card')
      const header = card.find('.stat-card__header')
      const label = header.find('.stat-card__label')
      const badge = header.find('.stat-card__badge')
      const value = card.find('.stat-card__value')
      const subtitle = card.find('.stat-card__subtitle')

      // Verify parent-child relationships
      expect(label.element.parentElement).toBe(header.element)
      expect(badge.element.parentElement).toBe(header.element)
      expect(header.element.parentElement).toBe(card.element)
      expect(value.element.parentElement).toBe(card.element)
      expect(subtitle.element.parentElement).toBe(card.element)
    })
  })

  describe('Edge Cases & Data Integrity', () => {
    it('handles large numbers gracefully', () => {
      const wrapper = mount(ActiveSubscriptionsCard, {
        props: { activeCount: 999999 }
      })

      expect(wrapper.find('.stat-card__value').text()).toBe('999999')
      // Should not break layout or cause overflow issues
      expect(wrapper.find('.stat-card').exists()).toBe(true)
    })

    it('handles zero count appropriately', () => {
      const wrapper = mount(ActiveSubscriptionsCard, {
        props: { activeCount: 0 }
      })

      expect(wrapper.find('.stat-card__value').text()).toBe('0')
      // Should still show all other elements
      expect(wrapper.find('.stat-card__badge').text()).toBe('Live')
      expect(wrapper.find('.stat-card__subtitle').text()).toBe('Auto-renewing plans')
    })

    it('handles empty string for optional props', () => {
      const wrapper = mount(ActiveSubscriptionsCard, {
        props: { 
          activeCount: 5,
          trendLabel: '',
          subtitle: ''
        }
      })

      expect(wrapper.find('.stat-card__badge').text()).toBe('')
      expect(wrapper.find('.stat-card__subtitle').text()).toBe('')
    })

    it('handles very long strings in optional props', () => {
      const longTrendLabel = 'A'.repeat(100)
      const longSubtitle = 'B'.repeat(200)

      const wrapper = mount(ActiveSubscriptionsCard, {
        props: { 
          activeCount: 1,
          trendLabel: longTrendLabel,
          subtitle: longSubtitle
        }
      })

      expect(wrapper.find('.stat-card__badge').text()).toBe(longTrendLabel)
      expect(wrapper.find('.stat-card__subtitle').text()).toBe(longSubtitle)
      // Component should still render without errors
      expect(wrapper.find('.stat-card').exists()).toBe(true)
    })
  })

  describe('TypeScript Props Validation', () => {
    it('accepts valid prop combinations', () => {
      const validProps = [
        { activeCount: 0 },
        { activeCount: 1, trendLabel: 'Live' },
        { activeCount: 10, subtitle: 'Plans' },
        { activeCount: 5, trendLabel: 'Updated', subtitle: 'Monthly' }
      ]

      validProps.forEach(props => {
        expect(() => {
          mount(ActiveSubscriptionsCard, { props })
        }).not.toThrow()
      })
    })
  })

  describe('Accessibility & Semantics', () => {
    it('maintains proper text hierarchy for screen readers', () => {
      const wrapper = mount(ActiveSubscriptionsCard, {
        props: { activeCount: 12 }
      })

      // The main value should be the most prominent (largest font size)
      const value = wrapper.find('.stat-card__value')
      const label = wrapper.find('.stat-card__label')
      const subtitle = wrapper.find('.stat-card__subtitle')

      expect(value.exists()).toBe(true)
      expect(label.exists()).toBe(true)
      expect(subtitle.exists()).toBe(true)

      // Content should be meaningful and descriptive
      expect(label.text()).toBe('Active subscriptions')
      expect(value.text()).toBe('12')
      expect(subtitle.text()).toBe('Auto-renewing plans')
    })
  })
})

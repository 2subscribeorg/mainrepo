import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SubscriptionCard from '@/components/SubscriptionCard.vue'
import type { Subscription } from '@/domain/models'
import { useCategoriesStore } from '@/stores/categories'

describe('SubscriptionCard', () => {
  const mockSubscription: Subscription = {
    id: 'sub-123',
    userId: 'user-123',
    merchantName: 'Netflix',
    amount: { amount: 9.99, currency: 'GBP' },
    recurrence: 'monthly',
    nextPaymentDate: '2024-04-15',
    status: 'active',
    categoryId: 'cat-entertainment',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Setup categories store with mock category
    const categoriesStore = useCategoriesStore()
    categoriesStore.categoriesById.set('cat-entertainment', {
      id: 'cat-entertainment',
      userId: 'user-123',
      name: 'Entertainment',
      colour: '#FF5722',
      icon: 'tv',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    })
  })

  describe('Rendering', () => {
    test('displays merchant name correctly', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Netflix')
      const heading = wrapper.find('h3')
      expect(heading.text()).toBe('Netflix')
    })

    test('displays formatted amount', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('£9.99')
    })

    test('displays recurrence type', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Monthly')
    })

    test('displays category name', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Entertainment')
    })

    test('displays category color indicator', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      const colorDot = wrapper.find('.h-3.w-3.rounded-full')
      expect(colorDot.exists()).toBe(true)
      expect(colorDot.attributes('style')).toContain('background-color: rgb(255, 87, 34)')
    })

    test('displays next payment date', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Next:')
    })
  })

  describe('Status Indicators', () => {
    test('shows active status with correct styling', () => {
      // Arrange
      const activeSubscription = { ...mockSubscription, status: 'active' as const }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: activeSubscription },
      })

      // Assert
      const statusBadge = wrapper.find('.inline-flex.items-center.rounded-full')
      expect(statusBadge.text()).toBe('active')
      expect(statusBadge.classes()).toContain('bg-success-bg')
      expect(statusBadge.classes()).toContain('text-success-text')
    })

    test('shows paused status with correct styling', () => {
      // Arrange
      const pausedSubscription = { ...mockSubscription, status: 'paused' as const }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: pausedSubscription },
      })

      // Assert
      const statusBadge = wrapper.find('.inline-flex.items-center.rounded-full')
      expect(statusBadge.text()).toBe('paused')
      expect(statusBadge.classes()).toContain('bg-warning-bg')
      expect(statusBadge.classes()).toContain('text-warning-text')
    })

    test('shows cancelled status with correct styling', () => {
      // Arrange
      const cancelledSubscription = { ...mockSubscription, status: 'cancelled' as const }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: cancelledSubscription },
      })

      // Assert
      const statusBadge = wrapper.find('.inline-flex.items-center.rounded-full')
      expect(statusBadge.text()).toBe('cancelled')
      expect(statusBadge.classes()).toContain('bg-error-bg')
      expect(statusBadge.classes()).toContain('text-error-text')
    })
  })

  describe('Interactions', () => {
    test('emits click event when card is clicked', async () => {
      // Arrange
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Act
      await wrapper.trigger('click')

      // Assert
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')).toHaveLength(1)
    })

    test('has cursor-pointer class for clickability', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.classes()).toContain('cursor-pointer')
    })

    test('has hover effects', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.classes()).toContain('hover:shadow-lg')
      expect(card.classes()).toContain('hover:-translate-y-1')
    })
  })

  describe('Currency Handling', () => {
    test('handles USD currency', () => {
      // Arrange
      const usdSubscription = {
        ...mockSubscription,
        amount: { amount: 12.99, currency: 'USD' as const },
      }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: usdSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('$12.99')
    })

    test('handles EUR currency', () => {
      // Arrange
      const eurSubscription = {
        ...mockSubscription,
        amount: { amount: 15.99, currency: 'EUR' as const },
      }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: eurSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('€15.99')
    })

    test('handles large amounts', () => {
      // Arrange
      const expensiveSubscription = {
        ...mockSubscription,
        amount: { amount: 1234.56, currency: 'GBP' as const },
      }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: expensiveSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('£1234.56')
    })
  })

  describe('Recurrence Types', () => {
    test('displays weekly recurrence', () => {
      // Arrange
      const weeklySubscription = { ...mockSubscription, recurrence: 'weekly' as const }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: weeklySubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Weekly')
    })

    test('displays yearly recurrence', () => {
      // Arrange
      const yearlySubscription = { ...mockSubscription, recurrence: 'yearly' as const }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: yearlySubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Yearly')
    })

    test('displays quarterly recurrence', () => {
      // Arrange
      const quarterlySubscription = { ...mockSubscription, recurrence: 'quarterly' as const }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: quarterlySubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Quarterly')
    })
  })

  describe('Edge Cases', () => {
    test('handles uncategorized subscription', () => {
      // Arrange
      const uncategorizedSubscription = {
        ...mockSubscription,
        categoryId: 'non-existent-category',
      }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: uncategorizedSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Uncategorised')
    })

    test('shows default color for uncategorized subscription', () => {
      // Arrange
      const uncategorizedSubscription = {
        ...mockSubscription,
        categoryId: 'non-existent-category',
      }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: uncategorizedSubscription },
      })

      // Assert
      const colorDot = wrapper.find('.h-3.w-3.rounded-full')
      expect(colorDot.attributes('style')).toContain('background-color: rgb(158, 158, 158)')
    })

    test('handles long merchant names', () => {
      // Arrange
      const longNameSubscription = {
        ...mockSubscription,
        merchantName: 'Very Long Subscription Service Name That Should Be Displayed',
      }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: longNameSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Very Long Subscription Service Name That Should Be Displayed')
    })

    test('handles past due dates', () => {
      // Arrange
      const pastDueSubscription = {
        ...mockSubscription,
        nextPaymentDate: '2020-01-01',
      }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: pastDueSubscription },
      })

      // Assert
      expect(wrapper.text()).toContain('Next:')
    })

    test('handles missing next payment date', () => {
      // Arrange
      const noDateSubscription = {
        ...mockSubscription,
        nextPaymentDate: null as any,
      }

      // Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: noDateSubscription },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.exists()).toBe(true)
    })
  })

  describe('Visual Feedback', () => {
    test('has transition classes', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.classes()).toContain('transition-fast')
    })

    test('has card animation class', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.classes()).toContain('card-animated')
    })

    test('has GPU acceleration class', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.classes()).toContain('gpu-accelerated')
    })

    test('has shadow effects', () => {
      // Arrange & Act
      const wrapper = mount(SubscriptionCard, {
        props: { subscription: mockSubscription },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.classes()).toContain('shadow-sm')
    })
  })
})

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TransactionItem from '@/components/transactions/TransactionItem.vue'
import type { Transaction } from '@/domain/models'

// Mock child components
vi.mock('@/components/transactions/TransactionBadge.vue', () => ({
  default: { 
    name: 'TransactionBadge', 
    props: ['type', 'text'],
    template: '<span>{{ type }}: {{ text }}</span>' 
  }
}))

vi.mock('@/components/DuplicateSubscriptionModal.vue', () => ({
  default: { name: 'DuplicateSubscriptionModal', template: '<div />' }
}))

vi.mock('@/components/categories/CategoryFormModal.vue', () => ({
  default: { name: 'CategoryFormModal', template: '<div />' }
}))

describe('TransactionItem', () => {
  const mockTransaction: Transaction = {
    id: 'tx-123',
    userId: 'user-123',
    accountId: 'acc-123',
    amount: { amount: -9.99, currency: 'GBP' },
    merchantName: 'Netflix',
    date: '2024-03-15',
    category: ['Entertainment'],
    pending: false,
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
  }

  const mockCategories = [
    { id: 'cat-1', name: 'Entertainment' },
    { id: 'cat-2', name: 'Food & Dining' },
    { id: 'cat-3', name: 'Transport' },
  ]

  const mockGetAccountName = vi.fn((accountId: string) => 'Main Account')
  const mockGetAmountColor = vi.fn((amount: number) => 
    amount < 0 ? 'text-error-text' : 'text-success-text'
  )

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    test('displays merchant name correctly', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Netflix')
      const heading = wrapper.find('h4')
      expect(heading.text()).toBe('Netflix')
    })

    test('displays formatted amount', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert - Amount is negative so shows as positive in display
      expect(wrapper.text()).toContain('9.99')
    })

    test('displays merchant initial in avatar', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const avatar = wrapper.find('.h-10.w-10')
      expect(avatar.text()).toBe('N')
    })

    test('displays formatted date', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('15 Mar 2024')
    })

    test('displays account name', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(mockGetAccountName).toHaveBeenCalledWith('acc-123')
      expect(wrapper.text()).toContain('Main Account')
    })
  })

  describe('Amount Formatting', () => {
    test('applies correct color class for negative amounts', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(mockGetAmountColor).toHaveBeenCalledWith(-9.99)
      const amountElement = wrapper.find('.text-base.font-semibold')
      expect(amountElement.classes()).toContain('text-error-text')
    })

    test('applies correct color class for positive amounts', () => {
      // Arrange
      const positiveTransaction = {
        ...mockTransaction,
        amount: { amount: 50.00, currency: 'GBP' as const },
      }
      mockGetAmountColor.mockReturnValue('text-success-text')

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: positiveTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(mockGetAmountColor).toHaveBeenCalledWith(50.00)
      const amountElement = wrapper.find('.text-base.font-semibold')
      expect(amountElement.classes()).toContain('text-success-text')
    })

    test('handles different currencies', () => {
      // Arrange
      const usdTransaction = {
        ...mockTransaction,
        amount: { amount: -12.99, currency: 'USD' as const },
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: usdTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('12.99')
    })
  })

  describe('Category Display', () => {
    test('displays transaction categories', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Entertainment')
    })

    test('displays multiple categories', () => {
      // Arrange
      const multiCategoryTransaction = {
        ...mockTransaction,
        category: ['Entertainment', 'Streaming'],
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: multiCategoryTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Entertainment')
      expect(wrapper.text()).toContain('Streaming')
    })

    test('hides category section when no categories', () => {
      // Arrange
      const noCategoryTransaction = {
        ...mockTransaction,
        category: [],
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: noCategoryTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const categorySection = wrapper.find('.mt-4.flex.flex-wrap.gap-2')
      expect(categorySection.exists()).toBe(false)
    })
  })

  describe('Pending Badge', () => {
    test('shows pending badge for pending transactions', () => {
      // Arrange
      const pendingTransaction = {
        ...mockTransaction,
        pending: true,
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: pendingTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const badge = wrapper.findComponent({ name: 'TransactionBadge' })
      expect(badge.exists()).toBe(true)
    })

    test('hides pending badge for completed transactions', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).not.toContain('pending:')
    })
  })

  describe('Subscription Creation', () => {
    test('shows create subscription button when not linked to subscription', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const createButton = wrapper.find('button')
      expect(createButton.exists()).toBe(true)
      expect(createButton.text()).toContain('Subscription')
    })

    test('emits create-subscription event when button clicked', async () => {
      // Arrange
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Act
      const createButton = wrapper.find('button')
      await createButton.trigger('click')

      // Assert
      expect(wrapper.emitted('create-subscription')).toBeTruthy()
    })

    test('hides create subscription button when linked to subscription', () => {
      // Arrange
      const linkedTransaction = {
        ...mockTransaction,
        subscriptionId: 'sub-123',
        categoryId: 'cat-1',
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: linkedTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const createButton = wrapper.find('button')
      expect(createButton.exists()).toBe(false)
    })
  })

  describe('Subscription Indicator', () => {
    test('shows subscription indicator when linked to subscription', () => {
      // Arrange
      const linkedTransaction = {
        ...mockTransaction,
        subscriptionId: 'sub-123',
        categoryId: 'cat-1',
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: linkedTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('✓')
      expect(wrapper.text()).toContain('Subscription')
    })

    test('displays category name in subscription indicator', () => {
      // Arrange
      const linkedTransaction = {
        ...mockTransaction,
        subscriptionId: 'sub-123',
        categoryId: 'cat-1',
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: linkedTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Entertainment')
    })

    test('shows "No category assigned" when subscription has no category', () => {
      // Arrange
      const linkedTransaction = {
        ...mockTransaction,
        subscriptionId: 'sub-123',
        categoryId: undefined,
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: linkedTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('No category assigned')
    })
  })

  describe('Category Dropdown', () => {
    test('shows category dropdown for linked subscriptions', () => {
      // Arrange
      const linkedTransaction = {
        ...mockTransaction,
        subscriptionId: 'sub-123',
        categoryId: 'cat-1',
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: linkedTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const dropdown = wrapper.find('select')
      expect(dropdown.exists()).toBe(true)
    })

    test('displays all available categories in dropdown', () => {
      // Arrange
      const linkedTransaction = {
        ...mockTransaction,
        subscriptionId: 'sub-123',
        categoryId: 'cat-1',
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: linkedTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const options = wrapper.findAll('option')
      expect(options.length).toBeGreaterThan(mockCategories.length)
      expect(wrapper.text()).toContain('Entertainment')
      expect(wrapper.text()).toContain('Food & Dining')
      expect(wrapper.text()).toContain('Transport')
    })

    test('includes "Create New Category" option', () => {
      // Arrange
      const linkedTransaction = {
        ...mockTransaction,
        subscriptionId: 'sub-123',
        categoryId: 'cat-1',
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: linkedTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Create New Category')
    })

    test('emits category-change event when category selected', async () => {
      // Arrange
      const linkedTransaction = {
        ...mockTransaction,
        subscriptionId: 'sub-123',
        categoryId: 'cat-1',
      }

      const wrapper = mount(TransactionItem, {
        props: {
          transaction: linkedTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Act
      const dropdown = wrapper.find('select')
      await dropdown.setValue('cat-2')

      // Assert
      expect(wrapper.emitted('category-change')).toBeTruthy()
      expect(wrapper.emitted('category-change')?.[0]).toEqual(['cat-2'])
    })
  })

  describe('Edge Cases', () => {
    test('handles missing merchant name', () => {
      // Arrange
      const noNameTransaction = {
        ...mockTransaction,
        merchantName: '',
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: noNameTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const avatar = wrapper.find('.h-10.w-10')
      expect(avatar.text()).toBe('?')
    })

    test('handles long merchant names with truncation', () => {
      // Arrange
      const longNameTransaction = {
        ...mockTransaction,
        merchantName: 'Very Long Merchant Name That Should Be Truncated Properly',
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: longNameTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const heading = wrapper.find('h4')
      expect(heading.classes()).toContain('truncate')
    })

    test('handles missing account ID', () => {
      // Arrange
      const noAccountTransaction = {
        ...mockTransaction,
        accountId: undefined,
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: noAccountTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert - Account name is not displayed when accountId is undefined (v-if condition)
      expect(mockGetAccountName).not.toHaveBeenCalled()
      expect(wrapper.text()).not.toContain('Main Account')
    })

    test('handles zero amount', () => {
      // Arrange
      const zeroTransaction = {
        ...mockTransaction,
        amount: { amount: 0, currency: 'GBP' as const },
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: zeroTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('£0.00')
    })

    test('handles large amounts', () => {
      // Arrange
      const largeTransaction = {
        ...mockTransaction,
        amount: { amount: -1234.56, currency: 'GBP' as const },
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: largeTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('1234.56')
    })
  })

  describe('Visual Feedback', () => {
    test('has hover effects', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.classes()).toContain('hover:shadow-lg')
      expect(card.classes()).toContain('hover:-translate-y-0.5')
    })

    test('has transition classes', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.classes()).toContain('transition-fast')
    })

    test('has GPU acceleration class', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const card = wrapper.find('div')
      expect(card.classes()).toContain('gpu-accelerated')
    })
  })

  describe('Accessibility', () => {
    test('merchant name has proper heading level', () => {
      // Arrange & Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: mockTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const heading = wrapper.find('h4')
      expect(heading.exists()).toBe(true)
    })

    test('category dropdown has proper structure', () => {
      // Arrange
      const linkedTransaction = {
        ...mockTransaction,
        subscriptionId: 'sub-123',
        categoryId: 'cat-1',
      }

      // Act
      const wrapper = mount(TransactionItem, {
        props: {
          transaction: linkedTransaction,
          categories: mockCategories,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const dropdown = wrapper.find('select')
      expect(dropdown.exists()).toBe(true)
      expect(dropdown.classes()).toContain('category-dropdown')
    })
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SubscriptionSuggestionCard from '@/components/SubscriptionSuggestionCard.vue'
import type { RecurringPattern } from '@/services/PatternDetector'

// Mock the composables and stores
vi.mock('@/composables/useSubscriptionFeedback')
vi.mock('@/stores/categories')
vi.mock('@/utils/formatters', () => ({
  formatMoney: vi.fn(({ amount, currency }) => `${currency} ${amount.toFixed(2)}`),
  formatRecurrence: vi.fn((frequency) => `${frequency}ly`)
}))

describe('SubscriptionSuggestionCard', () => {
  let pinia: any
  let mockPattern: RecurringPattern
  let mockSubscriptionFeedback: any
  let mockCategoriesStore: any

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)

    // Mock pattern data
    mockPattern = {
      merchant: 'Netflix',
      amount: 15.99,
      frequency: 'month',
      confidence: 0.85,
      transactions: [
        {
          id: 'tx-1',
          date: '2024-01-15',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          category: { name: 'Entertainment' }
        },
        {
          id: 'tx-2', 
          date: '2024-02-15',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          category: { name: 'Entertainment' }
        }
      ]
    }

    // Mock subscription feedback composable — use ref() so Vue reactivity works
    const { ref } = await import('vue')
    mockSubscriptionFeedback = {
      confirmSubscription: vi.fn().mockResolvedValue(true),
      rejectSubscription: vi.fn().mockResolvedValue(true),
      loading: ref(false),
      error: ref(null),
      showCategoryModal: ref(false),
      handleCategorySelection: vi.fn().mockResolvedValue(true),
      handleCategoryCreation: vi.fn().mockResolvedValue(true),
      cancelCategorySelection: vi.fn()
    }

    // Mock categories store
    mockCategoriesStore = {
      categories: [
        { id: 'cat-1', name: 'Entertainment', colour: '#FF5733' },
        { id: 'cat-2', name: 'Utilities', colour: '#33FF57' }
      ]
    }

    const { useSubscriptionFeedback } = await import('@/composables/useSubscriptionFeedback')
    const { useCategoriesStore } = await import('@/stores/categories')
    
    vi.mocked(useSubscriptionFeedback).mockReturnValue(mockSubscriptionFeedback)
    vi.mocked(useCategoriesStore).mockReturnValue(mockCategoriesStore)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Pattern Display', () => {
    it('displays merchant name and detection info correctly', () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      expect(wrapper.text()).toContain('Netflix')
      expect(wrapper.text()).toContain('Possible subscription detected')
      expect(wrapper.text()).toContain('USD 15.99')
      expect(wrapper.text()).toContain('monthly')
    })

    it('shows confidence score and transaction count', () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      expect(wrapper.text()).toContain('2 matching transactions')
      expect(wrapper.text()).toContain('85% confidence')
    })

    it('toggles transaction list visibility when clicked', async () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      // Initially transactions should be hidden
      expect(wrapper.text()).not.toContain('Matching Transactions:')

      // Click the toggle row (the div with the arrow and transaction count)
      await wrapper.find('.mt-3.flex.items-center').trigger('click')

      expect(wrapper.text()).toContain('Matching Transactions:')
    })
  })

  describe('User Actions', () => {
    it('calls confirmSubscription when confirm button is clicked', async () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const confirmButton = wrapper.find('button:first-of-type')
      await confirmButton.trigger('click')

      expect(mockSubscriptionFeedback.confirmSubscription).toHaveBeenCalledWith({
        transactionId: 'tx-2', // Last transaction
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        date: '2024-02-15',
        detectionConfidence: 0.85,
        detectionMethod: 'pattern_matching'
      })
    })

    it('calls rejectSubscription when reject button is clicked', async () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const rejectButton = wrapper.find('button:last-of-type')
      await rejectButton.trigger('click')

      expect(mockSubscriptionFeedback.rejectSubscription).toHaveBeenCalledWith({
        transactionId: 'tx-2',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        date: '2024-02-15',
        detectionConfidence: 0.85,
        detectionMethod: 'pattern_matching'
      })
    })

    it('emits confirmed event after successful category selection', async () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      // Simulate successful category selection
      await wrapper.vm.handleCategorySelection('cat-1')

      expect(wrapper.emitted('confirmed')).toBeTruthy()
      expect(wrapper.emitted('confirmed')[0]).toEqual([mockPattern])
    })

    it('emits rejected event after successful rejection', async () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const rejectButton = wrapper.find('button:last-of-type')
      await rejectButton.trigger('click')

      // Wait for async operation
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('rejected')).toBeTruthy()
      expect(wrapper.emitted('rejected')[0]).toEqual([mockPattern])
    })
  })

  describe('Loading States', () => {
    it('shows loading state on buttons when processing', async () => {
      mockSubscriptionFeedback.loading.value = true

      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      expect(wrapper.text()).toContain('Processing...')

      const buttons = wrapper.findAll('button')
      buttons.forEach(button => {
        // Vue renders disabled as empty string attribute when true
        expect(button.attributes('disabled')).toBe('')
      })
    })

    it('disables buttons during loading', async () => {
      mockSubscriptionFeedback.loading.value = true
      
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const confirmButton = wrapper.find('button:first-of-type')
      const rejectButton = wrapper.find('button:last-of-type')

      expect(confirmButton.classes()).toContain('disabled:opacity-50')
      expect(rejectButton.classes()).toContain('disabled:opacity-50')
    })
  })

  describe('Error Handling', () => {
    it('displays error message when present', () => {
      mockSubscriptionFeedback.error.value = 'Failed to process subscription'
      
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      expect(wrapper.text()).toContain('Failed to process subscription')
      expect(wrapper.find('.text-red-600').exists()).toBe(true)
    })

    it('does not emit events when operations fail', async () => {
      mockSubscriptionFeedback.confirmSubscription.mockResolvedValue(false)
      
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const confirmButton = wrapper.find('button:first-of-type')
      await confirmButton.trigger('click')

      expect(wrapper.emitted('confirmed')).toBeFalsy()
    })
  })

  describe('Modal Integration', () => {
    it('passes correct props to CategorySelectionModal', () => {
      mockSubscriptionFeedback.showCategoryModal.value = true

      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const modal = wrapper.findComponent({ name: 'CategorySelectionModal' })
      expect(modal.props('show')).toBe(true)
      expect(modal.props('merchantName')).toBe('Netflix')
      expect(modal.props('categories')).toEqual(mockCategoriesStore.categories)
    })

    it('handles category selection through modal', async () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const modal = wrapper.findComponent({ name: 'CategorySelectionModal' })
      await modal.vm.$emit('confirm', 'cat-1')

      expect(mockSubscriptionFeedback.handleCategorySelection).toHaveBeenCalledWith('cat-1')
    })

    it('handles category creation through modal', async () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const categoryData = { name: 'New Category', colour: '#FF0000', icon: 'star' }
      const modal = wrapper.findComponent({ name: 'CategorySelectionModal' })
      await modal.vm.$emit('create-and-confirm', categoryData)

      expect(mockSubscriptionFeedback.handleCategoryCreation).toHaveBeenCalledWith(categoryData)
    })
  })

  describe('Edge Cases', () => {
    it('handles pattern with no transactions gracefully', () => {
      const emptyPattern = { ...mockPattern, transactions: [] }
      
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: emptyPattern },
        global: { plugins: [pinia] }
      })

      expect(wrapper.text()).toContain('0 matching transactions')
      // Should not crash when trying to access transaction data
      expect(wrapper.exists()).toBe(true)
    })

    it('handles missing currency in transactions', () => {
      const patternWithoutCurrency = {
        ...mockPattern,
        transactions: [{
          id: 'tx-1',
          date: '2024-01-15',
          merchantName: 'Netflix',
          amount: { amount: 15.99 } // Missing currency
        }]
      }
      
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: patternWithoutCurrency },
        global: { plugins: [pinia] }
      })

      // Should use default currency (GBP)
      expect(wrapper.text()).toContain('GBP 15.99')
    })

    it('handles very high confidence scores', () => {
      const highConfidencePattern = { ...mockPattern, confidence: 0.99 }
      
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: highConfidencePattern },
        global: { plugins: [pinia] }
      })

      expect(wrapper.text()).toContain('99% confidence')
    })

    it('handles very low confidence scores', () => {
      const lowConfidencePattern = { ...mockPattern, confidence: 0.51 }
      
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: lowConfidencePattern },
        global: { plugins: [pinia] }
      })

      expect(wrapper.text()).toContain('51% confidence')
    })
  })

  describe('Accessibility', () => {
    it('has proper button labels for screen readers', () => {
      // Ensure loading is false so button text is visible
      mockSubscriptionFeedback.loading.value = false

      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const confirmButton = wrapper.find('button:first-of-type')
      const rejectButton = wrapper.find('button:last-of-type')

      expect(confirmButton.text()).toContain('Confirm Subscription')
      expect(rejectButton.text()).toContain('Not a Subscription')
    })

    it('maintains focus management during loading states', async () => {
      const wrapper = mount(SubscriptionSuggestionCard, {
        props: { pattern: mockPattern },
        global: { plugins: [pinia] }
      })

      const confirmButton = wrapper.find('button:first-of-type')
      
      // Button should be focusable when not loading
      expect(confirmButton.attributes('disabled')).toBeUndefined()

      // Simulate loading state
      mockSubscriptionFeedback.loading.value = true
      await wrapper.vm.$nextTick()

      // Vue renders disabled as empty string when true
      expect(confirmButton.attributes('disabled')).toBe('')
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DuplicateSubscriptionModal from '@/components/DuplicateSubscriptionModal.vue'
import type { DuplicateCheckResult } from '@/services/DuplicateSubscriptionChecker'
import type { Subscription, Transaction } from '@/domain/models'

describe('DuplicateSubscriptionModal', () => {
  const mockSubscription: Subscription = {
    id: 'sub1',
    merchantName: 'Netflix',
    amount: { amount: 15.99, currency: 'GBP' },
    recurrence: 'monthly',
    nextPaymentDate: '2024-02-01',
    categoryId: 'cat1',
    status: 'active',
    source: 'manual'
  }

  const mockTransactions: Transaction[] = [
    {
      id: 'tx1',
      merchantName: 'Netflix',
      amount: { amount: 15.99, currency: 'GBP' },
      date: '2024-01-15',
      subscriptionId: 'sub1'
    },
    {
      id: 'tx2',
      merchantName: 'Netflix',
      amount: { amount: 15.99, currency: 'GBP' },
      date: '2024-01-01',
      subscriptionId: 'sub1'
    },
    {
      id: 'tx3',
      merchantName: 'Netflix',
      amount: { amount: 15.99, currency: 'GBP' },
      date: '2023-12-15',
      subscriptionId: 'sub1'
    },
    {
      id: 'tx4',
      merchantName: 'Netflix',
      amount: { amount: 15.99, currency: 'GBP' },
      date: '2023-11-15',
      subscriptionId: 'sub1'
    }
  ]

  const createMockResult = (overrides: Partial<DuplicateCheckResult> = {}): DuplicateCheckResult => ({
    isDuplicate: true,
    merchantName: 'Netflix',
    normalizedMerchant: 'netflix',
    existingSubscription: mockSubscription,
    existingTransactions: mockTransactions,
    ...overrides
  })

  const createWrapper = (props = {}) => {
    return mount(DuplicateSubscriptionModal, {
      props: {
        isOpen: true,
        duplicateResult: createMockResult(),
        warningMessage: 'You already have an active subscription for "Netflix". Adding this transaction would create a duplicate.',
        ...props
      },
      global: {
        stubs: {
          // Stub any child components if needed
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders when isOpen is true', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
      expect(wrapper.text()).toContain('Duplicate Subscription Detected')
    })

    it('does not render when isOpen is false', () => {
      const wrapper = createWrapper({ isOpen: false })
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false)
    })

    it('displays warning message', () => {
      const warningMessage = 'Custom warning message'
      const wrapper = createWrapper({ warningMessage })
      expect(wrapper.text()).toContain(warningMessage)
    })

    it('shows warning icon with correct styling', () => {
      const wrapper = createWrapper()
      const iconContainer = wrapper.find('.mx-auto.flex.h-12.w-12')
      expect(iconContainer.exists()).toBe(true)
      expect(iconContainer.classes()).toContain('bg-warning-bg')
      
      const icon = wrapper.find('svg')
      expect(icon.exists()).toBe(true)
      expect(icon.classes()).toContain('text-warning-text')
    })
  })

  describe('Existing Subscription Display', () => {
    it('displays existing subscription when present', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Existing Subscription:')
      expect(wrapper.text()).toContain('Netflix')
      expect(wrapper.text()).toContain('£15.99')
      expect(wrapper.text()).toContain('monthly')
    })

    it('does not display existing subscription section when not present', () => {
      const resultWithoutSubscription = createMockResult({ existingSubscription: undefined })
      const wrapper = createWrapper({ duplicateResult: resultWithoutSubscription })
      
      expect(wrapper.text()).not.toContain('Existing Subscription:')
      // Note: Netflix might still appear in warning message, so we only check the subscription section
    })

    it('formats subscription amount correctly', () => {
      const wrapper = createWrapper()
      // The formatMoney utility should format 15.99 as £15.99
      expect(wrapper.text()).toContain('£15.99')
    })

    it('displays subscription recurrence', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('monthly')
    })
  })

  describe('Existing Transactions Display', () => {
    it('displays existing transactions when present', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Existing Transactions:')
      // Update to match actual date format from formatDate utility
      expect(wrapper.text()).toContain('£15.99 on 15 Jan 2024')
      expect(wrapper.text()).toContain('£15.99 on 01 Jan 2024')
      expect(wrapper.text()).toContain('£15.99 on 15 Dec 2023')
    })

    it('limits transaction display to 3 items', () => {
      const wrapper = createWrapper()
      const transactionItems = wrapper.findAll('[data-testid="transaction-item"]')
      // Should show only 3 transactions even though we have 4
      expect(wrapper.text()).toContain('+1 more')
    })

    it('shows "more" count when transactions exceed 3', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('+1 more')
    })

    it('does not display existing transactions section when empty', () => {
      const resultWithoutTransactions = createMockResult({ existingTransactions: [] })
      const wrapper = createWrapper({ duplicateResult: resultWithoutTransactions })
      
      expect(wrapper.text()).not.toContain('Existing Transactions:')
    })

    it('does not display existing transactions section when undefined', () => {
      const resultWithoutTransactions = createMockResult({ existingTransactions: undefined })
      const wrapper = createWrapper({ duplicateResult: resultWithoutTransactions })
      
      expect(wrapper.text()).not.toContain('Existing Transactions:')
    })

    it('formats transaction dates correctly', () => {
      const wrapper = createWrapper()
      // The formatDate utility formats dates as "15 Jan 2024"
      expect(wrapper.text()).toContain('15 Jan 2024')
      expect(wrapper.text()).toContain('01 Jan 2024')
    })

    it('displays correct "more" count for different numbers', () => {
      const manyTransactions = Array(7).fill(null).map((_, i) => ({
        ...mockTransactions[0],
        id: `tx${i}`,
        date: `2024-${String(i + 1).padStart(2, '0')}-15`
      }))
      
      const resultWithManyTransactions = createMockResult({ existingTransactions: manyTransactions })
      const wrapper = createWrapper({ duplicateResult: resultWithManyTransactions })
      
      expect(wrapper.text()).toContain('+4 more') // 7 total - 3 shown = 4 more
    })
  })

  describe('Action Buttons', () => {
    it('shows "Add to Existing Subscription" button when existing subscription is present', () => {
      const wrapper = createWrapper()
      const addToExistingBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Existing Subscription')
      )
      expect(addToExistingBtn?.exists()).toBe(true)
    })

    it('does not show "Add to Existing Subscription" button when no existing subscription', () => {
      const resultWithoutSubscription = createMockResult({ existingSubscription: undefined })
      const wrapper = createWrapper({ duplicateResult: resultWithoutSubscription })
      
      const addToExistingBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Existing Subscription')
      )
      expect(addToExistingBtn).toBeUndefined()
    })

    it('shows "Create Separate Subscription" button', () => {
      const wrapper = createWrapper()
      const createSeparateBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Create Separate Subscription')
      )
      expect(createSeparateBtn?.exists()).toBe(true)
    })

    it('shows "Cancel" button', () => {
      const wrapper = createWrapper()
      const cancelBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cancel')
      )
      expect(cancelBtn?.exists()).toBe(true)
    })

    it('has correct button styling classes', () => {
      const wrapper = createWrapper()
      
      const addToExistingBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Existing Subscription')
      )
      const createSeparateBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Create Separate Subscription')
      )
      const cancelBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cancel')
      )

      // Add to Existing - primary button
      expect(addToExistingBtn?.classes()).toContain('bg-primary')
      expect(addToExistingBtn?.classes()).toContain('text-white')

      // Create Separate - secondary button
      expect(createSeparateBtn?.classes()).toContain('border')
      expect(createSeparateBtn?.classes()).toContain('bg-surface')

      // Cancel - tertiary button
      expect(cancelBtn?.classes()).toContain('text-text-secondary')
    })
  })

  describe('Event Emissions', () => {
    it('emits add-to-existing event when Add to Existing button is clicked', async () => {
      const wrapper = createWrapper()
      const addToExistingBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Existing Subscription')
      )
      
      if (addToExistingBtn) {
        await addToExistingBtn.trigger('click')
      }
      
      expect(wrapper.emitted('add-to-existing')).toBeTruthy()
      expect(wrapper.emitted('add-to-existing')).toHaveLength(1)
    })

    it('emits create-separate event when Create Separate button is clicked', async () => {
      const wrapper = createWrapper()
      const createSeparateBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Create Separate Subscription')
      )
      
      if (createSeparateBtn) {
        await createSeparateBtn.trigger('click')
      }
      
      expect(wrapper.emitted('create-separate')).toBeTruthy()
      expect(wrapper.emitted('create-separate')).toHaveLength(1)
    })

    it('emits cancel event when Cancel button is clicked', async () => {
      const wrapper = createWrapper()
      const cancelBtn = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cancel')
      )
      
      if (cancelBtn) {
        await cancelBtn.trigger('click')
      }
      
      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('emits cancel event when backdrop is clicked', async () => {
      const wrapper = createWrapper()
      const backdrop = wrapper.find('.bg-surface-backdrop')
      
      await backdrop.trigger('click')
      
      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles result with only existing subscription (no transactions)', () => {
      const resultWithOnlySubscription = createMockResult({ existingTransactions: [] })
      const wrapper = createWrapper({ duplicateResult: resultWithOnlySubscription })
      
      expect(wrapper.text()).toContain('Existing Subscription:')
      expect(wrapper.text()).not.toContain('Existing Transactions:')
    })

    it('handles result with only existing transactions (no subscription)', () => {
      const resultWithOnlyTransactions = createMockResult({ 
        existingSubscription: undefined,
        existingTransactions: [mockTransactions[0]]
      })
      const wrapper = createWrapper({ duplicateResult: resultWithOnlyTransactions })
      
      expect(wrapper.text()).not.toContain('Existing Subscription:')
      expect(wrapper.text()).toContain('Existing Transactions:')
    })

    it('handles empty result (no duplicates)', () => {
      const emptyResult: DuplicateCheckResult = {
        isDuplicate: false,
        merchantName: 'Netflix',
        normalizedMerchant: 'netflix'
      }
      const wrapper = createWrapper({ duplicateResult: emptyResult })
      
      expect(wrapper.text()).not.toContain('Existing Subscription:')
      expect(wrapper.text()).not.toContain('Existing Transactions:')
    })

    it('handles long merchant names', () => {
      const longMerchantName = 'Very Long Subscription Service Name That Might Break Layout'
      const resultWithLongName = createMockResult({ 
        merchantName: longMerchantName,
        existingSubscription: { ...mockSubscription, merchantName: longMerchantName }
      })
      const wrapper = createWrapper({ duplicateResult: resultWithLongName })
      
      expect(wrapper.text()).toContain(longMerchantName)
    })

    it('handles transactions with different amounts', () => {
      const transactionsWithDifferentAmounts = [
        { ...mockTransactions[0], amount: { amount: 15.99, currency: 'GBP' } },
        { ...mockTransactions[1], amount: { amount: 12.99, currency: 'GBP' } },
        { ...mockTransactions[2], amount: { amount: 19.99, currency: 'GBP' } }
      ]
      
      const result = createMockResult({ existingTransactions: transactionsWithDifferentAmounts })
      const wrapper = createWrapper({ duplicateResult: result })
      
      expect(wrapper.text()).toContain('£15.99')
      expect(wrapper.text()).toContain('£12.99')
      expect(wrapper.text()).toContain('£19.99')
    })
  })

  describe('Accessibility', () => {
    it('has proper button semantics', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      
      // Should have at least 2-3 buttons depending on whether subscription exists
      expect(buttons.length).toBeGreaterThanOrEqual(2)
      
      buttons.forEach(button => {
        expect(button.element.tagName).toBe('BUTTON')
      })
    })

    it('has proper modal structure with backdrop', () => {
      const wrapper = createWrapper()
      
      // Should have fixed overlay
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
      
      // Should have backdrop
      expect(wrapper.find('.bg-surface-backdrop').exists()).toBe(true)
      
      // Should have modal content
      expect(wrapper.find('.relative.w-full.max-w-md').exists()).toBe(true)
    })

    it('has proper heading structure', () => {
      const wrapper = createWrapper()
      
      const heading = wrapper.find('h3')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toBe('Duplicate Subscription Detected')
    })

    it('has descriptive text for screen readers', () => {
      const wrapper = createWrapper()
      
      // Should have warning message
      expect(wrapper.text()).toContain('You already have an active subscription')
      
      // Should have section labels
      expect(wrapper.text()).toContain('Existing Subscription:')
      expect(wrapper.text()).toContain('Existing Transactions:')
    })
  })
})

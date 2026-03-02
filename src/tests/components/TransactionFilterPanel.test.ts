import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionFilterPanel from '@/components/transactions/TransactionFilterPanel.vue'
import type { BankAccount, Category } from '@/domain/models'
import type { TransactionFilterConfig } from '@/stores/transactions'

describe('TransactionFilterPanel', () => {
  // Mock data for testing
  const mockAccounts: BankAccount[] = [
    {
      id: 'acc1',
      institutionId: 'inst_123',
      institutionName: 'Test Bank',
      accountName: 'Checking Account',
      accountType: 'checking',
      mask: '1234',
      currency: 'USD',
      balance: { amount: 1000, currency: 'USD' },
      status: 'connected'
    }
  ]

  const mockCategories: Category[] = [
    { id: 'cat1', name: 'Entertainment', colour: '#E91E63' },
    { id: 'cat2', name: 'Food', colour: '#2196F3' }
  ]

  const mockFilters: TransactionFilterConfig = {
    selectedAccount: '',
    subscriptionFilter: 'all',
    merchantSearch: '',
    dateRange: { start: '', end: '' },
    amountRange: { min: 0, max: 0 },
    categories: []
  }

  const createWrapper = (props = {}) => {
    return mount(TransactionFilterPanel, {
      props: {
        filters: mockFilters,
        accounts: mockAccounts,
        categories: mockCategories,
        activeFilterCount: 0,
        ...props
      },
      global: {
        stubs: {
          // Stub any child components if needed
        }
      }
    })
  }

  describe('Mode-specific Apply Button Visibility', () => {
    it('shows apply-filters-btn when mode is manual', () => {
      const wrapper = createWrapper({ mode: 'manual' })
      
      const applyButton = wrapper.find('[data-testid="apply-filters-btn"]')
      expect(applyButton.exists()).toBe(true)
      expect(applyButton.isVisible()).toBe(true)
      expect(applyButton.text()).toContain('Apply Filters')
    })

    it('hides apply-filters-btn when mode is realtime (default)', () => {
      const wrapper = createWrapper() // mode defaults to 'realtime'
      
      const applyButton = wrapper.find('[data-testid="apply-filters-btn"]')
      expect(applyButton.exists()).toBe(false)
    })

    it('hides apply-filters-btn when mode is explicitly set to realtime', () => {
      const wrapper = createWrapper({ mode: 'realtime' })
      
      const applyButton = wrapper.find('[data-testid="apply-filters-btn"]')
      expect(applyButton.exists()).toBe(false)
    })

    it('shows clear-all-btn in manual mode', () => {
      const wrapper = createWrapper({ mode: 'manual' })
      
      const clearAllButton = wrapper.find('[data-testid="clear-all-btn"]')
      expect(clearAllButton.exists()).toBe(true)
      expect(clearAllButton.isVisible()).toBe(true)
      expect(clearAllButton.text()).toContain('Clear All')
    })
  })

  describe('Component Rendering', () => {
    it('renders filter inputs correctly', () => {
      const wrapper = createWrapper()
      
      // Check for key filter inputs
      expect(wrapper.find('[data-testid="account-filter"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="subscription-filter"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="merchant-search"]').exists()).toBe(true)
    })

    it('renders correct title and filter count', () => {
      const wrapper = createWrapper({ activeFilterCount: 3 })
      
      expect(wrapper.text()).toContain('Filters')
      expect(wrapper.text()).toContain('Transactions')
      expect(wrapper.text()).toContain('3 active')
    })
  })

  describe('Interactions & Emits', () => {
    it('emits "apply-filters" when apply button is clicked', async () => {
      const wrapper = createWrapper({ mode: 'manual' })
      await wrapper.find('[data-testid="apply-filters-btn"]').trigger('click')
      
      expect(wrapper.emitted()).toHaveProperty('apply-filters')
      expect(wrapper.emitted('apply-filters')).toHaveLength(1)
    })

    it('emits "clear-all" when clear all button is clicked in manual mode', async () => {
      const wrapper = createWrapper({ mode: 'manual' })
      await wrapper.find('[data-testid="clear-all-btn"]').trigger('click')
      
      expect(wrapper.emitted()).toHaveProperty('clear-all')
      expect(wrapper.emitted('clear-all')).toHaveLength(1)
    })

    it('emits "clear-all" when clear button is clicked in header', async () => {
      const wrapper = createWrapper({ activeFilterCount: 2 })
      const clearButton = wrapper.findAll('button').find(btn => btn.text() === 'Clear')
      await clearButton?.trigger('click')
      
      expect(wrapper.emitted()).toHaveProperty('clear-all')
      expect(wrapper.emitted('clear-all')).toHaveLength(1)
    })

    it('emits "update:merchantSearch" when user types in search box', async () => {
      const wrapper = createWrapper()
      const input = wrapper.find('[data-testid="merchant-search"]')
      
      await input.setValue('Amazon')
      
      expect(wrapper.emitted()).toHaveProperty('update:merchantSearch')
      expect(wrapper.emitted('update:merchantSearch')?.[0]).toEqual(['Amazon'])
    })

    it('emits "update:selectedAccount" when account filter is changed', async () => {
      const wrapper = createWrapper()
      const select = wrapper.find('[data-testid="account-filter"]')
      
      await select.setValue('acc1')
      
      expect(wrapper.emitted()).toHaveProperty('update:selectedAccount')
      expect(wrapper.emitted('update:selectedAccount')?.[0]).toEqual(['acc1'])
    })

    it('emits "update:subscriptionFilter" when subscription filter is changed', async () => {
      const wrapper = createWrapper()
      const select = wrapper.find('[data-testid="subscription-filter"]')
      
      await select.setValue('subscriptions')
      
      expect(wrapper.emitted()).toHaveProperty('update:subscriptionFilter')
      expect(wrapper.emitted('update:subscriptionFilter')?.[0]).toEqual(['subscriptions'])
    })

    it('emits "update:dateRange" when date inputs are changed', async () => {
      const wrapper = createWrapper()
      
      // Update start date
      const dateInputs = wrapper.findAll('input[type="date"]')
      const startDateInput = dateInputs[0]
      await startDateInput.setValue('2024-01-01')
      
      expect(wrapper.emitted()).toHaveProperty('update:dateRange')
      expect(wrapper.emitted('update:dateRange')?.[0]).toEqual([{
        start: '2024-01-01',
        end: ''
      }])
    })

    it('emits "update:amountRange" when amount inputs are changed', async () => {
      const wrapper = createWrapper()
      
      // Update min amount
      const numberInputs = wrapper.findAll('input[type="number"]')
      const minAmountInput = numberInputs[0]
      await minAmountInput.setValue('100')
      
      expect(wrapper.emitted()).toHaveProperty('update:amountRange')
      expect(wrapper.emitted('update:amountRange')?.[0]).toEqual([{
        min: 100,
        max: 0
      }])
    })

    it('emits "update:categories" when category is toggled', async () => {
      const wrapper = createWrapper()
      const categoryButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Entertainment')
      )
      
      await categoryButton?.trigger('click')
      
      expect(wrapper.emitted()).toHaveProperty('update:categories')
      expect(wrapper.emitted('update:categories')?.[0]).toEqual([['cat1']])
    })
  })

  describe('All Categories Modal', () => {
    it('renders modal content when attached to document body', async () => {
      // IMPORTANT: Testing Teleported content requires attachTo: document.body
      // By default, Vue Test Utils does not render Teleports into the document body
      // This ensures the modal content is actually present in the DOM during testing
      const wrapper = mount(TransactionFilterPanel, {
        props: {
          filters: mockFilters,
          accounts: mockAccounts,
          categories: mockCategories,
          activeFilterCount: 0
        },
        attachTo: document.body
      })
      
      // Initially modal should not be visible
      expect(document.body.querySelector('.fixed.inset-0')).toBeNull()
      
      // Find and click the "All Categories" button if there are more than 8 categories
      const manyCategories = Array.from({ length: 10 }, (_, i) => ({
        id: `cat${i}`,
        name: `Category ${i}`,
        colour: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }))
      
      await wrapper.setProps({ categories: manyCategories })
      await wrapper.vm.$nextTick()
      
      const allCategoriesBtn = wrapper.find('[aria-label*="All"]')
      if (allCategoriesBtn.exists()) {
        await allCategoriesBtn.trigger('click')
        await wrapper.vm.$nextTick()
        
        // Now the modal should be teleported to document.body
        const modal = document.body.querySelector('.fixed.inset-0')
        expect(modal).toBeTruthy()
        expect(modal?.textContent).toContain('All Categories')
      }
      
      wrapper.unmount()
    })
  })

  describe('Mode Behavior', () => {
    it('shows pending filter count in manual mode when filters are active', () => {
      const wrapper = createWrapper({ 
        mode: 'manual', 
        activeFilterCount: 2 
      })
      
      expect(wrapper.text()).toContain('2 filters pending')
    })

    it('shows singular "1 filter pending" when only one filter is active in manual mode', () => {
      const wrapper = createWrapper({ 
        mode: 'manual', 
        activeFilterCount: 1 
      })
      
      expect(wrapper.text()).toContain('1 filter pending')
      expect(wrapper.text()).not.toContain('1 filters pending')
    })

    it('does not show pending filter count in realtime mode', () => {
      const wrapper = createWrapper({ 
        mode: 'realtime', 
        activeFilterCount: 2 
      })
      
      expect(wrapper.text()).not.toContain('filters pending')
    })
  })
})

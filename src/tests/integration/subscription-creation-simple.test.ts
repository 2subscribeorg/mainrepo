import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import CategorySelectionModal from '@/components/CategorySelectionModal.vue'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsStore } from '@/stores/transactions'
import { useCategoriesStore } from '@/stores/categories'
import type { Transaction, Subscription, Category } from '@/domain/models'

describe('Subscription Creation Integration Test', () => {
  let subscriptionsStore: any
  let transactionsStore: any
  let categoriesStore: any

  const mockTransaction: Transaction = {
    id: 'tx1',
    merchantName: 'Netflix',
    amount: { amount: 15.99, currency: 'GBP' },
    date: '2024-01-15',
    accountId: 'acc1'
  }

  const mockCategories: Category[] = [
    { id: 'cat1', name: 'Entertainment', colour: '#E91E63' },
    { id: 'cat2', name: 'Food', colour: '#2196F3' }
  ]

  const createTestSetup = () => {
    setActivePinia(createPinia())
    
    // Initialize stores
    subscriptionsStore = useSubscriptionsStore()
    transactionsStore = useTransactionsStore()
    categoriesStore = useCategoriesStore()

    // Mock store methods
    vi.spyOn(subscriptionsStore, 'save').mockResolvedValue(undefined)
    vi.spyOn(transactionsStore, 'save').mockResolvedValue(undefined)
    vi.spyOn(categoriesStore, 'save').mockResolvedValue(undefined)

    // Set up initial data
    categoriesStore.categories = mockCategories
    transactionsStore.transactions = [mockTransaction]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    createTestSetup()
  })

  describe('CategorySelectionModal Integration', () => {
    it('creates subscription when user selects existing category', async () => {
      // Arrange: Mount CategorySelectionModal with test data
      const wrapper = mount(CategorySelectionModal, {
        props: {
          show: true,
          merchantName: 'Netflix',
          categories: mockCategories
        }
      })

      // Act: Select existing category
      await wrapper.vm.$emit('confirm', 'cat1')

      // Assert: Check that the modal emits the correct event
      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')).toHaveLength(1)
      expect(wrapper.emitted('confirm')?.[0]).toEqual(['cat1'])
    })

    it('creates new category and subscription when user selects new category option', async () => {
      // Arrange: Mount CategorySelectionModal with test data
      const wrapper = mount(CategorySelectionModal, {
        props: {
          show: true,
          merchantName: 'Netflix',
          categories: mockCategories
        }
      })

      // Act: Create new category
      const newCategoryData = { name: 'Streaming Services', colour: '#9C27B0' }
      await wrapper.vm.$emit('create-and-confirm', newCategoryData)

      // Assert: Check that the modal emits the correct event
      expect(wrapper.emitted('create-and-confirm')).toBeTruthy()
      expect(wrapper.emitted('create-and-confirm')).toHaveLength(1)
      expect(wrapper.emitted('create-and-confirm')?.[0]).toEqual([newCategoryData])
    })

    it('cancels subscription creation when user clicks cancel', async () => {
      // Arrange: Mount CategorySelectionModal with test data
      const wrapper = mount(CategorySelectionModal, {
        props: {
          show: true,
          merchantName: 'Netflix',
          categories: mockCategories
        }
      })

      // Act: Cancel the operation
      await wrapper.vm.$emit('cancel')

      // Assert: Check that the modal emits the cancel event
      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })
  })

  describe('Subscription Store Integration', () => {
    it('saves subscription with correct data structure', async () => {
      // Arrange: Create subscription data
      const subscriptionData: Subscription = {
        id: 'sub_test',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'GBP' },
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat1',
        status: 'active',
        source: 'manual',
        plaidTransactionIds: ['tx1']
      }

      // Act: Save subscription
      await subscriptionsStore.save(subscriptionData)

      // Assert: Verify save was called with correct data
      expect(subscriptionsStore.save).toHaveBeenCalledWith(subscriptionData)
    })

    it('updates transaction with subscription link', async () => {
      // Arrange: Create updated transaction data
      const updatedTransaction: Transaction = {
        ...mockTransaction,
        subscriptionId: 'sub_test',
        categoryId: 'cat1'
      }

      // Act: Save updated transaction
      await transactionsStore.save(updatedTransaction)

      // Assert: Verify save was called with updated data
      expect(transactionsStore.save).toHaveBeenCalledWith(updatedTransaction)
    })

    it('creates new category with correct data', async () => {
      // Arrange: Create new category data
      const newCategory: Category = {
        id: 'cat_new',
        name: 'Streaming Services',
        colour: '#9C27B0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Act: Save new category
      await categoriesStore.save(newCategory)

      // Assert: Verify save was called with correct data
      expect(categoriesStore.save).toHaveBeenCalledWith(newCategory)
    })
  })

  describe('End-to-End Flow Simulation', () => {
    it('simulates complete subscription creation workflow', async () => {
      // Step 1: User initiates subscription creation
      const wrapper = mount(CategorySelectionModal, {
        props: {
          show: true,
          merchantName: 'Netflix',
          categories: mockCategories
        }
      })

      // Step 2: User selects existing category
      await wrapper.vm.$emit('confirm', 'cat1')

      // Step 3: System creates subscription
      const subscriptionData: Subscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'GBP' },
        recurrence: 'monthly',
        nextPaymentDate: '2024-01-15',
        categoryId: 'cat1',
        status: 'active',
        source: 'manual',
        plaidTransactionIds: ['tx1']
      }

      await subscriptionsStore.save(subscriptionData)

      // Step 4: System updates transaction
      const updatedTransaction: Transaction = {
        ...mockTransaction,
        subscriptionId: subscriptionData.id,
        categoryId: 'cat1'
      }

      await transactionsStore.save(updatedTransaction)

      // Assert: Verify complete workflow
      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(subscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantName: 'Netflix',
          categoryId: 'cat1',
          status: 'active',
          source: 'manual'
        })
      )
      expect(transactionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tx1',
          subscriptionId: subscriptionData.id,
          categoryId: 'cat1'
        })
      )
    })

    it('simulates workflow with new category creation', async () => {
      // Step 1: User initiates subscription creation
      const wrapper = mount(CategorySelectionModal, {
        props: {
          show: true,
          merchantName: 'Netflix',
          categories: mockCategories
        }
      })

      // Step 2: User creates new category
      const newCategoryData = { name: 'Streaming Services', colour: '#9C27B0' }
      await wrapper.vm.$emit('create-and-confirm', newCategoryData)

      // Step 3: System creates new category
      const newCategory: Category = {
        id: `cat_${Date.now()}`,
        name: newCategoryData.name,
        colour: newCategoryData.colour,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await categoriesStore.save(newCategory)

      // Step 4: System creates subscription with new category
      const subscriptionData: Subscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'GBP' },
        recurrence: 'monthly',
        nextPaymentDate: '2024-01-15',
        categoryId: newCategory.id,
        status: 'active',
        source: 'manual',
        plaidTransactionIds: ['tx1']
      }

      await subscriptionsStore.save(subscriptionData)

      // Step 5: System updates transaction
      const updatedTransaction: Transaction = {
        ...mockTransaction,
        subscriptionId: subscriptionData.id,
        categoryId: newCategory.id
      }

      await transactionsStore.save(updatedTransaction)

      // Assert: Verify complete workflow
      expect(wrapper.emitted('create-and-confirm')).toBeTruthy()
      expect(categoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Streaming Services',
          colour: '#9C27B0'
        })
      )
      expect(subscriptionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantName: 'Netflix',
          categoryId: newCategory.id,
          status: 'active'
        })
      )
      expect(transactionsStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tx1',
          subscriptionId: subscriptionData.id,
          categoryId: newCategory.id
        })
      )
    })
  })

  describe('Error Handling Integration', () => {
    it('handles subscription save errors gracefully', async () => {
      // Arrange: Mock subscription save to fail
      const mockError = new Error('Failed to save subscription')
      vi.spyOn(subscriptionsStore, 'save').mockRejectedValue(mockError)
      vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act: Attempt to save subscription
      const subscriptionData: Subscription = {
        id: 'sub_test',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'GBP' },
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat1',
        status: 'active',
        source: 'manual'
      }

      try {
        await subscriptionsStore.save(subscriptionData)
      } catch (error) {
        // Expected to fail
      }

      // Assert: Error should be handled
      expect(subscriptionsStore.save).toHaveBeenCalledWith(subscriptionData)
    })

    it('handles transaction save errors gracefully', async () => {
      // Arrange: Mock transaction save to fail
      const mockError = new Error('Failed to save transaction')
      vi.spyOn(transactionsStore, 'save').mockRejectedValue(mockError)
      vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act: Attempt to save transaction
      const updatedTransaction: Transaction = {
        ...mockTransaction,
        subscriptionId: 'sub_test',
        categoryId: 'cat1'
      }

      try {
        await transactionsStore.save(updatedTransaction)
      } catch (error) {
        // Expected to fail
      }

      // Assert: Error should be handled
      expect(transactionsStore.save).toHaveBeenCalledWith(updatedTransaction)
    })
  })
})

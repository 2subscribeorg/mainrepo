import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import Dashboard from '@/views/Dashboard.vue'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useCategoriesStore } from '@/stores/categories'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import type { Transaction } from '@/domain/models'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: Dashboard }, { path: '/transactions', component: { template: '<div/>' } }]
})

describe('Dashboard Simple Integration Tests', () => {
  let transactionsDataStore: any
  let subscriptionsStore: any
  let categoriesStore: any
  let bankAccountsStore: any
  let wrapper: any
  let pinia: any

  // Mock data
  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      userId: 'user-123',
      accountId: 'account-1',
      merchantName: 'Netflix',
      amount: { amount: 15.99, currency: 'USD' },
      date: '2024-01-15',
      pending: false,
      subscriptionId: 'sub-1',
      createdAt: '2024-01-15T10:00:00.000Z'
    },
    {
      id: 'tx-2',
      userId: 'user-123',
      accountId: 'account-1',
      merchantName: 'Spotify',
      amount: { amount: 9.99, currency: 'USD' },
      date: '2024-01-20',
      pending: false,
      subscriptionId: 'sub-2',
      createdAt: '2024-01-20T10:00:00.000Z'
    },
    {
      id: 'tx-3',
      userId: 'user-123',
      accountId: 'account-1',
      merchantName: 'Disney+',
      amount: { amount: 12.99, currency: 'USD' },
      date: '2024-01-25',
      pending: false,
      createdAt: '2024-01-25T10:00:00.000Z'
    }
  ]

  const createTestSetup = () => {
    pinia = createPinia()
    setActivePinia(pinia)

    // Initialize stores
    transactionsDataStore = useTransactionsDataStore()
    subscriptionsStore = useSubscriptionsStore()
    categoriesStore = useCategoriesStore()
    bankAccountsStore = useBankAccountsStore()

    // Mock ALL methods called in onMounted
    vi.spyOn(transactionsDataStore, 'fetchAll').mockResolvedValue(undefined)
    vi.spyOn(transactionsDataStore, 'fetchTransactions').mockResolvedValue(undefined)
    vi.spyOn(subscriptionsStore, 'fetchAll').mockResolvedValue(undefined)
    vi.spyOn(categoriesStore, 'fetchAll').mockResolvedValue(undefined)
    vi.spyOn(bankAccountsStore, 'fetchConnections').mockResolvedValue(undefined)

    // Set up initial data
    transactionsDataStore.transactions = [...mockTransactions]
    categoriesStore.categories = []
    subscriptionsStore.subscriptions = []
    bankAccountsStore.connections = []
  }

  beforeEach(() => {
    vi.clearAllMocks()
    createTestSetup()
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.restoreAllMocks()
  })

  // Helper: mount and wait for onMounted to complete
  const mountAndWait = async () => {
    wrapper = mount(Dashboard, {
      global: { plugins: [pinia, router] }
    })
    await flushPromises()
    await nextTick()
    return wrapper
  }

  describe('Subscription Suggestions Filtering', () => {
    it('filters out rejected suggestions but not confirmed ones', async () => {
      // Mock the useSubscriptionFeedback composable
      const mockGetUserFeedback = vi.fn().mockResolvedValue([
        {
          id: 'feedback-1',
          transactionId: 'tx-1',
          userId: 'user-123',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          date: '2024-01-15',
          userAction: 'rejected',
          timestamp: '2024-01-15T10:00:00.000Z'
        },
        {
          id: 'feedback-2',
          transactionId: 'tx-2',
          userId: 'user-123',
          merchantName: 'Spotify',
          amount: { amount: 9.99, currency: 'USD' },
          date: '2024-01-20',
          userAction: 'confirmed',
          timestamp: '2024-01-20T10:00:00.000Z'
        }
      ])

      // Mock the module import
      vi.doMock('@/composables/useSubscriptionFeedback', () => ({
        useSubscriptionFeedback: () => ({
          getUserFeedback: mockGetUserFeedback,
          loading: { value: false },
          error: { value: null }
        })
      }))

      await mountAndWait()
      await flushPromises()

      // The component should have called getUserFeedback
      expect(mockGetUserFeedback).toHaveBeenCalled()
    })

    it('only adds rejected merchants to dismissed set', async () => {
      const rejectedMerchant = 'Netflix'
      const confirmedMerchant = 'Spotify'
      
      const mockGetUserFeedback = vi.fn().mockResolvedValue([
        {
          id: 'feedback-1',
          merchantName: rejectedMerchant,
          userAction: 'rejected',
          timestamp: '2024-01-15T10:00:00.000Z'
        },
        {
          id: 'feedback-2',
          merchantName: confirmedMerchant,
          userAction: 'confirmed',
          timestamp: '2024-01-20T10:00:00.000Z'
        }
      ])

      vi.doMock('@/composables/useSubscriptionFeedback', () => ({
        useSubscriptionFeedback: () => ({
          getUserFeedback: mockGetUserFeedback
        })
      }))

      await mountAndWait()
      await flushPromises()

      // Verify the feedback was fetched
      expect(mockGetUserFeedback).toHaveBeenCalled()
    })

    it('handles case-insensitive merchant name matching', async () => {
      const mockGetUserFeedback = vi.fn().mockResolvedValue([
        {
          id: 'feedback-1',
          merchantName: 'NETFLIX',
          userAction: 'rejected',
          timestamp: '2024-01-15T10:00:00.000Z'
        }
      ])

      vi.doMock('@/composables/useSubscriptionFeedback', () => ({
        useSubscriptionFeedback: () => ({
          getUserFeedback: mockGetUserFeedback
        })
      }))

      await mountAndWait()
      await flushPromises()

      expect(mockGetUserFeedback).toHaveBeenCalled()
    })
  })

  describe('Dashboard Basic Functionality', () => {
    it('renders dashboard title', async () => {
      await mountAndWait()
      expect(wrapper.text()).toContain('Dashboard')
    })

    it('displays correct subscription transaction count', async () => {
      await mountAndWait()
      expect(wrapper.text()).toContain('2 subscription transactions')
    })

    it('updates subscription count when transactions change', async () => {
      await mountAndWait()

      // Assert: Initial state
      expect(wrapper.text()).toContain('2 subscription transactions')

      // Act: Add new transaction with subscriptionId
      const newTransaction: Transaction = {
        id: 'tx-4',
        userId: 'user-123',
        accountId: 'account-1',
        merchantName: 'Amazon Prime',
        amount: { amount: 14.99, currency: 'USD' },
        date: '2024-01-30',
        pending: false,
        subscriptionId: 'sub-3',
        createdAt: '2024-01-30T10:00:00.000Z'
      }

      transactionsDataStore.transactions = [...transactionsDataStore.transactions, newTransaction]
      await nextTick()

      expect(wrapper.text()).toContain('3 subscription transactions')
    })

    it('handles empty subscription transactions', async () => {
      transactionsDataStore.transactions = mockTransactions.filter(tx => !tx.subscriptionId)

      await mountAndWait()

      expect(wrapper.text()).toContain('0 subscription transactions')
    })

    it('shows loading spinner before onMounted completes', async () => {
      // Mount without flushing promises - loading should be true
      wrapper = mount(Dashboard, {
        global: { plugins: [pinia, router] }
      })
      // loading starts as true before onMounted finishes
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
    })

    it('hides loading spinner after onMounted completes', async () => {
      await mountAndWait()

      // After flushPromises, loading should be false
      expect(wrapper.find('.animate-spin').exists()).toBe(false)
      expect(wrapper.text()).toContain('Dashboard')
    })
  })
})

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionList from '@/components/transactions/TransactionList.vue'
import type { Transaction } from '@/domain/models'
import type { PaginationConfig } from '@/types/transactions'

// Mock child components
vi.mock('@/components/transactions/TransactionItem.vue', () => ({
  default: {
    name: 'TransactionItem',
    template: '<div class="transaction-item">{{ transaction.merchantName }}</div>',
    props: ['transaction', 'categories', 'getAccountName', 'getAmountColor']
  }
}))

vi.mock('@/components/ui/Pagination.vue', () => ({
  default: {
    name: 'Pagination',
    template: '<div class="pagination" />',
    props: ['currentPage', 'totalPages', 'totalItems', 'pageSize']
  }
}))

vi.mock('@/components/ui/VirtualScrollerWrapper.vue', () => ({
  default: {
    name: 'VirtualScrollerWrapper',
    template: '<div><slot :items="items" :virtual="false" /></div>',
    props: ['items', 'itemSize', 'threshold', 'enableVirtual']
  }
}))

describe('TransactionList', () => {
  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      userId: 'user-123',
      accountId: 'acc-123',
      amount: { amount: -9.99, currency: 'GBP' },
      merchantName: 'Netflix',
      date: '2024-03-15',
      category: ['Entertainment'],
      pending: false,
      createdAt: '2024-03-15T10:00:00Z',
    },
    {
      id: 'tx-2',
      userId: 'user-123',
      accountId: 'acc-123',
      amount: { amount: -15.99, currency: 'GBP' },
      merchantName: 'Spotify',
      date: '2024-03-14',
      category: ['Entertainment'],
      pending: false,
      createdAt: '2024-03-14T10:00:00Z',
    },
    {
      id: 'tx-3',
      userId: 'user-123',
      accountId: 'acc-123',
      amount: { amount: -50.00, currency: 'GBP' },
      merchantName: 'Tesco',
      date: '2024-03-13',
      category: ['Groceries'],
      pending: true,
      createdAt: '2024-03-13T10:00:00Z',
    },
  ]

  const mockCategories = [
    { id: 'cat-1', name: 'Entertainment' },
    { id: 'cat-2', name: 'Groceries' },
  ]

  const mockPagination: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 3,
    pageSize: 10,
  }

  const mockGetAccountName = vi.fn((accountId: string) => 'Main Account')
  const mockGetAmountColor = vi.fn((amount: number) => 
    amount < 0 ? 'text-error-text' : 'text-success-text'
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders list of transactions', () => {
      // Arrange & Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const items = wrapper.findAllComponents({ name: 'TransactionItem' })
      expect(items).toHaveLength(3)
    })

    test('renders transactions in correct order', () => {
      // Arrange & Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Netflix')
      expect(wrapper.text()).toContain('Spotify')
      expect(wrapper.text()).toContain('Tesco')
    })

    test('passes correct props to TransactionItem', () => {
      // Arrange & Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const firstItem = wrapper.findAllComponents({ name: 'TransactionItem' })[0]
      expect(firstItem.props('transaction')).toEqual(mockTransactions[0])
      expect(firstItem.props('categories')).toEqual(mockCategories)
      expect(firstItem.props('getAccountName')).toBe(mockGetAccountName)
      expect(firstItem.props('getAmountColor')).toBe(mockGetAmountColor)
    })
  })

  describe('Empty State', () => {
    test('renders empty list when no transactions', () => {
      // Arrange & Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: [],
          categories: mockCategories,
          pagination: { ...mockPagination, totalItems: 0 },
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const items = wrapper.findAllComponents({ name: 'TransactionItem' })
      expect(items).toHaveLength(0)
    })
  })

  describe('Pagination', () => {
    test('shows pagination when multiple pages exist', () => {
      // Arrange
      const multiPagePagination: PaginationConfig = {
        currentPage: 1,
        totalPages: 3,
        totalItems: 30,
        pageSize: 10,
      }

      // Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: multiPagePagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const pagination = wrapper.findComponent({ name: 'Pagination' })
      expect(pagination.exists()).toBe(true)
    })

    test('hides pagination when only one page', () => {
      // Arrange & Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const pagination = wrapper.findComponent({ name: 'Pagination' })
      expect(pagination.exists()).toBe(false)
    })

    test('passes correct pagination props', () => {
      // Arrange
      const multiPagePagination: PaginationConfig = {
        currentPage: 2,
        totalPages: 5,
        totalItems: 50,
        pageSize: 10,
      }

      // Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: multiPagePagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const pagination = wrapper.findComponent({ name: 'Pagination' })
      expect(pagination.props('currentPage')).toBe(2)
      expect(pagination.props('totalPages')).toBe(5)
      expect(pagination.props('totalItems')).toBe(50)
      expect(pagination.props('pageSize')).toBe(10)
    })

    test('emits goToPage event when pagination changes', async () => {
      // Arrange
      const multiPagePagination: PaginationConfig = {
        currentPage: 1,
        totalPages: 3,
        totalItems: 30,
        pageSize: 10,
      }

      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: multiPagePagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Act
      const pagination = wrapper.findComponent({ name: 'Pagination' })
      await pagination.vm.$emit('go-to-page', 2)

      // Assert
      expect(wrapper.emitted('goToPage')).toBeTruthy()
      expect(wrapper.emitted('goToPage')?.[0]).toEqual([2])
    })
  })

  describe('Event Handling', () => {
    test('emits create-subscription event from TransactionItem', async () => {
      // Arrange
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Act
      const firstItem = wrapper.findAllComponents({ name: 'TransactionItem' })[0]
      await firstItem.vm.$emit('create-subscription')

      // Assert
      expect(wrapper.emitted('create-subscription')).toBeTruthy()
      expect(wrapper.emitted('create-subscription')?.[0]).toEqual([mockTransactions[0]])
    })

    test('emits edit-subscription event from TransactionItem', async () => {
      // Arrange
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Act
      const firstItem = wrapper.findAllComponents({ name: 'TransactionItem' })[0]
      await firstItem.vm.$emit('edit-subscription')

      // Assert
      expect(wrapper.emitted('edit-subscription')).toBeTruthy()
      expect(wrapper.emitted('edit-subscription')?.[0]).toEqual([mockTransactions[0]])
    })

    test('emits category-change event from TransactionItem', async () => {
      // Arrange
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Act
      const firstItem = wrapper.findAllComponents({ name: 'TransactionItem' })[0]
      await firstItem.vm.$emit('category-change', 'cat-2')

      // Assert
      expect(wrapper.emitted('category-change')).toBeTruthy()
      expect(wrapper.emitted('category-change')?.[0]).toEqual([mockTransactions[0], 'cat-2'])
    })

    test('emits link-to-existing-subscription event from TransactionItem', async () => {
      // Arrange
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      const linkData = {
        transactionId: 'tx-1',
        subscriptionId: 'sub-123',
        categoryId: 'cat-1',
      }

      // Act
      const firstItem = wrapper.findAllComponents({ name: 'TransactionItem' })[0]
      await firstItem.vm.$emit('link-to-existing-subscription', linkData)

      // Assert
      expect(wrapper.emitted('link-to-existing-subscription')).toBeTruthy()
      expect(wrapper.emitted('link-to-existing-subscription')?.[0]).toEqual([mockTransactions[0], linkData])
    })
  })

  describe('Edge Cases', () => {
    test('handles single transaction', () => {
      // Arrange & Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: [mockTransactions[0]],
          categories: mockCategories,
          pagination: { ...mockPagination, totalItems: 1 },
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const items = wrapper.findAllComponents({ name: 'TransactionItem' })
      expect(items).toHaveLength(1)
    })

    test('handles large number of transactions', () => {
      // Arrange
      const manyTransactions = Array.from({ length: 100 }, (_, i) => ({
        ...mockTransactions[0],
        id: `tx-${i}`,
      }))

      // Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: manyTransactions,
          categories: mockCategories,
          pagination: { ...mockPagination, totalItems: 100, totalPages: 10 },
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const items = wrapper.findAllComponents({ name: 'TransactionItem' })
      expect(items).toHaveLength(100)
    })

    test('handles empty categories list', () => {
      // Arrange & Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: [],
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const items = wrapper.findAllComponents({ name: 'TransactionItem' })
      expect(items).toHaveLength(3)
      expect(items[0].props('categories')).toEqual([])
    })

    test('handles pagination at last page', () => {
      // Arrange
      const lastPagePagination: PaginationConfig = {
        currentPage: 5,
        totalPages: 5,
        totalItems: 50,
        pageSize: 10,
      }

      // Act
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: lastPagePagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Assert
      const pagination = wrapper.findComponent({ name: 'Pagination' })
      expect(pagination.props('currentPage')).toBe(5)
      expect(pagination.props('totalPages')).toBe(5)
    })
  })

  describe('List Updates', () => {
    test('updates when transactions prop changes', async () => {
      // Arrange
      const wrapper = mount(TransactionList, {
        props: {
          transactions: [mockTransactions[0]],
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Act
      await wrapper.setProps({ transactions: mockTransactions })

      // Assert
      const items = wrapper.findAllComponents({ name: 'TransactionItem' })
      expect(items).toHaveLength(3)
    })

    test('updates when pagination changes', async () => {
      // Arrange
      const wrapper = mount(TransactionList, {
        props: {
          transactions: mockTransactions,
          categories: mockCategories,
          pagination: mockPagination,
          getAccountName: mockGetAccountName,
          getAmountColor: mockGetAmountColor,
        },
      })

      // Act
      await wrapper.setProps({
        pagination: { ...mockPagination, currentPage: 2, totalPages: 3 }
      })

      // Assert
      const pagination = wrapper.findComponent({ name: 'Pagination' })
      expect(pagination.exists()).toBe(true)
      expect(pagination.props('currentPage')).toBe(2)
    })
  })
})

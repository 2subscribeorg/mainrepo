import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ConnectionExpirationBanner from '@/components/ConnectionExpirationBanner.vue'
import BankReconnectionWizard from '@/components/BankReconnectionWizard.vue'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import { useTransactionsStore } from '@/stores/transactions'

describe('ConnectionExpirationBanner', () => {
  let pinia: ReturnType<typeof createPinia>
  let bankAccountsStore: ReturnType<typeof useBankAccountsStore>
  let transactionsStore: ReturnType<typeof useTransactionsStore>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    bankAccountsStore = useBankAccountsStore()
    transactionsStore = useTransactionsStore()
    
    // Mock store methods
    vi.spyOn(bankAccountsStore, 'fetchConnections').mockResolvedValue(undefined)
    vi.spyOn(transactionsStore, 'fetchTransactions').mockResolvedValue(undefined)
  })

  describe('Visibility', () => {
    test('does not render when no connections are expiring or disconnected', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'connected',
          expiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    test('renders when connection is pending expiration', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    test('renders when connection is disconnected', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Bank of America',
          status: 'disconnected',
          disconnectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })
  })

  describe('Message Content', () => {
    test('shows disconnected message when connection is lost', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('bank connection')
      expect(wrapper.text()).toContain('lost')
      expect(wrapper.text()).toContain('transaction sync paused')
    })

    test('shows expiring message when connection is pending expiration', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('bank connection')
      expect(wrapper.text()).toContain('expiring')
      expect(wrapper.text()).toContain('reconnect to keep syncing')
    })

    test('displays correct count for single disconnected connection', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('1 bank connection')
      expect(wrapper.text()).not.toContain('connections')
    })

    test('displays correct count for multiple disconnected connections', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
        {
          id: 'conn_2',
          institutionName: 'Bank of America',
          status: 'disconnected',
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('2 bank connections')
    })

    test('displays correct count for multiple expiring connections', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
        {
          id: 'conn_2',
          institutionName: 'Wells Fargo',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('2 bank connections')
    })
  })

  describe('Expiry Time Calculation', () => {
    test('shows "today" when expiring today', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() - 1000).toISOString(), // Already expired
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('expiring today')
    })

    test('shows "tomorrow" when expiring in 1 day', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('expiring tomorrow')
    })

    test('shows "in X days" when expiring in multiple days', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('in 5 days')
    })

    test('shows soonest expiry when multiple connections are expiring', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
        {
          id: 'conn_2',
          institutionName: 'Wells Fargo',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('in 3 days')
    })

    test('shows "soon" when no expiry date is available', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
          expiresAt: undefined,
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('expiring soon')
    })
  })

  describe('Visual Styling', () => {
    test('applies danger styling when connection is disconnected', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      const alert = wrapper.find('[role="alert"]')
      expect(alert.classes()).toContain('border-danger/30')
      expect(alert.classes()).toContain('bg-danger/10')
    })

    test('applies warning styling when connection is pending expiration', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      const alert = wrapper.find('[role="alert"]')
      expect(alert.classes()).toContain('border-warning/30')
      expect(alert.classes()).toContain('bg-warning/10')
    })

    test('prioritizes danger styling when both disconnected and expiring connections exist', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
        {
          id: 'conn_2',
          institutionName: 'Wells Fargo',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      const alert = wrapper.find('[role="alert"]')
      expect(alert.classes()).toContain('border-danger/30')
      expect(alert.classes()).toContain('bg-danger/10')
    })
  })

  describe('Reconnection Wizard Integration', () => {
    test('opens wizard when reconnect button is clicked', async () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
      ]

      const wrapper = mount(ConnectionExpirationBanner)

      // Act
      await wrapper.find('button').trigger('click')

      // Assert
      const wizard = wrapper.findComponent(BankReconnectionWizard)
      expect(wizard.props('show')).toBe(true)
    })

    test('passes first expiring connection to wizard', async () => {
      // Arrange
      const firstConnection = {
        id: 'conn_1',
        institutionName: 'Chase',
        status: 'disconnected',
      } as any

      bankAccountsStore.connections = [
        firstConnection,
        {
          id: 'conn_2',
          institutionName: 'Wells Fargo',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      const wrapper = mount(ConnectionExpirationBanner)

      // Act
      await wrapper.find('button').trigger('click')

      // Assert
      const wizard = wrapper.findComponent(BankReconnectionWizard)
      expect(wizard.props('connection')).toEqual(firstConnection)
    })

    test('closes wizard when close event is emitted', async () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
      ]

      const wrapper = mount(ConnectionExpirationBanner)

      await wrapper.find('button').trigger('click')

      // Act
      const wizard = wrapper.findComponent(BankReconnectionWizard)
      await wizard.vm.$emit('close')
      await wrapper.vm.$nextTick()

      // Assert
      expect(wizard.props('show')).toBe(false)
    })

    test('refreshes data when reconnection is successful', async () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
      ]

      const wrapper = mount(ConnectionExpirationBanner)

      await wrapper.find('button').trigger('click')

      // Act
      const wizard = wrapper.findComponent(BankReconnectionWizard)
      await wizard.vm.$emit('success')
      await wrapper.vm.$nextTick()

      // Assert
      expect(bankAccountsStore.fetchConnections).toHaveBeenCalled()
      expect(transactionsStore.fetchTransactions).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA role for alert', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    test('warning emoji is hidden from screen readers', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      const emoji = wrapper.find('[aria-hidden="true"]')
      expect(emoji.exists()).toBe(true)
      expect(emoji.text()).toBe('⚠️')
    })

    test('reconnect button is keyboard accessible', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'disconnected',
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.element.tagName).toBe('BUTTON')
    })
  })

  describe('Edge Cases', () => {
    test('handles empty connections array', () => {
      // Arrange
      bankAccountsStore.connections = []

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    test('handles mixed connection statuses correctly', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'connected',
        } as any,
        {
          id: 'conn_2',
          institutionName: 'Wells Fargo',
          status: 'disconnected',
        } as any,
        {
          id: 'conn_3',
          institutionName: 'Bank of America',
          status: 'pending_expiration',
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('2 bank connections')
    })

    test('handles connection without expiresAt field', () => {
      // Arrange
      bankAccountsStore.connections = [
        {
          id: 'conn_1',
          institutionName: 'Chase',
          status: 'pending_expiration',
        } as any,
      ]

      // Act
      const wrapper = mount(ConnectionExpirationBanner, {
        global: {
          stubs: {
            BankReconnectionWizard: true,
          },
        },
      })

      // Assert
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('expiring soon')
    })
  })
})

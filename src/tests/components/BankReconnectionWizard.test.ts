import { mount } from '@vue/test-utils'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import BankReconnectionWizard from '@/components/BankReconnectionWizard.vue'
import type { BankConnection } from '@/domain/models'

describe('BankReconnectionWizard', () => {
  let mockConnection: BankConnection

  beforeEach(() => {
    vi.clearAllMocks()
    mockConnection = {
      id: 'conn_1',
      institutionId: 'ins_chase',
      institutionName: 'Chase',
      accounts: [],
      status: 'disconnected',
      lastSynced: new Date().toISOString(),
      userId: 'user_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      disconnectedAt: new Date().toISOString(),
    } as BankConnection
  })

  describe('Step Navigation', () => {
    test('displays why step by default', () => {
      // Arrange & Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.text()).toContain('Why do I need to reconnect?')
      expect(wrapper.text()).toContain('For security, bank connections expire every 90 days')
    })

    test('navigates to reconnect step when Continue clicked', async () => {
      // Arrange
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Act
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')

      // Assert
      expect(wrapper.text()).toContain('Ready to Reconnect')
      expect(wrapper.text()).toContain('What happens next?')
      // PlaidLinkButton is stubbed, so we check for the component instead
      expect(wrapper.findComponent({ name: 'PlaidLinkButton' }).exists()).toBe(true)
    })

    test('navigates back to why step when Back clicked', async () => {
      // Arrange
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Navigate to reconnect step first
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')

      // Act
      const backButton = wrapper.findAll('button').find(btn => btn.text().includes('Back'))
      await backButton?.trigger('click')

      // Assert
      expect(wrapper.text()).toContain('Why do I need to reconnect?')
    })

    test('shows success step after successful reconnection', async () => {
      // Arrange
      vi.useFakeTimers()
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Navigate to reconnect step
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')

      // Act - trigger success from PlaidLinkButton
      const plaidButton = wrapper.findComponent({ name: 'PlaidLinkButton' })
      await plaidButton.vm.$emit('success')

      // Fast-forward backfill simulation
      vi.advanceTimersByTime(2000)
      await wrapper.vm.$nextTick()

      // Assert
      expect(wrapper.text()).toContain('Successfully Reconnected!')
      expect(wrapper.text()).toContain('Chase')

      vi.useRealTimers()
    })

    test('shows error step when reconnection fails', async () => {
      // Arrange
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Navigate to reconnect step
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')

      // Act - trigger error from PlaidLinkButton
      const plaidButton = wrapper.findComponent({ name: 'PlaidLinkButton' })
      await plaidButton.vm.$emit('error', 'Connection timeout')

      // Assert
      expect(wrapper.text()).toContain('Reconnection Failed')
      expect(wrapper.text()).toContain('Connection timeout')
    })
  })

  describe('Conditional Content', () => {
    test('shows disconnection warning when connection.disconnectedAt exists', () => {
      // Arrange
      const disconnectedConnection = {
        ...mockConnection,
        disconnectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: disconnectedConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.text()).toContain('Connection Lost')
      expect(wrapper.text()).toContain('Disconnected')
      expect(wrapper.text()).toContain('Transactions have not been syncing')
    })

    test('shows expiration warning when connection.expiresAt exists', () => {
      // Arrange
      const expiringConnection = {
        ...mockConnection,
        status: 'pending_expiration' as const,
        disconnectedAt: undefined,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: expiringConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.text()).toContain('Expiring Soon')
      expect(wrapper.text()).toContain('Connection expires')
      expect(wrapper.text()).toContain('Reconnect now to avoid interruption')
    })

    test('displays correct institution name from connection prop', () => {
      // Arrange
      const wellsFargoConnection = {
        ...mockConnection,
        institutionName: 'Wells Fargo',
      }

      // Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: wellsFargoConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.text()).toContain('Wells Fargo')
    })

    test('shows backfill progress indicator during backfill', async () => {
      // Arrange
      vi.useFakeTimers()
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Navigate to reconnect and trigger success
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')
      const plaidButton = wrapper.findComponent({ name: 'PlaidLinkButton' })
      await plaidButton.vm.$emit('success')

      // Act - advance time to complete backfill and show success step
      vi.advanceTimersByTime(2000)
      await wrapper.vm.$nextTick()

      // Assert - should be on success step now
      expect(wrapper.text()).toContain('Successfully Reconnected!')
      // Check for backfill completion indicator
      expect(wrapper.text()).toContain('Transaction backfill complete')

      vi.useRealTimers()
    })
  })

  describe('Event Emissions', () => {
    test('emits close when close button clicked', async () => {
      // Arrange
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Act
      const closeButton = wrapper.find('[aria-label="Close wizard"]')
      await closeButton.trigger('click')

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    test('emits close when Maybe Later clicked', async () => {
      // Arrange
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Act
      const maybeLaterButton = wrapper.findAll('button').find(btn => btn.text() === 'Maybe Later')
      await maybeLaterButton?.trigger('click')

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    test('emits both success and close when Done clicked', async () => {
      // Arrange
      vi.useFakeTimers()
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Navigate to success step
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')
      const plaidButton = wrapper.findComponent({ name: 'PlaidLinkButton' })
      await plaidButton.vm.$emit('success')
      vi.advanceTimersByTime(2000)
      await wrapper.vm.$nextTick()

      // Act
      const doneButton = wrapper.findAll('button').find(btn => btn.text() === 'Done')
      await doneButton?.trigger('click')

      // Assert
      expect(wrapper.emitted('success')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('success')).toHaveLength(1)
      expect(wrapper.emitted('close')).toHaveLength(1)

      vi.useRealTimers()
    })

    test('resets wizard state after closing from success', async () => {
      // Arrange
      vi.useFakeTimers()
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Navigate to success step
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')
      const plaidButton = wrapper.findComponent({ name: 'PlaidLinkButton' })
      await plaidButton.vm.$emit('success')
      vi.advanceTimersByTime(2000)
      await wrapper.vm.$nextTick()

      // Act - click Done and wait for reset timeout
      const doneButton = wrapper.findAll('button').find(btn => btn.text() === 'Done')
      await doneButton?.trigger('click')
      vi.advanceTimersByTime(300)
      await wrapper.vm.$nextTick()

      // Re-open wizard
      await wrapper.setProps({ show: false })
      await wrapper.setProps({ show: true })

      // Assert - should be back to why step
      expect(wrapper.text()).toContain('Why do I need to reconnect?')

      vi.useRealTimers()
    })
  })

  describe('Time Formatting', () => {
    test('formatTimeAgo returns "today" for today\'s date', () => {
      // Arrange
      const todayConnection = {
        ...mockConnection,
        disconnectedAt: new Date().toISOString(),
      }

      // Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: todayConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.text()).toContain('Disconnected today')
    })

    test('formatTimeAgo returns "yesterday" for 1 day ago', () => {
      // Arrange
      const yesterdayConnection = {
        ...mockConnection,
        disconnectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }

      // Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: yesterdayConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.text()).toContain('Disconnected yesterday')
    })

    test('formatTimeAgo returns "X days ago" for < 7 days', () => {
      // Arrange
      const threeDaysAgoConnection = {
        ...mockConnection,
        disconnectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: threeDaysAgoConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.text()).toContain('Disconnected 3 days ago')
    })

    test('formatTimeAgo returns "X weeks ago" for < 30 days', () => {
      // Arrange
      const twoWeeksAgoConnection = {
        ...mockConnection,
        disconnectedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: twoWeeksAgoConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.text()).toContain('Disconnected 2 weeks ago')
    })

    test('formatTimeAgo returns "X months ago" for >= 30 days', () => {
      // Arrange
      const twoMonthsAgoConnection = {
        ...mockConnection,
        disconnectedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: twoMonthsAgoConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.text()).toContain('Disconnected 2 months ago')
    })
  })

  describe('Error Handling', () => {
    test('displays error message when reconnection fails', async () => {
      // Arrange
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Navigate to reconnect step
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')

      // Act
      const plaidButton = wrapper.findComponent({ name: 'PlaidLinkButton' })
      await plaidButton.vm.$emit('error', 'Invalid credentials')

      // Assert
      expect(wrapper.text()).toContain('Reconnection Failed')
      expect(wrapper.text()).toContain('Invalid credentials')
    })

    test('allows retry from error state', async () => {
      // Arrange
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Navigate to error step
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')
      const plaidButton = wrapper.findComponent({ name: 'PlaidLinkButton' })
      await plaidButton.vm.$emit('error', 'Network error')

      // Act
      const tryAgainButton = wrapper.findAll('button').find(btn => btn.text() === 'Try Again')
      await tryAgainButton?.trigger('click')

      // Assert
      expect(wrapper.text()).toContain('Ready to Reconnect')
      expect(wrapper.text()).toContain('What happens next?')
      // PlaidLinkButton is stubbed, so we check for the component instead
      expect(wrapper.findComponent({ name: 'PlaidLinkButton' }).exists()).toBe(true)
    })

    test('shows default error message when none provided', async () => {
      // Arrange
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Navigate to reconnect step
      const continueButton = wrapper.findAll('button').find(btn => btn.text() === 'Continue')
      await continueButton?.trigger('click')

      // Act - emit error without message
      const plaidButton = wrapper.findComponent({ name: 'PlaidLinkButton' })
      await plaidButton.vm.$emit('error', '')

      // Assert
      expect(wrapper.text()).toContain('Reconnection Failed')
      expect(wrapper.text()).toContain('We couldn\'t reconnect your bank account')
    })
  })

  describe('Edge Cases', () => {
    test('handles null connection gracefully', () => {
      // Arrange & Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: null },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert - should render without crashing
      expect(wrapper.text()).toContain('Why do I need to reconnect?')
      expect(wrapper.find('[aria-label="Close wizard"]').exists()).toBe(true)
    })

    test('handles connection without expiresAt or disconnectedAt', () => {
      // Arrange
      const minimalConnection = {
        ...mockConnection,
        disconnectedAt: undefined,
        expiresAt: undefined,
      }

      // Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: minimalConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert - should render without warnings
      expect(wrapper.text()).toContain('Why do I need to reconnect?')
      expect(wrapper.text()).not.toContain('Connection Lost')
      expect(wrapper.text()).not.toContain('Expiring Soon')
    })
  })

  describe('Visibility', () => {
    test('wizard is visible when show prop is true', () => {
      // Arrange & Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: true, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
    })

    test('wizard is hidden when show prop is false', () => {
      // Arrange & Act
      const wrapper = mount(BankReconnectionWizard, {
        props: { show: false, connection: mockConnection },
        global: { stubs: { PlaidLinkButton: true } }
      })

      // Assert
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false)
    })
  })
})

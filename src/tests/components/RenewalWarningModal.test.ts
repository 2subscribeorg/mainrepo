import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mountModal } from '@/tests/helpers/modalTestUtils'
import { ref } from 'vue'
import RenewalWarningModal from '@/components/RenewalWarningModal.vue'
import RenewalWarningCard from '@/components/RenewalWarningCard.vue'
import type { RenewalWarning } from '@/types/renewalWarning'

// Mock the router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock the composable - use actual Vue refs
const mockActiveWarnings = ref<RenewalWarning[]>([])
const mockWarningCount = ref(0)
const mockLoading = ref(false)
const mockError = ref<string | null>(null)
const mockCalculating = ref(false)
const mockCalculateWarnings = vi.fn()
const mockDismissWarning = vi.fn()

vi.mock('@/composables/useRenewalWarnings', () => ({
  useRenewalWarnings: () => ({
    activeWarnings: mockActiveWarnings,
    warningCount: mockWarningCount,
    loading: mockLoading,
    error: mockError,
    calculating: mockCalculating,
    calculateWarnings: mockCalculateWarnings,
    dismissWarning: mockDismissWarning,
  }),
}))

describe('RenewalWarningModal', () => {
  const mockWarnings: RenewalWarning[] = [
    {
      id: 'warning-1',
      userId: 'user-123',
      subscriptionId: 'sub-1',
      merchantName: 'Netflix',
      amount: { amount: 9.99, currency: 'GBP' },
      recurrence: 'monthly',
      dueDate: '2024-03-15',
      daysUntilDue: 3,
      status: 'active',
      createdAt: '2024-03-12T10:00:00Z',
      updatedAt: '2024-03-12T10:00:00Z',
    },
    {
      id: 'warning-2',
      userId: 'user-123',
      subscriptionId: 'sub-2',
      merchantName: 'Spotify',
      amount: { amount: 10.99, currency: 'GBP' },
      recurrence: 'monthly',
      dueDate: '2024-03-16',
      daysUntilDue: 4,
      status: 'active',
      createdAt: '2024-03-12T10:00:00Z',
      updatedAt: '2024-03-12T10:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mock returns
    mockActiveWarnings.value = []
    mockWarningCount.value = 0
    mockLoading.value = false
    mockError.value = null
    mockCalculating.value = false
  })

  describe('Open/Close Behavior', () => {
    test('shows modal when isOpen is true', () => {
      // Arrange
      mockActiveWarnings.value = mockWarnings
      mockWarningCount.value = 2

      // Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    })

    test('hides modal when isOpen is false', () => {
      // Arrange & Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: false },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    })

    test('emits close event when close button clicked', async () => {
      // Arrange
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Act
      const closeButton = wrapper.find('[aria-label="Close modal"]')
      await closeButton.trigger('click')

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    test('emits close event when Done button clicked', async () => {
      // Arrange
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Act
      const doneButton = wrapper.find('button:last-of-type')
      await doneButton.trigger('click')

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    test('emits close event when backdrop clicked', async () => {
      // Arrange
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Act
      const dialog = wrapper.find('[role="dialog"]')
      await dialog.trigger('click')

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Content States', () => {
    test('shows loading state when loading is true', () => {
      // Arrange
      mockLoading.value = true

      // Act
      const wrapper = mount(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Loading warnings...')
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
    })

    test('shows error state when error exists', () => {
      // Arrange
      mockError.value = 'Failed to load warnings'

      // Act
      const wrapper = mount(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Error loading warnings')
      expect(wrapper.text()).toContain('Failed to load warnings')
      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    test('shows empty state when no warnings', () => {
      // Arrange
      mockActiveWarnings.value = []
      mockWarningCount.value = 0

      // Act
      const wrapper = mount(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('No upcoming renewals')
      expect(wrapper.text()).toContain("You don't have any subscription renewals coming up soon")
    })

    test('shows warnings list when warnings exist', () => {
      // Arrange
      mockActiveWarnings.value = mockWarnings
      mockWarningCount.value = 2

      // Act
      const wrapper = mount(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            Teleport: true,
            RenewalWarningCard: false, // Don't stub - we need to find it
          },
        },
      })

      // Assert
      const cards = wrapper.findAllComponents(RenewalWarningCard)
      expect(cards).toHaveLength(2)
    })
  })

  describe('Warning Count Display', () => {
    test('displays warning count in header', () => {
      // Arrange
      mockActiveWarnings.value = mockWarnings
      mockWarningCount.value = 2

      // Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('2')
    })

    test('hides count badge when no warnings', () => {
      // Arrange
      mockActiveWarnings.value = []
      mockWarningCount.value = 0

      // Act
      const wrapper = mount(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            Teleport: true,
          },
        },
      })

      // Assert
      const badge = wrapper.find('.bg-blue-100.text-blue-700')
      expect(badge.exists()).toBe(false)
    })
  })

  describe('Warning Actions', () => {
    test('calls dismissWarning when warning dismissed', async () => {
      // Arrange
      mockActiveWarnings.value = mockWarnings
      mockWarningCount.value = 2

      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            Teleport: true,
            RenewalWarningCard: false,
          },
        },
      })

      // Act
      const card = wrapper.findComponent(RenewalWarningCard)
      await card.vm.$emit('dismiss', 'warning-1')

      // Assert
      expect(mockDismissWarning).toHaveBeenCalledWith('warning-1')
    })

    test('closes modal and navigates when view subscription clicked', async () => {
      // Arrange
      mockActiveWarnings.value = mockWarnings
      mockWarningCount.value = 2

      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            Teleport: true,
            RenewalWarningCard: false,
          },
        },
      })

      // Act
      const card = wrapper.findComponent(RenewalWarningCard)
      await card.vm.$emit('viewSubscription', 'sub-1')

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(mockPush).toHaveBeenCalledWith('/subscriptions/sub-1')
    })
  })

  describe('Refresh Functionality', () => {
    test('calls calculateWarnings when refresh clicked', async () => {
      // Arrange
      mockActiveWarnings.value = []
      
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Act
      const buttons = wrapper.findAll('button')
      const refreshButton = buttons.find(b => b.text().includes('Refresh'))
      await refreshButton?.trigger('click')

      // Assert
      expect(mockCalculateWarnings).toHaveBeenCalled()
    })

    test('shows calculating state when refreshing', () => {
      // Arrange
      mockCalculating.value = true
      mockActiveWarnings.value = []

      // Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Calculating...')
      const buttons = wrapper.findAll('button')
      const refreshButton = buttons.find(b => b.text().includes('Calculating'))
      expect(refreshButton?.element.disabled).toBe(true)
    })

    test('disables refresh button while calculating', () => {
      // Arrange
      mockCalculating.value = true
      mockActiveWarnings.value = []

      // Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      const buttons = wrapper.findAll('button')
      const refreshButton = buttons.find(b => b.text().includes('Calculating'))
      expect(refreshButton?.attributes('disabled')).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    test('has proper dialog role', () => {
      // Arrange & Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.exists()).toBe(true)
      expect(dialog.attributes('aria-modal')).toBe('true')
    })

    test('has aria-labelledby pointing to title', () => {
      // Arrange & Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.attributes('aria-labelledby')).toBe('modal-title')
      expect(wrapper.find('#modal-title').exists()).toBe(true)
    })

    test('close button has aria-label', () => {
      // Arrange & Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      const closeButton = wrapper.find('[aria-label="Close modal"]')
      expect(closeButton.exists()).toBe(true)
    })

    test('backdrop has aria-hidden', () => {
      // Arrange & Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      const backdrop = wrapper.find('.backdrop-blur-xl')
      expect(backdrop.attributes('aria-hidden')).toBe('true')
    })

    test('icons have aria-hidden', () => {
      // Arrange & Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      const icons = wrapper.findAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Keyboard Navigation', () => {
    test('closes on Escape key', async () => {
      // Arrange
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Act
      const modalContent = wrapper.find('.max-w-2xl')
      await modalContent.trigger('keydown.escape')

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    test('handles single warning', () => {
      // Arrange
      mockActiveWarnings.value = [mockWarnings[0]]
      mockWarningCount.value = 1

      // Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            Teleport: true,
            RenewalWarningCard: false,
          },
        },
      })

      // Assert
      const cards = wrapper.findAllComponents(RenewalWarningCard)
      expect(cards).toHaveLength(1)
      expect(wrapper.text()).toContain('1')
    })

    test('handles many warnings', () => {
      // Arrange
      const manyWarnings = Array.from({ length: 10 }, (_, i) => ({
        ...mockWarnings[0],
        id: `warning-${i}`,
      }))
      mockActiveWarnings.value = manyWarnings
      mockWarningCount.value = 10

      // Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            Teleport: true,
            RenewalWarningCard: false,
          },
        },
      })

      // Assert
      const cards = wrapper.findAllComponents(RenewalWarningCard)
      expect(cards).toHaveLength(10)
    })

    test('content is scrollable when many warnings', () => {
      // Arrange
      mockActiveWarnings.value = mockWarnings

      // Act
      const wrapper = mountModal(RenewalWarningModal, {
        props: { isOpen: true },
        global: {
          stubs: {
            RenewalWarningCard: true,
          },
        },
      })

      // Assert
      const content = wrapper.find('.max-h-\\[60vh\\]')
      expect(content.exists()).toBe(true)
      expect(content.classes()).toContain('overflow-y-auto')
    })
  })
})

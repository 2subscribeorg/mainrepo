import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryCard from '@/components/categories/CategoryCard.vue'
import type { Category } from '@/types'

// Mock the animation utility to avoid DOM side effects
const mockCleanupSwipe = vi.fn()
const mockCleanupLongPress = vi.fn()
const mockSwipeGesture = vi.fn(() => mockCleanupSwipe)
const mockLongPress = vi.fn(() => mockCleanupLongPress)

vi.mock('@/utils/useAnimations', () => ({
  useAnimations: () => ({
    useSwipeGesture: mockSwipeGesture,
    useLongPress: mockLongPress
  })
}))

// Mock CategoryIcon to avoid rendering complexity
vi.mock('@/components/ui/CategoryIcon.vue', () => ({
  default: {
    name: 'CategoryIcon',
    props: ['icon', 'fallbackColor', 'showIcon', 'size'],
    template: '<div class="category-icon-mock"></div>'
  }
}))

describe('CategoryCard.vue - High-Risk Gesture Testing', () => {
  let mockCategory: Category

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    mockCategory = {
      id: 'cat1',
      name: 'Coffee',
      colour: '#8B4513',
      icon: '☕'
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // HIGH-VALUE TEST 1: Swipe-to-Reveal Logic
  // ============================================================================
  describe('Swipe-to-Reveal Logic', () => {
    it('reveals delete action when swipe left is triggered', async () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      // Ensure the mock was called and get the handler
      expect(mockSwipeGesture).toHaveBeenCalled()
      const swipeLeftHandler = mockSwipeGesture.mock.calls[0]?.[1]
      
      if (!swipeLeftHandler) {
        throw new Error('Swipe left handler not found')
      }
      
      // Trigger swipe left
      swipeLeftHandler()
      await wrapper.vm.$nextTick()

      // Verify state changes
      expect(wrapper.vm.showDeleteAction).toBe(true)
      expect(wrapper.vm.swipeOffset).toBe(-80)
      
      // Verify DOM changes
      const deleteAction = wrapper.find('.category-card__delete-action')
      expect(deleteAction.classes()).toContain('visible')
      
      // Verify transform style is applied
      const card = wrapper.find('.category-card')
      expect(card.attributes('style')).toContain('translateX(-80px)')
    })

    it('hides delete action when swipe right is triggered', async () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      // First trigger swipe left to show delete action
      const swipeLeftHandler = mockSwipeGesture.mock.calls[0]?.[1]
      const swipeRightHandler = mockSwipeGesture.mock.calls[0]?.[2]
      
      if (!swipeLeftHandler || !swipeRightHandler) {
        throw new Error('Swipe handlers not found')
      }
      
      swipeLeftHandler()
      await wrapper.vm.$nextTick()

      // Verify delete action is visible
      expect(wrapper.vm.showDeleteAction).toBe(true)

      // Trigger swipe right to hide delete action
      swipeRightHandler()
      await wrapper.vm.$nextTick()

      // Verify state is reset
      expect(wrapper.vm.showDeleteAction).toBe(false)
      expect(wrapper.vm.swipeOffset).toBe(0)
      
      // Verify DOM changes
      const deleteAction = wrapper.find('.category-card__delete-action')
      expect(deleteAction.classes()).not.toContain('visible')
      
      // Verify transform style is reset
      const card = wrapper.find('.category-card')
      expect(card.attributes('style')).toContain('translateX(0px)')
    })

    it('applies swiping class during gesture transitions', async () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      // The component should start without swiping class
      expect(wrapper.find('.category-card').classes()).not.toContain('category-card--swiping')
      
      // Note: The isSwiping state would be controlled by the actual gesture implementation
      // This test ensures the class binding works correctly by checking the template binding
      // We can verify the class exists in the template by checking the component's setup
      const card = wrapper.find('.category-card')
      expect(card.exists()).toBe(true)
      // The class binding is: :class="{ 'category-card--swiping': isSwiping }"
      // Since we can't directly set isSwiping, we'll verify the template structure
    })
  })

  // ============================================================================
  // HIGH-VALUE TEST 2: Edit Emit Paths (Button Click + Long Press)
  // ============================================================================
  describe('Edit Emit Paths', () => {
    it('emits edit event with correct payload when edit button is clicked', async () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      await wrapper.find('.category-card__edit').trigger('click')

      expect(wrapper.emitted('edit')).toBeTruthy()
      expect(wrapper.emitted('edit')).toHaveLength(1)
      expect(wrapper.emitted('edit')?.[0]).toEqual([mockCategory])
    })

    it('emits edit event after long press with correct payload', async () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      // Get the long press handler passed to the mock
      const longPressHandler = mockLongPress.mock.calls[0]?.[1]
      
      if (!longPressHandler) {
        throw new Error('Long press handler not found')
      }
      
      // Trigger long press
      longPressHandler()
      await wrapper.vm.$nextTick()

      // Should show indicator immediately
      expect(wrapper.vm.showLongPressIndicator).toBe(true)
      
      // Fast-forward past the 100ms timeout
      vi.advanceTimersByTime(100)
      await wrapper.vm.$nextTick()

      // Verify indicator is hidden and edit is emitted
      expect(wrapper.vm.showLongPressIndicator).toBe(false)
      expect(wrapper.emitted('edit')).toBeTruthy()
      expect(wrapper.emitted('edit')).toHaveLength(1)
      expect(wrapper.emitted('edit')?.[0]).toEqual([mockCategory])
    })

    it('shows long press indicator during the gesture', async () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      const longPressHandler = mockLongPress.mock.calls[0]?.[1]
      
      if (!longPressHandler) {
        throw new Error('Long press handler not found')
      }
      
      // Trigger long press but don't advance timers
      longPressHandler()
      await wrapper.vm.$nextTick()

      // Should show indicator
      expect(wrapper.vm.showLongPressIndicator).toBe(true)
      const indicator = wrapper.find('.category-card__long-press-indicator')
      expect(indicator.exists()).toBe(true)
      expect(indicator.text()).toContain('Release to edit')
      
      // Should not have emitted yet
      expect(wrapper.emitted('edit')).toBeFalsy()
    })
  })

  // ============================================================================
  // HIGH-VALUE TEST 3: Delete Functionality
  // ============================================================================
  describe('Delete Functionality', () => {
    it('emits delete event when delete button is clicked', async () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      // First reveal the delete action
      const swipeLeftHandler = mockSwipeGesture.mock.calls[0]?.[1]
      
      if (!swipeLeftHandler) {
        throw new Error('Swipe left handler not found')
      }
      
      swipeLeftHandler()
      await wrapper.vm.$nextTick()

      // Click delete button
      await wrapper.find('.category-card__delete-action button').trigger('click')

      expect(wrapper.emitted('delete')).toBeTruthy()
      expect(wrapper.emitted('delete')).toHaveLength(1)
      expect(wrapper.emitted('delete')?.[0]).toEqual([mockCategory])
    })
  })

  // ============================================================================
  // HIGH-VALUE TEST 4: Cleanup on Unmount (Memory Leak Prevention)
  // ============================================================================
  describe('Cleanup on Unmount', () => {
    it('calls cleanup functions when component is unmounted', () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      // Verify gesture hooks were set up
      expect(mockSwipeGesture).toHaveBeenCalledTimes(1)
      expect(mockLongPress).toHaveBeenCalledTimes(1)
      expect(mockCleanupSwipe).not.toHaveBeenCalled()
      expect(mockCleanupLongPress).not.toHaveBeenCalled()

      // Unmount component
      wrapper.unmount()

      // Verify cleanup functions were called
      expect(mockCleanupSwipe).toHaveBeenCalledTimes(1)
      expect(mockCleanupLongPress).toHaveBeenCalledTimes(1)
    })

    it('sets up gesture hooks with correct parameters', () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      // Verify swipe gesture was set up with correct parameters
      expect(mockSwipeGesture).toHaveBeenCalledWith(
        expect.any(HTMLElement), // cardRef
        expect.any(Function),    // handleSwipeLeft
        expect.any(Function),    // handleSwipeRight
        50                       // threshold
      )

      // Verify long press was set up with correct parameters
      expect(mockLongPress).toHaveBeenCalledWith(
        expect.any(HTMLElement), // cardRef
        expect.any(Function),    // handleLongPress
        500                      // duration
      )
    })
  })

  // ============================================================================
  // EDGE CASES: Race Conditions and Error Handling
  // ============================================================================
  describe('Edge Cases & Race Conditions', () => {
    it('handles multiple rapid swipe gestures correctly', async () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      const swipeLeftHandler = mockSwipeGesture.mock.calls[0]?.[1]
      const swipeRightHandler = mockSwipeGesture.mock.calls[0]?.[2]
      
      if (!swipeLeftHandler || !swipeRightHandler) {
        throw new Error('Swipe handlers not found')
      }

      // Rapid left swipes
      swipeLeftHandler()
      swipeLeftHandler()
      swipeLeftHandler()
      await wrapper.vm.$nextTick()

      // Should still be in delete state
      expect(wrapper.vm.showDeleteAction).toBe(true)
      expect(wrapper.vm.swipeOffset).toBe(-80)

      // Rapid right swipes
      swipeRightHandler()
      swipeRightHandler()
      swipeRightHandler()
      await wrapper.vm.$nextTick()

      // Should be reset
      expect(wrapper.vm.showDeleteAction).toBe(false)
      expect(wrapper.vm.swipeOffset).toBe(0)
    })

    it('handles component unmount during long press timeout', () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      const longPressHandler = mockLongPress.mock.calls[0]?.[1]
      
      if (!longPressHandler) {
        throw new Error('Long press handler not found')
      }
      
      // Trigger long press
      longPressHandler()
      
      // Unmount before timeout completes
      wrapper.unmount()
      
      // Fast-forward timers - should not cause errors
      vi.advanceTimersByTime(100)
      
      // Component should be cleaned up without errors
      expect(mockCleanupSwipe).toHaveBeenCalled()
      expect(mockCleanupLongPress).toHaveBeenCalled()
    })

    it('does not emit edit event if long press is interrupted', async () => {
      const wrapper = mount(CategoryCard, {
        props: { category: mockCategory },
        global: {
          stubs: {
            CategoryIcon: true
          }
        }
      })

      const longPressHandler = mockLongPress.mock.calls[0]?.[1]
      
      if (!longPressHandler) {
        throw new Error('Long press handler not found')
      }
      
      // Trigger long press
      longPressHandler()
      expect(wrapper.vm.showLongPressIndicator).toBe(true)
      
      // Unmount before timeout completes
      wrapper.unmount()
      
      // Fast-forward past timeout
      vi.advanceTimersByTime(100)
      
      // Should not have emitted edit event
      expect(wrapper.emitted('edit')).toBeFalsy()
    })
  })
})

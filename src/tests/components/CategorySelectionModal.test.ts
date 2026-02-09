import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CategorySelectionModal from '@/components/CategorySelectionModal.vue'
import { DEFAULT_COLORS } from '@/utils/colors'
import type { Category } from '@/domain/models'

describe('CategorySelectionModal', () => {
  const mockCategories: Category[] = [
    { id: 'cat1', name: 'Entertainment', colour: '#E91E63' },
    { id: 'cat2', name: 'Food', colour: '#2196F3' },
    { id: 'cat3', name: 'Transport', colour: '#9C27B0' }
  ]

  const createWrapper = (props = {}) => {
    return mount(CategorySelectionModal, {
      props: {
        show: true,
        merchantName: 'Netflix',
        categories: mockCategories,
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
    it('renders when show is true', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
      expect(wrapper.text()).toContain('Select Category for Netflix')
    })

    it('does not render when show is false', () => {
      const wrapper = createWrapper({ show: false })
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false)
    })

    it('displays merchant name in title', () => {
      const wrapper = createWrapper({ merchantName: 'Spotify' })
      expect(wrapper.text()).toContain('Select Category for Spotify')
    })

    it('renders all existing categories in select dropdown', () => {
      const wrapper = createWrapper()
      const options = wrapper.findAll('select option')
      expect(options).toHaveLength(4) // 3 categories + "Select a category..."
      
      expect(wrapper.text()).toContain('Entertainment')
      expect(wrapper.text()).toContain('Food')
      expect(wrapper.text()).toContain('Transport')
    })

    it('renders all color options for new category', () => {
      const wrapper = createWrapper()
      const colorButtons = wrapper.findAll('[data-testid="color-button"]')
      expect(colorButtons).toHaveLength(DEFAULT_COLORS.length)
    })
  })

  describe('Form State Management', () => {
    it('resets form when modal opens', async () => {
      const wrapper = createWrapper()
      
      // Simulate user interaction
      await wrapper.find('select').setValue('cat1')
      await wrapper.find('input[type="text"]').setValue('New Category')
      
      // Close and reopen modal
      await wrapper.setProps({ show: false })
      await wrapper.setProps({ show: true })
      
      // Form should be reset
      const selectElement = wrapper.find('select').element as HTMLSelectElement
      const inputElement = wrapper.find('input[type="text"]').element as HTMLInputElement
      expect(selectElement.value).toBe('')
      expect(inputElement.value).toBe('')
    })

    it('initializes with first default color selected', () => {
      const wrapper = createWrapper()
      // Access component instance through vm for testing internal state
      const component = wrapper.vm as any
      expect(component.newCategoryColor).toBe(DEFAULT_COLORS[0])
    })
  })

  describe('Existing Category Selection', () => {
    it('enables confirm button when existing category is selected', async () => {
      const wrapper = createWrapper()
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      
      // Initially disabled
      expect(confirmButton?.attributes('disabled')).toBe('')
      
      // Select existing category
      await wrapper.find('select').setValue('cat1')
      await wrapper.vm.$nextTick()
      
      // Should be enabled
      expect(confirmButton?.attributes('disabled')).toBeUndefined()
    })

    it('emits confirm event with selected category ID', async () => {
      const wrapper = createWrapper()
      
      await wrapper.find('select').setValue('cat1')
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      if (confirmButton) {
        await confirmButton.trigger('click')
      }
      
      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')?.[0]).toEqual(['cat1'])
    })
  })

  describe('New Category Creation', () => {
    it('enables confirm button when new category name is entered', async () => {
      const wrapper = createWrapper()
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      
      // Initially disabled
      expect(confirmButton?.attributes('disabled')).toBe('')
      
      // Enter new category name
      await wrapper.find('input[type="text"]').setValue('My New Category')
      
      // Should be enabled
      expect(confirmButton?.attributes('disabled')).toBeUndefined()
    })

    it('emits create-and-confirm event with category data', async () => {
      const wrapper = createWrapper()
      
      await wrapper.find('input[type="text"]').setValue('My New Category')
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      if (confirmButton) {
        await confirmButton.trigger('click')
      }
      
      expect(wrapper.emitted('create-and-confirm')).toBeTruthy()
      expect(wrapper.emitted('create-and-confirm')?.[0]).toEqual([{
        name: 'My New Category',
        colour: DEFAULT_COLORS[0] // Default color
      }])
    })

    it('trims whitespace from new category name', async () => {
      const wrapper = createWrapper()
      
      await wrapper.find('input[type="text"]').setValue('  My New Category  ')
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      if (confirmButton) {
        await confirmButton.trigger('click')
      }
      
      expect((wrapper.emitted('create-and-confirm')?.[0] as any)[0].name).toBe('My New Category')
    })

    it('allows color selection for new category', async () => {
      const wrapper = createWrapper()
      const colorButtons = wrapper.findAll('[data-testid="color-button"]')
      
      // Select second color
      await colorButtons[1].trigger('click')
      
      await wrapper.find('input[type="text"]').setValue('Colored Category')
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      if (confirmButton) {
        await confirmButton.trigger('click')
      }
      
      expect((wrapper.emitted('create-and-confirm')?.[0] as any)[0].colour).toBe(DEFAULT_COLORS[1])
    })
  })

  describe('Form Validation', () => {
    it('disables confirm button when no category is selected or entered', () => {
      const wrapper = createWrapper()
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      expect(confirmButton?.attributes('disabled')).toBe('')
    })

    it('disables confirm button with only whitespace in new category input', async () => {
      const wrapper = createWrapper()
      
      await wrapper.find('input[type="text"]').setValue('   ')
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      expect(confirmButton?.attributes('disabled')).toBe('')
    })

    it('prioritizes new category creation over existing selection', async () => {
      const wrapper = createWrapper()
      
      // Select existing category
      await wrapper.find('select').setValue('cat1')
      
      // Then enter new category name
      await wrapper.find('input[type="text"]').setValue('New Category')
      
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      if (confirmButton) {
        await confirmButton.trigger('click')
      }
      
      // Should emit create-and-confirm, not confirm
      expect(wrapper.emitted('create-and-confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')).toBeFalsy()
    })
  })

  describe('Cancel Functionality', () => {
    it('emits cancel event when cancel button is clicked', async () => {
      const wrapper = createWrapper()
      
      const cancelButton = wrapper.findAll('button').find(btn => btn.text().includes('Cancel'))
      if (cancelButton) {
        await cancelButton.trigger('click')
      }
      
      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('does not emit confirm or create events when cancelled', async () => {
      const wrapper = createWrapper()
      
      // Fill out form
      await wrapper.find('input[type="text"]').setValue('Some Category')
      
      // Cancel
      const cancelButton = wrapper.findAll('button').find(btn => btn.text().includes('Cancel'))
      if (cancelButton) {
        await cancelButton.trigger('click')
      }
      
      expect(wrapper.emitted('confirm')).toBeFalsy()
      expect(wrapper.emitted('create-and-confirm')).toBeFalsy()
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty categories array gracefully', () => {
      const wrapper = createWrapper({ categories: [] })
      
      expect(wrapper.find('select').findAll('option')).toHaveLength(1) // Only "Select a category..."
      expect(wrapper.text()).toContain('Select a category...')
    })

    it('handles long merchant names', () => {
      const longMerchantName = 'Very Long Merchant Name That Might Break The Layout'
      const wrapper = createWrapper({ merchantName: longMerchantName })
      
      expect(wrapper.text()).toContain(`Select Category for ${longMerchantName}`)
    })

    it('handles categories without colors', () => {
      const categoriesWithoutColors: Category[] = [
        { id: 'cat1', name: 'No Color Category' }
      ]
      const wrapper = createWrapper({ categories: categoriesWithoutColors })
      
      expect(wrapper.text()).toContain('No Color Category')
    })

    it('resets color selection when modal reopens', async () => {
      const wrapper = createWrapper()
      const component = wrapper.vm as any
      
      // Select a different color
      const colorButtons = wrapper.findAll('[data-testid="color-button"]')
      await colorButtons[2].trigger('click')
      
      // Close and reopen
      await wrapper.setProps({ show: false })
      await wrapper.setProps({ show: true })
      
      // Should reset to default color
      expect(component.newCategoryColor).toBe(DEFAULT_COLORS[0])
    })
  })

  describe('Accessibility', () => {
    it('has proper button semantics', () => {
      const wrapper = createWrapper()
      
      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2 + DEFAULT_COLORS.length) // Cancel, Confirm, + color buttons
      
      // Check for proper button types
      buttons.forEach(button => {
        expect(button.element.tagName).toBe('BUTTON')
      })
    })

    it('has proper form labels', () => {
      const wrapper = createWrapper()
      
      expect(wrapper.text()).toContain('Choose existing category:')
      expect(wrapper.text()).toContain('Create new category:')
      expect(wrapper.text()).toContain('Color')
    })

    it('has disabled state styling for confirm button', () => {
      const wrapper = createWrapper()
      const confirmButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add to Category') || btn.text().includes('Create & Add')
      )
      
      if (confirmButton) {
        expect(confirmButton.classes()).toContain('disabled:opacity-50')
        expect(confirmButton.classes()).toContain('disabled:cursor-not-allowed')
      }
    })
  })
})

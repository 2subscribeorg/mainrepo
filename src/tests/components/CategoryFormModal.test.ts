import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mountModal } from '@/tests/helpers/modalTestUtils'
import CategoryFormModal from '@/components/categories/CategoryFormModal.vue'

// Mock child components
vi.mock('@/components/categories/CategoryColorPicker.vue', () => ({
  default: { name: 'CategoryColorPicker', template: '<div class="color-picker" />' }
}))

vi.mock('@/components/ValidationErrors.vue', () => ({
  default: { name: 'ValidationErrors', template: '<div class="validation-errors"><slot /></div>' }
}))

vi.mock('@/components/ui/IconSelector.vue', () => ({
  default: { name: 'IconSelector', template: '<div class="icon-selector" />' }
}))

describe('CategoryFormModal', () => {
  const mockFormData = {
    name: '',
    colour: '#3B82F6',
    icon: undefined,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to mount modal with props
  const createWrapper = (props: any) => {
    return mountModal(CategoryFormModal, props)
  }

  describe('Rendering', () => {
    test('shows modal when show prop is true', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const modal = wrapper.find('[role="dialog"]')
      expect(modal.exists()).toBe(true)
    })

    test('hides modal when show prop is false', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: false,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const modal = wrapper.find('[role="dialog"]')
      expect(modal.exists()).toBe(false)
    })

    test('displays "Add Category" title when not editing', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Add Category')
    })

    test('displays "Edit Category" title when editing', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: true,
          validationErrors: [],
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Edit Category')
    })

    test('displays name input field', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const nameInput = wrapper.find('#category-name')
      expect(nameInput.exists()).toBe(true)
      expect(nameInput.attributes('type')).toBe('text')
    })

    test('displays color picker', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const colorPicker = wrapper.findComponent({ name: 'CategoryColorPicker' })
      expect(colorPicker.exists()).toBe(true)
    })

    test('displays icon selector', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const iconSelector = wrapper.findComponent({ name: 'IconSelector' })
      expect(iconSelector.exists()).toBe(true)
    })
  })

  describe('Form Validation', () => {
    test('displays validation errors when present', () => {
      // Arrange
      const errors = ['Category name is required', 'Name must be unique']

      // Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: errors,
        },
      })

      // Assert
      const validationErrors = wrapper.findComponent({ name: 'ValidationErrors' })
      expect(validationErrors.exists()).toBe(true)
    })

    test('hides validation errors when none present', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const validationErrors = wrapper.findComponent({ name: 'ValidationErrors' })
      expect(validationErrors.exists()).toBe(false)
    })

    test('marks name input as invalid when errors present', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: ['Category name is required'],
        },
      })

      // Assert
      const nameInput = wrapper.find('#category-name')
      expect(nameInput.attributes('aria-invalid')).toBe('true')
    })
  })

  describe('Create Mode', () => {
    test('shows Save button in create mode', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const buttons = wrapper.findAll('button')
      const saveButton = buttons.find(b => b.text() === 'Save')
      expect(saveButton).toBeDefined()
    })

    test('does not show Delete button in create mode', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text() === 'Delete')
      expect(deleteButton).toBeUndefined()
    })

    test('emits save event when Save button clicked', async () => {
      // Arrange
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Act
      const buttons = wrapper.findAll('button')
      const saveButton = buttons.find(b => b.text() === 'Save')
      await saveButton?.trigger('click')

      // Assert
      expect(wrapper.emitted('save')).toBeTruthy()
    })
  })

  describe('Edit Mode', () => {
    test('shows Delete button in edit mode', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: { ...mockFormData, name: 'Entertainment' },
          saving: false,
          editing: true,
          validationErrors: [],
        },
      })

      // Assert
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text() === 'Delete')
      expect(deleteButton).toBeDefined()
    })

    test('emits delete event when Delete button clicked', async () => {
      // Arrange
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: { ...mockFormData, name: 'Entertainment' },
          saving: false,
          editing: true,
          validationErrors: [],
        },
      })

      // Act
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text() === 'Delete')
      await deleteButton?.trigger('click')

      // Assert
      expect(wrapper.emitted('delete')).toBeTruthy()
    })
  })

  describe('Form Interactions', () => {
    test('emits update:formData when name input changes', async () => {
      // Arrange
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Act
      const nameInput = wrapper.find('#category-name')
      await nameInput.setValue('Entertainment')

      // Assert
      expect(wrapper.emitted('update:formData')).toBeTruthy()
      const emittedData = wrapper.emitted('update:formData')?.[0]?.[0] as any
      expect(emittedData.name).toBe('Entertainment')
    })

    test('emits close event when Cancel button clicked', async () => {
      // Arrange
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Act
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find(b => b.text() === 'Cancel')
      await cancelButton?.trigger('click')

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    test('emits close event when backdrop clicked', async () => {
      // Arrange
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Act
      const overlay = wrapper.find('.modal-overlay')
      await overlay.trigger('click')

      // Assert
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Saving State', () => {
    test('displays "Saving..." when saving is true', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: true,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Saving...')
    })

    test('disables Save button when saving', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: true,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const buttons = wrapper.findAll('button')
      const saveButton = buttons.find(b => b.text().includes('Saving'))
      expect(saveButton?.element.disabled).toBe(true)
    })

    test('enables Save button when not saving', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const buttons = wrapper.findAll('button')
      const saveButton = buttons.find(b => b.text() === 'Save')
      expect(saveButton?.element.disabled).toBe(false)
    })
  })

  describe('Accessibility', () => {
    test('has proper dialog role', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.exists()).toBe(true)
      expect(dialog.attributes('aria-modal')).toBe('true')
    })

    test('has aria-labelledby pointing to title', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.attributes('aria-labelledby')).toBe('modal-title')
      const title = wrapper.find('#modal-title')
      expect(title.exists()).toBe(true)
    })

    test('name input has proper labels and hints', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const nameInput = wrapper.find('#category-name')
      expect(nameInput.attributes('aria-describedby')).toBe('name-hint')
      expect(nameInput.attributes('aria-required')).toBe('true')
      
      const hint = wrapper.find('#name-hint')
      expect(hint.exists()).toBe(true)
    })

    test('buttons have descriptive aria-labels', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find(b => b.text() === 'Cancel')
      const saveButton = buttons.find(b => b.text() === 'Save')
      
      expect(cancelButton?.attributes('aria-label')).toBe('Cancel category form')
      expect(saveButton?.attributes('aria-label')).toBe('Create new category')
    })

    test('Save button has correct aria-label in edit mode', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: true,
          validationErrors: [],
        },
      })

      // Assert
      const buttons = wrapper.findAll('button')
      const saveButton = buttons.find(b => b.text() === 'Save')
      expect(saveButton?.attributes('aria-label')).toBe('Update category')
    })

    test('validation errors have alert role', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: ['Error message'],
        },
      })

      // Assert
      const errors = wrapper.findComponent({ name: 'ValidationErrors' })
      expect(errors.attributes('role')).toBe('alert')
      expect(errors.attributes('aria-live')).toBe('polite')
    })
  })

  describe('Edge Cases', () => {
    test('handles empty form data', () => {
      // Arrange & Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: { name: '', colour: '', icon: undefined },
          saving: false,
          editing: false,
          validationErrors: [],
        },
      })

      // Assert
      const nameInput = wrapper.find('#category-name')
      expect(nameInput.element.value).toBe('')
    })

    test('handles form data with all fields populated', () => {
      // Arrange
      const fullFormData = {
        name: 'Entertainment',
        colour: '#FF5722',
        icon: 'tv',
      }

      // Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: fullFormData,
          saving: false,
          editing: true,
          validationErrors: [],
        },
      })

      // Assert
      const nameInput = wrapper.find('#category-name')
      expect(nameInput.element.value).toBe('Entertainment')
    })

    test('handles multiple validation errors', () => {
      // Arrange
      const errors = [
        'Category name is required',
        'Name must be unique',
        'Name is too long',
      ]

      // Act
      const wrapper = mountModal(CategoryFormModal, {
        props: {
          show: true,
          formData: mockFormData,
          saving: false,
          editing: false,
          validationErrors: errors,
        },
      })

      // Assert
      const validationErrors = wrapper.findComponent({ name: 'ValidationErrors' })
      expect(validationErrors.exists()).toBe(true)
    })
  })
})

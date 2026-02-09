import { describe, test, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryFormModal from '@/components/categories/CategoryFormModal.vue'
import CategoryColorPicker from '@/components/categories/CategoryColorPicker.vue'
import ValidationErrors from '@/components/ValidationErrors.vue'

describe('CategoryFormModal', () => {
  let wrapper: any

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })
  // Mock child components
  vi.mock('@/components/categories/CategoryColorPicker.vue', () => ({
    default: {
      name: 'CategoryColorPicker',
      template: '<div class="color-picker-mock"></div>',
      props: ['modelValue'],
      emits: ['update:modelValue']
    }
  }))

  vi.mock('@/components/ValidationErrors.vue', () => ({
    default: {
      name: 'ValidationErrors',
      template: '<div class="validation-errors-mock"></div>',
      props: ['errors']
    }
  }))

  const createWrapper = (props = {}) => {
    return mount(CategoryFormModal, {
      props: {
        show: true,
        formData: { name: '', colour: '#FF0000' },
        saving: false,
        editing: false,
        validationErrors: [],
        ...props
      },
      global: {
        components: {
          CategoryColorPicker,
          ValidationErrors
        }
      },
      attachTo: document.body
    })
  }

  describe('Modal Overlay Rendering', () => {
    test('renders when show is true', () => {
      wrapper = createWrapper({ show: true })
      
      expect(document.querySelector('.modal-overlay')).toBeTruthy()
      expect(document.querySelector('.modal-card')).toBeTruthy()
    })

    test('does not render when show is false', () => {
      wrapper = createWrapper({ show: false })
      
      expect(document.querySelector('.modal-overlay')).toBeFalsy()
      expect(document.querySelector('.modal-card')).toBeFalsy()
    })

    test('emits close event when clicking overlay', async () => {
      wrapper = createWrapper()
      const overlay = document.querySelector('.modal-overlay') as HTMLElement
      
      await overlay.click()
      
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    test('does not emit close when clicking modal content', async () => {
      wrapper = createWrapper()
      const modalCard = document.querySelector('.modal-card') as HTMLElement
      
      await modalCard.click()
      
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Delete Button Conditional Rendering', () => {
    test('shows delete button when editing', () => {
      wrapper = createWrapper({ editing: true })
      
      const deleteBtn = document.querySelector('.btn-danger')
      expect(deleteBtn).toBeTruthy()
      expect(deleteBtn?.textContent?.trim()).toBe('Delete')
    })

    test('hides delete button when adding', () => {
      wrapper = createWrapper({ editing: false })
      
      expect(document.querySelector('.btn-danger')).toBeFalsy()
    })

    test('emits delete event when delete button clicked', async () => {
      wrapper = createWrapper({ editing: true })
      const deleteBtn = document.querySelector('.btn-danger') as HTMLElement
      
      await deleteBtn.click()
      
      expect(wrapper.emitted('delete')).toBeTruthy()
    })
  })

  describe('Title Dynamic Text', () => {
    test('shows "Edit Category" when editing', () => {
      wrapper = createWrapper({ editing: true })
      
      const title = document.querySelector('.modal-title')
      expect(title?.textContent?.trim()).toBe('Edit Category')
    })

    test('shows "Add Category" when adding', () => {
      wrapper = createWrapper({ editing: false })
      
      const title = document.querySelector('.modal-title')
      expect(title?.textContent?.trim()).toBe('Add Category')
    })
  })

  describe('Save Button State', () => {
    test('shows "Save" when not saving', () => {
      wrapper = createWrapper({ saving: false })
      
      const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement
      expect(saveButton?.textContent?.trim()).toBe('Save')
      expect(saveButton?.disabled).toBe(false)
    })

    test('shows "Saving..." and is disabled when saving', () => {
      wrapper = createWrapper({ saving: true })
      
      const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement
      expect(saveButton?.textContent?.trim()).toBe('Saving...')
      expect(saveButton?.disabled).toBe(true)
    })

    test('emits save event when save button clicked', async () => {
      wrapper = createWrapper()
      const saveButton = document.querySelector('.btn-primary') as HTMLElement
      
      await saveButton.click()
      
      expect(wrapper.emitted('save')).toBeTruthy()
    })
  })

  describe('Validation Errors', () => {
    test('shows validation errors when present', () => {
      const errors = ['Name is required', 'Invalid color']
      wrapper = createWrapper({ validationErrors: errors })
      
      expect(wrapper.findComponent(ValidationErrors).exists()).toBe(true)
      expect(wrapper.findComponent(ValidationErrors).props('errors')).toEqual(errors)
    })

    test('hides validation errors when empty', () => {
      wrapper = createWrapper({ validationErrors: [] })
      
      expect(wrapper.findComponent(ValidationErrors).exists()).toBe(false)
    })
  })

  describe('Form Input Binding', () => {
    test('binds name input correctly', async () => {
      wrapper = createWrapper()
      const nameInput = document.querySelector('input[type="text"]') as HTMLInputElement
      
      nameInput.value = 'Streaming'
      nameInput.dispatchEvent(new Event('input'))
      await wrapper.vm.$nextTick()
      
      const emitted = wrapper.emitted('update:formData')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]?.[0]).toEqual({
        name: 'Streaming',
        colour: '#FF0000'
      })
    })
  })

  describe('Cancel Button', () => {
    test('emits close event when cancel clicked', async () => {
      wrapper = createWrapper()
      const cancelButton = document.querySelector('.btn-secondary') as HTMLElement
      
      await cancelButton.click()
      
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })
})

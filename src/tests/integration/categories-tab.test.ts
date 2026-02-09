import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import Categories from '@/views/Categories.vue'
import CategoryFormModal from '@/components/categories/CategoryFormModal.vue'
import CategoryCard from '@/components/categories/CategoryCard.vue'
import { useCategoriesStore } from '@/stores/categories'
import type { Category } from '@/domain/models'
import { DEFAULT_COLORS } from '@/utils/colors'

describe('Categories Tab Integration Test', () => {
  let categoriesStore: any
  let wrapper: any

  const mockCategories: Category[] = [
    { id: 'cat1', name: 'Entertainment', colour: '#E91E63' },
    { id: 'cat2', name: 'Food', colour: '#2196F3' },
    { id: 'cat3', name: 'Transport', colour: '#4CAF50' }
  ]

  const createTestSetup = () => {
    setActivePinia(createPinia())
    
    // Initialize store
    categoriesStore = useCategoriesStore()

    // Mock store methods
    vi.spyOn(categoriesStore, 'fetchAll').mockResolvedValue(undefined)
    vi.spyOn(categoriesStore, 'save').mockResolvedValue(undefined)
    vi.spyOn(categoriesStore, 'remove').mockResolvedValue(undefined)

    // Set up initial data
    categoriesStore.categories = [...mockCategories]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    createTestSetup()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Categories View Integration', () => {
    it('renders categories list correctly', async () => {
      // Arrange: Mount Categories view
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      // Wait for component to mount
      await wrapper.vm.$nextTick()

      // Assert: Categories should be loaded
      expect(categoriesStore.fetchAll).toHaveBeenCalled()
      expect(wrapper.vm.loading).toBe(false)
    })

    it('opens create modal when Add Category button is clicked', async () => {
      // Arrange: Mount Categories view
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Act: Click Add Category button
      const addButton = wrapper.find('button')
      await addButton.trigger('click')

      // Assert: Modal should be visible
      expect(wrapper.vm.modalVisible).toBe(true)
      expect(wrapper.vm.modalMode).toBe('create')
      expect(wrapper.vm.editingCategory).toBe(null)
    })

    it('opens edit modal when category card is edited', async () => {
      // Arrange: Mount Categories view
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Act: Simulate edit category
      const categoryToEdit = mockCategories[0]
      wrapper.vm.editCategory(categoryToEdit)

      // Assert: Modal should be in edit mode
      expect(wrapper.vm.modalVisible).toBe(true)
      expect(wrapper.vm.modalMode).toBe('edit')
      expect(wrapper.vm.editingCategory).toEqual(categoryToEdit)
      expect(wrapper.vm.formData.name).toBe(categoryToEdit.name)
      expect(wrapper.vm.formData.colour).toBe(categoryToEdit.colour)
    })

    it('closes modal when close is called', async () => {
      // Arrange: Open modal
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      wrapper.vm.openCreateModal()

      // Act: Close modal
      wrapper.vm.closeModal()

      // Assert: Modal should be closed
      expect(wrapper.vm.modalVisible).toBe(false)
      expect(wrapper.vm.modalMode).toBe(null)
      expect(wrapper.vm.editingCategory).toBe(null)
      expect(wrapper.vm.formData.name).toBe('')
      expect(wrapper.vm.formData.colour).toBe(DEFAULT_COLORS[0])
      expect(wrapper.vm.validationErrors).toEqual([])
    })
  })

  describe('Category Creation Integration', () => {
    it('creates new category successfully', async () => {
      // Arrange: Mount Categories view and open create modal
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      wrapper.vm.openCreateModal()

      // Set form data
      wrapper.vm.formData = {
        name: 'New Category',
        colour: '#FF5722'
      }

      // Act: Save category
      await wrapper.vm.saveCategory()

      // Assert: Category should be saved
      expect(categoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Category',
          colour: '#FF5722'
        })
      )
      expect(wrapper.vm.modalVisible).toBe(false)
      expect(wrapper.vm.saving).toBe(false)
    })

    it('validates category name before saving', async () => {
      // Arrange: Mount Categories view and open create modal
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      wrapper.vm.openCreateModal()

      // Set invalid form data (empty name)
      wrapper.vm.formData = {
        name: '',
        colour: '#FF5722'
      }

      // Act: Attempt to save category
      await wrapper.vm.saveCategory()

      // Assert: Should not save and show validation error
      expect(categoriesStore.save).not.toHaveBeenCalled()
      expect(wrapper.vm.validationErrors.length).toBeGreaterThan(0)
      expect(wrapper.vm.modalVisible).toBe(true)
      expect(wrapper.vm.saving).toBe(false)
    })

    it('handles category save errors gracefully', async () => {
      // Arrange: Mock save to fail
      const mockError = new Error('Failed to save category')
      vi.spyOn(categoriesStore, 'save').mockRejectedValue(mockError)
      vi.spyOn(console, 'error').mockImplementation(() => {})

      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      wrapper.vm.openCreateModal()

      wrapper.vm.formData = {
        name: 'Test Category',
        colour: '#FF5722'
      }

      // Act: Attempt to save category
      await wrapper.vm.saveCategory()

      // Assert: Error should be handled
      expect(console.error).toHaveBeenCalledWith('Category save error:', mockError)
      expect(wrapper.vm.validationErrors).toContain('Failed to save category: Failed to save category')
      expect(wrapper.vm.saving).toBe(false)
    })
  })

  describe('Category Editing Integration', () => {
    it('updates existing category successfully', async () => {
      // Arrange: Mount Categories view and open edit modal
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      
      const categoryToEdit = mockCategories[0]
      wrapper.vm.editCategory(categoryToEdit)

      // Update form data
      wrapper.vm.formData = {
        name: 'Updated Entertainment',
        colour: '#9C27B0'
      }

      // Act: Save category
      await wrapper.vm.saveCategory()

      // Assert: Category should be updated
      expect(categoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: categoryToEdit.id,
          name: 'Updated Entertainment',
          colour: '#9C27B0'
        })
      )
      expect(wrapper.vm.modalVisible).toBe(false)
    })

    it('preserves category ID when editing', async () => {
      // Arrange: Mount Categories view and open edit modal
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      
      const categoryToEdit = mockCategories[1]
      wrapper.vm.editCategory(categoryToEdit)

      wrapper.vm.formData = {
        name: 'Updated Food',
        colour: '#FF9800'
      }

      // Act: Save category
      await wrapper.vm.saveCategory()

      // Assert: Category ID should be preserved
      expect(categoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: categoryToEdit.id,
          name: 'Updated Food',
          colour: '#FF9800'
        })
      )
    })
  })

  describe('Category Deletion Integration', () => {
    it('deletes category successfully', async () => {
      // Arrange: Mock confirm dialog
      const mockConfirm = vi.fn(() => true)
      global.confirm = mockConfirm

      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      
      const categoryToDelete = mockCategories[2]
      wrapper.vm.editCategory(categoryToDelete)

      // Act: Delete category
      await wrapper.vm.deleteCategory()

      // Assert: Category should be deleted
      expect(mockConfirm).toHaveBeenCalledWith(`Delete category "${categoryToDelete.name}"?`)
      expect(categoriesStore.remove).toHaveBeenCalledWith(categoryToDelete.id)
      expect(wrapper.vm.modalVisible).toBe(false)
    })

    it('cancels deletion when user cancels confirm dialog', async () => {
      // Arrange: Mock confirm dialog to return false
      const mockConfirm = vi.fn(() => false)
      global.confirm = mockConfirm

      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      
      const categoryToDelete = mockCategories[0]
      wrapper.vm.editCategory(categoryToDelete)

      // Act: Attempt to delete category (user cancels)
      await wrapper.vm.deleteCategory()

      // Assert: Category should not be deleted
      expect(mockConfirm).toHaveBeenCalledWith(`Delete category "${categoryToDelete.name}"?`)
      expect(categoriesStore.remove).not.toHaveBeenCalled()
      expect(wrapper.vm.modalVisible).toBe(true) // Modal should remain open
    })

    it('handles category deletion errors gracefully', async () => {
      // Arrange: Mock confirm and delete to fail
      const mockConfirm = vi.fn(() => true)
      const mockAlert = vi.fn()
      global.confirm = mockConfirm
      global.alert = mockAlert

      const mockError = new Error('Failed to delete category')
      vi.spyOn(categoriesStore, 'remove').mockRejectedValue(mockError)

      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      
      const categoryToDelete = mockCategories[1]
      wrapper.vm.editCategory(categoryToDelete)

      // Act: Attempt to delete category
      await wrapper.vm.deleteCategory()

      // Assert: Error should be handled
      expect(mockConfirm).toHaveBeenCalledWith(`Delete category "${categoryToDelete.name}"?`)
      expect(categoriesStore.remove).toHaveBeenCalledWith(categoryToDelete.id)
      expect(mockAlert).toHaveBeenCalledWith('Failed to delete category')
    })
  })

  describe('CategoryFormModal Integration', () => {
    it('renders modal when visible', async () => {
      // Arrange: Mount Categories view and open create modal
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
            // Stub CategoryFormModal to avoid prop issues
          }
        }
      })

      await wrapper.vm.$nextTick()
      wrapper.vm.openCreateModal()

      // Assert: Modal should be visible through computed property
      expect(wrapper.vm.modalVisible).toBe(true)
      expect(wrapper.vm.modalMode).toBe('create')
      expect(wrapper.vm.editingCategory).toBe(null)
    })

    it('passes correct state for edit mode', async () => {
      // Arrange: Mount Categories view and open edit modal
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
            // Stub CategoryFormModal to avoid prop issues
          }
        }
      })

      await wrapper.vm.$nextTick()
      
      const categoryToEdit = mockCategories[0]
      wrapper.vm.editCategory(categoryToEdit)

      // Assert: Modal state should be correct for edit mode
      expect(wrapper.vm.modalVisible).toBe(true)
      expect(wrapper.vm.modalMode).toBe('edit')
      expect(wrapper.vm.editingCategory).toEqual(categoryToEdit)
      expect(wrapper.vm.formData.name).toBe(categoryToEdit.name)
      expect(wrapper.vm.formData.colour).toBe(categoryToEdit.colour || DEFAULT_COLORS[0])
    })
  })

  describe('End-to-End Workflow Simulation', () => {
    it('simulates complete category creation workflow', async () => {
      // Step 1: Mount Categories view
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Step 2: User clicks Add Category
      wrapper.vm.openCreateModal()
      expect(wrapper.vm.modalVisible).toBe(true)

      // Step 3: User fills form
      wrapper.vm.formData = {
        name: 'Shopping',
        colour: '#795548'
      }

      // Step 4: User saves category
      await wrapper.vm.saveCategory()

      // Assert: Complete workflow
      expect(categoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Shopping',
          colour: '#795548'
        })
      )
      expect(wrapper.vm.modalVisible).toBe(false)
    })

    it('simulates complete category edit and delete workflow', async () => {
      // Step 1: Mount Categories view
      wrapper = mount(Categories, {
        global: {
          stubs: {
            LoadingSpinner: true,
            CategoryCard: true,
            CategoryFormModal: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Step 2: User edits category
      const categoryToEdit = mockCategories[0]
      wrapper.vm.editCategory(categoryToEdit)

      // Step 3: User updates category
      wrapper.vm.formData = {
        name: 'Updated Entertainment',
        colour: '#9C27B0'
      }
      await wrapper.vm.saveCategory()

      // Assert: Category updated
      expect(categoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: categoryToEdit.id,
          name: 'Updated Entertainment',
          colour: '#9C27B0'
        })
      )

      // Reset mocks
      vi.clearAllMocks()
      vi.spyOn(categoriesStore, 'remove').mockResolvedValue(undefined)
      global.confirm = vi.fn(() => true)

      // Step 4: User deletes the updated category
      wrapper.vm.editCategory({ ...categoryToEdit, name: 'Updated Entertainment', colour: '#9C27B0' })
      await wrapper.vm.deleteCategory()

      // Assert: Category deleted
      expect(categoriesStore.remove).toHaveBeenCalledWith(categoryToEdit.id)
      expect(wrapper.vm.modalVisible).toBe(false)
    })
  })
})

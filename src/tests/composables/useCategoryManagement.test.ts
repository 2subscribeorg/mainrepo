import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCategoryManagement } from '@/composables/useCategoryManagement'
import { useCategoriesStore } from '@/stores/categories'
import { useAuthStore } from '@/stores/auth'
import type { Category } from '@/domain/models'

// Mock stores to isolate the composable under test
vi.mock('@/stores/categories')
vi.mock('@/stores/auth')

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123')
  }
})

describe('useCategoryManagement', () => {
  let mockCategoriesStore: any
  let mockAuthStore: any
  let pinia: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a fresh Pinia instance for each test
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Mock categories store
    mockCategoriesStore = {
      categories: [],
      save: vi.fn().mockResolvedValue(undefined),
      fetchAll: vi.fn().mockResolvedValue(undefined)
    }
    
    // Mock auth store
    mockAuthStore = {
      userId: 'test-user-123'
    }
    
    // Setup store mocks
    const MockCategoriesStore = vi.mocked(useCategoriesStore)
    const MockAuthStore = vi.mocked(useAuthStore)
    
    MockCategoriesStore.mockReturnValue(mockCategoriesStore)
    MockAuthStore.mockReturnValue(mockAuthStore)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createCategory', () => {
    it('validates input using Zod schema', async () => {
      const { createCategory } = useCategoryManagement()
      
      const validCategoryData = {
        name: 'Entertainment',
        colour: '#FF5733',
        icon: 'tv'
      }
      
      await createCategory(validCategoryData)
      
      expect(mockCategoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Entertainment',
          colour: '#FF5733',
          icon: 'tv'
        })
      )
    })

    it('rejects invalid category names (empty, too short, too long)', async () => {
      const { createCategory } = useCategoryManagement()
      
      // Test empty name
      await expect(createCategory({
        name: '',
        colour: '#FF5733'
      })).rejects.toThrow('Category name must be at least 2 characters')
      
      // Test too short name
      await expect(createCategory({
        name: 'A',
        colour: '#FF5733'
      })).rejects.toThrow('Category name must be at least 2 characters')
      
      // Test too long name
      const longName = 'A'.repeat(51)
      await expect(createCategory({
        name: longName,
        colour: '#FF5733'
      })).rejects.toThrow('Category name must not exceed 50 characters')
    })

    it('rejects invalid color formats (non-hex, wrong length)', async () => {
      const { createCategory } = useCategoryManagement()
      
      // Test invalid hex format
      await expect(createCategory({
        name: 'Entertainment',
        colour: 'red'
      })).rejects.toThrow('Invalid color format. Use hex format (#RRGGBB)')
      
      // Test wrong hex length
      await expect(createCategory({
        name: 'Entertainment',
        colour: '#FF5'
      })).rejects.toThrow('Invalid color format. Use hex format (#RRGGBB)')
      
      // Test missing hash
      await expect(createCategory({
        name: 'Entertainment',
        colour: 'FF5733'
      })).rejects.toThrow('Invalid color format. Use hex format (#RRGGBB)')
    })

    it('rejects invalid character patterns in name', async () => {
      const { createCategory } = useCategoryManagement()
      
      // Test special characters not allowed
      await expect(createCategory({
        name: 'Entertainment@#$',
        colour: '#FF5733'
      })).rejects.toThrow('Category name can only contain letters, numbers, spaces, hyphens, and underscores')
    })

    it('sanitizes category name (trims whitespace)', async () => {
      const { createCategory } = useCategoryManagement()
      
      const categoryData = {
        name: '  Entertainment  ',
        colour: '#FF5733',
        icon: 'tv'
      }
      
      await createCategory(categoryData)
      
      expect(mockCategoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Entertainment' // Should be trimmed
        })
      )
    })

    it('generates proper category object with all required fields', async () => {
      const { createCategory } = useCategoryManagement()
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733',
        icon: 'tv'
      }
      
      const mockDate = '2024-01-15T10:30:00.000Z'
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate)
      
      await createCategory(categoryData)
      
      expect(mockCategoriesStore.save).toHaveBeenCalledWith({
        id: 'test-uuid-123',
        name: 'Entertainment',
        colour: '#FF5733',
        icon: 'tv',
        userId: 'test-user-123',
        createdAt: mockDate,
        updatedAt: mockDate
      })
    })

    it('calls categoriesStore.save with correct data', async () => {
      const { createCategory } = useCategoryManagement()
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733'
      }
      
      await createCategory(categoryData)
      
      expect(mockCategoriesStore.save).toHaveBeenCalledTimes(1)
      expect(mockCategoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Entertainment',
          colour: '#FF5733',
          userId: 'test-user-123'
        })
      )
    })

    it('handles store save failures gracefully', async () => {
      const { createCategory, error } = useCategoryManagement()
      
      const saveError = new Error('Database connection failed')
      mockCategoriesStore.save.mockRejectedValue(saveError)
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733'
      }
      
      await expect(createCategory(categoryData)).rejects.toThrow('Database connection failed')
      expect(error.value).toBe('Database connection failed')
    })

    it('ensures categories are loaded after creation', async () => {
      const { createCategory } = useCategoryManagement()
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733'
      }
      
      await createCategory(categoryData)
      
      expect(mockCategoriesStore.fetchAll).toHaveBeenCalledTimes(1)
    })

    it('returns created category on success', async () => {
      const { createCategory } = useCategoryManagement()
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733',
        icon: 'tv'
      }
      
      const result = await createCategory(categoryData)
      
      expect(result).toEqual(
        expect.objectContaining({
          id: 'test-uuid-123',
          name: 'Entertainment',
          colour: '#FF5733',
          icon: 'tv',
          userId: 'test-user-123'
        })
      )
    })

    it('throws error with validation messages on invalid input', async () => {
      const { createCategory, error } = useCategoryManagement()
      
      const invalidData = {
        name: '',
        colour: 'invalid-color'
      }
      
      await expect(createCategory(invalidData)).rejects.toThrow()
      expect(error.value).toContain('Category name must be at least 2 characters')
    })

    it('handles missing userId gracefully', async () => {
      const { createCategory } = useCategoryManagement()
      
      mockAuthStore.userId = null
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733'
      }
      
      await createCategory(categoryData)
      
      expect(mockCategoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'unknown'
        })
      )
    })
  })

  describe('updateCategory', () => {
    beforeEach(() => {
      // Setup existing categories for update tests
      mockCategoriesStore.categories = [
        {
          id: 'existing-category-1',
          name: 'Old Entertainment',
          colour: '#FF0000',
          icon: 'tv',
          userId: 'test-user-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ]
    })

    it('validates partial updates using Zod schema', async () => {
      const { updateCategory } = useCategoryManagement()
      
      const updates = {
        name: 'New Entertainment',
        colour: '#00FF00'
      }
      
      await updateCategory('existing-category-1', updates)
      
      expect(mockCategoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Entertainment',
          colour: '#00FF00'
        })
      )
    })

    it('requires at least one field for update', async () => {
      const { updateCategory } = useCategoryManagement()
      
      const emptyUpdates = {}
      
      await expect(updateCategory('existing-category-1', emptyUpdates))
        .rejects.toThrow('At least one field must be provided for update')
    })

    it('finds existing category before update', async () => {
      const { updateCategory } = useCategoryManagement()
      
      const updates = { name: 'Updated Name' }
      
      await updateCategory('existing-category-1', updates)
      
      expect(mockCategoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-category-1',
          name: 'Updated Name',
          colour: '#FF0000', // Original color preserved
          icon: 'tv' // Original icon preserved
        })
      )
    })

    it('throws error when category not found', async () => {
      const { updateCategory, error } = useCategoryManagement()
      
      const updates = { name: 'Updated Name' }
      
      await expect(updateCategory('non-existent-id', updates))
        .rejects.toThrow('Category not found')
      
      expect(error.value).toBe('Category not found')
    })

    it('merges updates with existing category data', async () => {
      const { updateCategory } = useCategoryManagement()
      
      const updates = { 
        name: 'Updated Entertainment',
        colour: '#00FF00'
        // icon not provided, should preserve original
      }
      
      await updateCategory('existing-category-1', updates)
      
      expect(mockCategoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-category-1',
          name: 'Updated Entertainment',
          colour: '#00FF00',
          icon: 'tv', // Original preserved
          userId: 'test-user-123', // Original preserved
          createdAt: '2024-01-01T00:00:00.000Z' // Original preserved
        })
      )
    })

    it('updates timestamp on successful update', async () => {
      const { updateCategory } = useCategoryManagement()
      
      const mockDate = '2024-01-15T10:30:00.000Z'
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate)
      
      const updates = { name: 'Updated Name' }
      
      await updateCategory('existing-category-1', updates)
      
      expect(mockCategoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: mockDate
        })
      )
    })

    it('handles concurrent update scenarios', async () => {
      const { updateCategory } = useCategoryManagement()
      
      // Simulate concurrent updates
      const updates1 = { name: 'Update 1' }
      const updates2 = { colour: '#00FF00' }
      
      const promise1 = updateCategory('existing-category-1', updates1)
      const promise2 = updateCategory('existing-category-1', updates2)
      
      await Promise.all([promise1, promise2])
      
      expect(mockCategoriesStore.save).toHaveBeenCalledTimes(2)
    })

    it('validates updated fields using Zod schema', async () => {
      const { updateCategory } = useCategoryManagement()
      
      const invalidUpdates = {
        name: 'A', // Too short
        colour: 'invalid-color' // Invalid format
      }
      
      await expect(updateCategory('existing-category-1', invalidUpdates))
        .rejects.toThrow()
    })
  })

  describe('error handling', () => {
    it('sets error state on validation failures', async () => {
      const { createCategory, error } = useCategoryManagement()
      
      const invalidData = {
        name: '',
        colour: '#FF5733'
      }
      
      try {
        await createCategory(invalidData)
      } catch (e) {
        // Expected to throw
      }
      
      expect(error.value).toContain('Category name must be at least 2 characters')
    })

    it('sets error state on store operation failures', async () => {
      const { createCategory, error } = useCategoryManagement()
      
      const storeError = new Error('Store operation failed')
      mockCategoriesStore.save.mockRejectedValue(storeError)
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733'
      }
      
      try {
        await createCategory(categoryData)
      } catch (e) {
        // Expected to throw
      }
      
      expect(error.value).toBe('Store operation failed')
    })

    it('clears error state on successful operations', async () => {
      const { createCategory, error } = useCategoryManagement()
      
      // First, set an error state
      error.value = 'Previous error'
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733'
      }
      
      await createCategory(categoryData)
      
      expect(error.value).toBeNull()
    })

    it('maintains loading state correctly during operations', async () => {
      const { createCategory, loading } = useCategoryManagement()
      
      expect(loading.value).toBe(false)
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733'
      }
      
      // Mock save to be slow so we can check loading state
      let resolvePromise: () => void
      const slowPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockCategoriesStore.save.mockReturnValue(slowPromise)
      
      const createPromise = createCategory(categoryData)
      
      // Should be loading now
      expect(loading.value).toBe(true)
      
      // Resolve the promise
      resolvePromise!()
      await createPromise
      
      // Should not be loading anymore
      expect(loading.value).toBe(false)
    })

    it('resets loading state even when operations fail', async () => {
      const { createCategory, loading } = useCategoryManagement()
      
      mockCategoriesStore.save.mockRejectedValue(new Error('Save failed'))
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733'
      }
      
      try {
        await createCategory(categoryData)
      } catch (e) {
        // Expected to fail
      }
      
      expect(loading.value).toBe(false)
    })

    it('handles multiple validation errors correctly', async () => {
      const { createCategory, error } = useCategoryManagement()
      
      const invalidData = {
        name: 'A', // Too short
        colour: 'invalid' // Invalid format
      }
      
      try {
        await createCategory(invalidData)
      } catch (e) {
        // Expected to fail
      }
      
      // Should contain multiple error messages
      expect(error.value).toContain('Category name must be at least 2 characters')
    })
  })

  describe('ensureCategoriesLoaded', () => {
    it('fetches categories when store is empty', async () => {
      const { ensureCategoriesLoaded } = useCategoryManagement()
      
      mockCategoriesStore.categories = []
      
      await ensureCategoriesLoaded()
      
      expect(mockCategoriesStore.fetchAll).toHaveBeenCalledTimes(1)
    })

    it('does not fetch categories when store already has data', async () => {
      const { ensureCategoriesLoaded } = useCategoryManagement()
      
      mockCategoriesStore.categories = [
        { id: '1', name: 'Entertainment', colour: '#FF5733' }
      ]
      
      await ensureCategoriesLoaded()
      
      expect(mockCategoriesStore.fetchAll).not.toHaveBeenCalled()
    })
  })

  describe('reactive state', () => {
    it('exposes loading state reactively', () => {
      const { loading } = useCategoryManagement()
      
      expect(loading.value).toBe(false)
      
      // Loading state should be reactive
      loading.value = true
      expect(loading.value).toBe(true)
    })

    it('exposes error state reactively', () => {
      const { error } = useCategoryManagement()
      
      expect(error.value).toBeNull()
      
      // Error state should be reactive
      error.value = 'Test error'
      expect(error.value).toBe('Test error')
    })
  })

  describe('integration scenarios', () => {
    it('handles complete category creation workflow', async () => {
      const { createCategory, loading, error } = useCategoryManagement()
      
      const categoryData = {
        name: 'Entertainment',
        colour: '#FF5733',
        icon: 'tv'
      }
      
      // Initially not loading, no error
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      
      const result = await createCategory(categoryData)
      
      // Should have called all expected methods
      expect(mockCategoriesStore.save).toHaveBeenCalledTimes(1)
      expect(mockCategoriesStore.fetchAll).toHaveBeenCalledTimes(1)
      
      // Should return created category
      expect(result).toEqual(
        expect.objectContaining({
          name: 'Entertainment',
          colour: '#FF5733',
          icon: 'tv'
        })
      )
      
      // Should end in clean state
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('handles complete category update workflow', async () => {
      const { updateCategory, loading, error } = useCategoryManagement()
      
      // Setup existing category
      mockCategoriesStore.categories = [
        {
          id: 'existing-1',
          name: 'Old Name',
          colour: '#FF0000',
          icon: 'old-icon',
          userId: 'test-user-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ]
      
      const updates = {
        name: 'New Name',
        colour: '#00FF00'
      }
      
      // Initially not loading, no error
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      
      await updateCategory('existing-1', updates)
      
      // Should have called save with merged data
      expect(mockCategoriesStore.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-1',
          name: 'New Name',
          colour: '#00FF00',
          icon: 'old-icon', // Preserved
          userId: 'test-user-123', // Preserved
          createdAt: '2024-01-01T00:00:00.000Z' // Preserved
        })
      )
      
      // Should end in clean state
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })
  })
})

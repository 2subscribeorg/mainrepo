import { ref } from 'vue'
import { useCategoriesStore } from '@/stores/categories'
import { useAuthStore } from '@/stores/auth'
import type { Category } from '@/domain/models'
import { validateCategoryForm, validateCategoryUpdate, getErrorMessages, type CategoryFormData, type CategoryUpdateData } from '@/schemas/form-validation.schema'

export function useCategoryManagement() {
  const categoriesStore = useCategoriesStore()
  const authStore = useAuthStore()
  
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function createCategory(categoryData: CategoryFormData): Promise<Category> {
    loading.value = true
    error.value = null
    
    try {
      // Validate input data using Zod schema
      const validationResult = validateCategoryForm(categoryData)
      if (!validationResult.success) {
        const errorMessages = getErrorMessages(validationResult.error)
        const errorMessage = errorMessages.join(', ')
        error.value = errorMessage
        throw new Error(errorMessage)
      }

      const validatedData = validationResult.data
      
      const newCategory: Category = {
        id: crypto.randomUUID(),
        name: validatedData.name,
        colour: validatedData.colour,
        userId: authStore.userId || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Only add icon field if it has a value (Firestore doesn't accept undefined)
      if (validatedData.icon) {
        newCategory.icon = validatedData.icon
      }
      
      await categoriesStore.save(newCategory)
      
      // Ensure the category is immediately available in the store
      // This fixes race conditions when creating category + subscription together
      await ensureCategoriesLoaded()
      
      console.log('✅ Category created successfully:', newCategory.name)
      return newCategory
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to create category'
      error.value = errorMessage
      console.error('❌ Failed to create category:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateCategory(categoryId: string, updates: CategoryUpdateData): Promise<void> {
    loading.value = true
    error.value = null
    
    try {
      // Validate input data using Zod schema
      const validationResult = validateCategoryUpdate(updates)
      if (!validationResult.success) {
        const errorMessages = getErrorMessages(validationResult.error)
        const errorMessage = errorMessages.join(', ')
        error.value = errorMessage
        throw new Error(errorMessage)
      }

      const validatedUpdates = validationResult.data
      
      const existingCategory = categoriesStore.categories.find(c => c.id === categoryId)
      if (!existingCategory) {
        throw new Error('Category not found')
      }
      
      const updatedCategory = {
        ...existingCategory,
        updatedAt: new Date().toISOString()
      }
      
      // Only add fields that have values (Firestore doesn't accept undefined)
      Object.keys(validatedUpdates).forEach(key => {
        const value = validatedUpdates[key as keyof CategoryUpdateData]
        if (value !== undefined) {
          (updatedCategory as any)[key] = value
        }
      })
      
      await categoriesStore.save(updatedCategory)
      console.log('✅ Category updated successfully:', updatedCategory.name)
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to update category'
      error.value = errorMessage
      console.error('❌ Failed to update category:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function ensureCategoriesLoaded(): Promise<void> {
    if (categoriesStore.categories.length === 0) {
      await categoriesStore.fetchAll()
    }
  }

  return {
    loading,
    error,
    createCategory,
    updateCategory,
    ensureCategoriesLoaded
  }
}

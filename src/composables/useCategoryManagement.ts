import { ref } from 'vue'
import { useCategoriesStore } from '@/stores/categories'
import { useAuthStore } from '@/stores/auth'
import type { Category } from '@/domain/models'

export function useCategoryManagement() {
  const categoriesStore = useCategoriesStore()
  const authStore = useAuthStore()
  
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function createCategory(categoryData: {
    name: string
    colour: string
  }): Promise<Category> {
    loading.value = true
    error.value = null
    
    try {
      const newCategory: Category = {
        id: crypto.randomUUID(),
        name: categoryData.name.trim(),
        colour: categoryData.colour,
        userId: authStore.userId || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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

  async function updateCategory(categoryId: string, updates: Partial<Category>): Promise<void> {
    loading.value = true
    error.value = null
    
    try {
      const existingCategory = categoriesStore.categories.find(c => c.id === categoryId)
      if (!existingCategory) {
        throw new Error('Category not found')
      }
      
      const updatedCategory = {
        ...existingCategory,
        ...updates,
        updatedAt: new Date().toISOString()
      }
      
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

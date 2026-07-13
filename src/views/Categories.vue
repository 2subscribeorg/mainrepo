<template>
  <PullToRefresh :onRefresh="handleRefresh">
  <div>
    <!-- Success Message Announcement -->
    <div 
      v-if="showSuccess" 
      role="status" 
      aria-live="polite"
      class="fixed top-4 right-4 z-toast bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 fade-in"
    >
      <span aria-hidden="true" class="text-green-600">✓</span>
      <span class="font-medium">{{ successMessage }}</span>
    </div>

    <div class="flex items-center justify-between">
      <h2 class="text-3xl font-bold text-gray-900">Categories</h2>
      <button
        ref="addButtonRef"
        @click="handleAddCategoryClick"
        class="rounded-lg bg-primary px-4 py-2 text-white transition-all duration-150 btn-animated gpu-accelerated add-category-btn"
      >
        Add Category
      </button>
    </div>

    <div v-if="loading" class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SkeletonLoader variant="card" height="120px" :count="6" />
    </div>

    <div v-else class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ErrorBoundary component="CategoryGrid">
        <TransitionGroup name="category-card" tag="div" class="contents">
          <CategoryCard
            v-for="category in categoriesStore.categories"
            :key="category.id"
            :category="category"
            class="category-card-enter"
            @edit="editCategory"
            @delete="handleDeleteFromSwipe"
          />
        </TransitionGroup>
      </ErrorBoundary>
    </div>

    <ErrorBoundary component="CategoryFormModal">
      <CategoryFormModal
        :show="modalVisible"
        :form-data="formData"
        :saving="saving"
        :editing="Boolean(editingCategory)"
        :validation-errors="validationErrors"
        @close="closeModal"
        @delete="deleteCategory"
        @save="saveCategory"
        @update:formData="(value) => (formData = value)"
      />
    </ErrorBoundary>

    <ConfirmDialog
      :is-open="showDeleteConfirm"
      :title="`Delete ${categoryToDelete?.name || 'Category'}?`"
      :message="`Are you sure you want to delete this category? This action cannot be undone.`"
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="executeDelete"
      @cancel="cancelDelete"
    />
  </div>
  </PullToRefresh>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import PullToRefresh from '@/components/PullToRefresh.vue'
import { useCategoriesStore } from '@/stores/categories'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import type { Category } from '@/domain/models'
import { DEFAULT_COLORS } from '@/utils/colors'
import { sanitizeAmount } from '@/utils/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'
import CategoryCard from '@/components/categories/CategoryCard.vue'
import CategoryFormModal from '@/components/categories/CategoryFormModal.vue'
import { useAnimations } from '@/utils/useAnimations'
import { validateCategoryWithZod } from '@/schemas/category.schema'
import { useLoadingStates } from '@/composables/useLoadingStates'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import { useCategoryManagement } from '@/composables/useCategoryManagement'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const categoriesStore = useCategoriesStore()
const { createCategory, updateCategory } = useCategoryManagement()

// Use animation utilities
const { createRipple, prefersReducedMotion } = useAnimations()
const addButtonRef = ref<HTMLElement>()

// Unified loading states
const { isLoading } = useLoadingStates()
const loading = isLoading('categories')
const saving = isLoading('categories')
const successMessage = ref('')
const showSuccess = ref(false)
const editingCategory = ref<Category | null>(null)
const formData = ref<{
  name: string
  colour: string
  icon?: string
}>({
  name: '',
  colour: DEFAULT_COLORS[0],
  icon: undefined,
})
const validationErrors = ref<string[]>([])
const modalMode = ref<'create' | 'edit' | null>(null)
const modalVisible = computed(() => Boolean(editingCategory.value) || modalMode.value === 'create')

// Custom confirm dialog state for delete actions (replaces native confirm())
const showDeleteConfirm = ref(false)
const categoryToDelete = ref<Category | null>(null)

function handleAddCategoryClick(event: MouseEvent) {
  // Add ripple effect
  if (!prefersReducedMotion.value && addButtonRef.value) {
    createRipple(event, addButtonRef.value)
  }
  openCreateModal()
}

function openCreateModal() {
  editingCategory.value = null
  formData.value = {
    name: '',
    colour: DEFAULT_COLORS[0],
    icon: undefined,
  }
  validationErrors.value = []
  modalMode.value = 'create'
}

function editCategory(category: Category) {
  editingCategory.value = category
  formData.value = {
    name: category.name,
    colour: category.colour ?? DEFAULT_COLORS[0],
    icon: category.icon,
  }
  modalMode.value = 'edit'
}

function handleDeleteFromSwipe(category: Category) {
  categoryToDelete.value = category
  showDeleteConfirm.value = true
}

function closeModal() {
  editingCategory.value = null
  formData.value = {
    name: '',
    colour: DEFAULT_COLORS[0],
    icon: undefined,
  }
  validationErrors.value = []
  modalMode.value = null
}

let successTimeout: ReturnType<typeof setTimeout> | null = null

function showSuccessMessage(message: string) {
  successMessage.value = message
  showSuccess.value = true
  
  // Clear any existing timeout before setting a new one
  if (successTimeout) clearTimeout(successTimeout)
  // Auto-hide after 3 seconds
  successTimeout = setTimeout(() => {
    showSuccess.value = false
    successMessage.value = ''
  }, 3000)
}

async function saveCategory() {
  validationErrors.value = []
  
  // Rate limiting
  const rateLimitKey = `save-category-${editingCategory.value?.id || 'new'}`
  if (!checkRateLimit(rateLimitKey, RATE_LIMITS.SAVE_DATA)) {
    validationErrors.value = [getRateLimitMessage(rateLimitKey, RATE_LIMITS.SAVE_DATA)]
    return
  }

  // Validate with Zod (schema auto-sanitizes)
  const input = {
    name: formData.value.name,
    colour: formData.value.colour,
    icon: formData.value.icon
  }

  const validation = validateCategoryWithZod(input)
  if (!validation.isValid) {
    validationErrors.value = validation.errors
    return
  }

  try {
    if (editingCategory.value) {
      // Update existing category
      await updateCategory(editingCategory.value.id, {
        name: validation.data!.name,
        colour: validation.data!.colour || DEFAULT_COLORS[0],
        icon: formData.value.icon
      })
    } else {
      // Create new category
      await createCategory({
        name: validation.data!.name,
        colour: validation.data!.colour || DEFAULT_COLORS[0],
        icon: formData.value.icon
      })
    }
    
    closeModal()
    
    // Show success message
    const action = editingCategory.value ? 'updated' : 'created'
    const categoryName = validation.data!.name
    showSuccessMessage(`Category "${categoryName}" ${action} successfully!`)
  } catch (error) {
    // Show actual error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    validationErrors.value = [`Failed to save category: ${errorMessage}`]
  }
}

function deleteCategory() {
  if (!editingCategory.value) return
  categoryToDelete.value = editingCategory.value
  showDeleteConfirm.value = true
}

async function executeDelete() {
  const category = categoryToDelete.value
  if (!category) return

  const categoryName = category.name
  const categoryId = category.id

  try {
    await categoriesStore.remove(categoryId)
    closeModal()
    showDeleteConfirm.value = false
    categoryToDelete.value = null

    showSuccessMessage(`Category "${categoryName}" deleted successfully!`)
  } catch (error) {
    const categoryStillExists = categoriesStore.categories.some(c => c.id === categoryId)

    if (!categoryStillExists) {
      closeModal()
      showDeleteConfirm.value = false
      categoryToDelete.value = null
      showSuccessMessage(`Category "${categoryName}" deleted successfully!`)
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      validationErrors.value = [`Failed to delete category: ${errorMessage}`]
      showDeleteConfirm.value = false
      categoryToDelete.value = null
    }
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  categoryToDelete.value = null
}

async function handleRefresh() {
  await categoriesStore.fetchAll()
}

onMounted(async () => {
  await categoriesStore.fetchAll()
})

onUnmounted(() => {
  if (successTimeout) clearTimeout(successTimeout)
})
</script>

<style scoped>
.add-category-btn {
  transition: all var(--duration-micro) var(--ease-out);
  transform: translateZ(0); /* GPU acceleration */
  position: relative;
  overflow: hidden;
}

.add-category-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  background: color-mix(in srgb, var(--color-primary) 85%, white);
}

.add-category-btn:active {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Add a subtle glow effect on hover */
.add-category-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  opacity: 0;
  transition: opacity var(--duration-micro) var(--ease-out);
  pointer-events: none;
}

.add-category-btn:hover::before {
  opacity: 1;
}
</style>

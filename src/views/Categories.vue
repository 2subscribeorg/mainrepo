<template>
  <div>
    <!-- Success Message Announcement -->
    <div 
      v-if="showSuccess" 
      role="status" 
      aria-live="polite"
      class="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 fade-in"
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

    <LoadingSpinner v-if="loading" />

    <div v-else class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCategoriesStore } from '@/stores/categories'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { Category } from '@/domain/models'
import { DEFAULT_COLORS } from '@/utils/colors'
import { sanitizeAmount } from '@/utils/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'
import CategoryCard from '@/components/categories/CategoryCard.vue'
import CategoryFormModal from '@/components/categories/CategoryFormModal.vue'
import { useAnimations } from '@/utils/useAnimations'
import { validateCategoryWithZod } from '@/schemas/category.schema'

const categoriesStore = useCategoriesStore()

// Use animation utilities
const { createRipple, prefersReducedMotion } = useAnimations()
const addButtonRef = ref<HTMLElement>()

const loading = ref(true)
const saving = ref(false)
const successMessage = ref('')
const showSuccess = ref(false)
const editingCategory = ref<Category | null>(null)
const formData = ref({
  name: '',
  colour: DEFAULT_COLORS[0],
})
const validationErrors = ref<string[]>([])
const modalMode = ref<'create' | 'edit' | null>(null)
const modalVisible = computed(() => Boolean(editingCategory.value) || modalMode.value === 'create')

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
  }
  validationErrors.value = []
  modalMode.value = 'create'
}

function editCategory(category: Category) {
  editingCategory.value = category
  formData.value = {
    name: category.name,
    colour: category.colour ?? DEFAULT_COLORS[0],
  }
  modalMode.value = 'edit'
}

function handleDeleteFromSwipe(category: Category) {
  // Confirm deletion
  if (!confirm(`Delete category "${category.name}"?`)) return
  
  // Set as editing category and trigger delete
  editingCategory.value = category
  deleteCategory()
}

function closeModal() {
  editingCategory.value = null
  formData.value = {
    name: '',
    colour: DEFAULT_COLORS[0],
  }
  validationErrors.value = []
  modalMode.value = null
}

function showSuccessMessage(message: string) {
  successMessage.value = message
  showSuccess.value = true
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
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
  }

  const validation = validateCategoryWithZod(input)
  if (!validation.isValid) {
    validationErrors.value = validation.errors
    return
  }

  saving.value = true
  try {
    // Use validated & sanitized data from Zod schema
    const category: Category = {
      id: editingCategory.value?.id || crypto.randomUUID(),
      name: validation.data!.name,
      colour: validation.data!.colour || DEFAULT_COLORS[0],
    }

    await categoriesStore.save(category)
    closeModal()
    
    // Show success message
    const action = editingCategory.value ? 'updated' : 'created'
    showSuccessMessage(`Category "${category.name}" ${action} successfully!`)
  } catch (error) {
    // Show actual error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Category save error:', error)
    validationErrors.value = [`Failed to save category: ${errorMessage}`]
  } finally {
    saving.value = false
  }
}

async function deleteCategory() {
  if (!editingCategory.value) return
  if (!confirm(`Delete category "${editingCategory.value.name}"?`)) return

  try {
    await categoriesStore.remove(editingCategory.value.id)
    closeModal()
    
    // Show success message
    showSuccessMessage(`Category "${editingCategory.value.name}" deleted successfully!`)
  } catch (_error) {
    alert('Failed to delete category')
  }
}

onMounted(async () => {
  await categoriesStore.fetchAll()
  loading.value = false
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

<template>
  <Transition 
    :enter-active-class="modalTransition.enterActiveClass"
    :leave-active-class="modalTransition.leaveActiveClass"
    :enter-from-class="modalTransition.enterFromClass || 'modal-enter-from'"
    :leave-to-class="modalTransition.leaveToClass || 'modal-leave-to'"
    appear
  >
    <div 
      v-if="show" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop-enter"
      @keydown.esc="handleEscape"
    >
      <div 
        ref="modalRef"
        class="bg-[var(--color-surface)] rounded-lg p-6 w-96 max-w-md mx-4 shadow-xl modal-enter gpu-accelerated"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h3 id="modal-title" class="text-lg font-semibold text-text-primary mb-4 slide-down">
          Select Category for {{ merchantName }}
        </h3>
      
      <!-- Existing Categories -->
      <div class="mb-4">
        <label for="category-select" class="block text-sm font-medium text-text-primary mb-2">
          Choose existing category:
        </label>
        <select 
          id="category-select"
          v-model="selectedCategoryId" 
          class="w-full border border-[rgba(15,23,42,0.12)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-[var(--color-background)] text-text-primary"
          aria-describedby="category-description"
        >
          <option value="">Select a category...</option>
          <option 
            v-for="category in categories" 
            :key="category.id" 
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>
        <p id="category-description" class="sr-only">
          Select an existing category from the dropdown list or create a new one below
        </p>
      </div>

      <!-- Or Create New -->
      <div class="mb-4">
        <div class="flex items-center mb-2">
          <hr class="flex-1 border-[rgba(15,23,42,0.12)]">
          <span class="px-3 text-sm text-text-secondary">or</span>
          <hr class="flex-1 border-[rgba(15,23,42,0.12)]">
        </div>
        
        <label for="new-category-name" class="block text-sm font-medium text-text-primary mb-2">
          Create new category:
        </label>
        
        <div class="space-y-3">
          <input
            id="new-category-name"
            v-model="newCategoryName"
            type="text"
            placeholder="Category name"
            class="w-full border border-[rgba(15,23,42,0.12)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-[var(--color-background)] text-text-primary placeholder:text-text-secondary"
            aria-describedby="new-category-hint"
            :aria-invalid="validationErrors.length > 0"
            aria-required="true"
          />
          <p id="new-category-hint" class="sr-only">
            Enter a name for the new category you want to create
          </p>
          
          <div>
            <fieldset>
              <legend class="text-sm font-medium text-text-primary">Color</legend>
              <div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="Category color options">
              <button
                v-for="color in DEFAULT_COLORS"
                :key="color"
                type="button"
                data-testid="color-button"
                class="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                :class="newCategoryColor === color ? 'border-text-primary' : 'border-transparent'"
                :style="{ backgroundColor: color }"
                :aria-pressed="newCategoryColor === color"
                :aria-label="`Select ${color} color for category ${newCategoryColor === color ? '(selected)' : '(not selected)'}`"
                @click="newCategoryColor = color"
              >
                <!-- Visual indicator beyond color -->
                <span 
                  v-if="newCategoryColor === color"
                  class="text-white text-xs font-bold"
                  :style="{ 
                    textShadow: '0 0 2px rgba(0,0,0,0.8)',
                    color: getContrastColor(color)
                  }"
                >
                  ✓
                </span>
              </button>
            </div>
            </fieldset>
          </div>
        </div>
      </div>

      <!-- Error Messages -->
      <div 
        v-if="validationErrors.length > 0" 
        role="alert" 
        aria-live="polite"
        class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"
      >
        <p class="text-red-800 text-sm font-medium">Please fix the following errors:</p>
        <ul class="mt-1 text-red-700 text-sm list-disc list-inside">
          <li v-for="error in validationErrors" :key="error">{{ error }}</li>
        </ul>
      </div>

      <!-- Actions -->
      <div class="flex justify-end space-x-3 mt-6">
        <button 
          @click="handleCancel"
          class="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors duration-150 btn-animated"
          aria-label="Cancel category selection"
        >
          Cancel
        </button>
        <button 
          @click="handleConfirm"
          :disabled="!canConfirm"
          :aria-label="isCreatingNew ? 'Create new category and add merchant' : 'Add merchant to selected category'"
          class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 btn-animated"
        >
          {{ isCreatingNew ? 'Create & Add' : 'Add to Category' }}
        </button>
      </div>
    </div>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { Category } from '@/domain/models'
import { DEFAULT_COLORS } from '@/utils/colors'
import { useTransitions } from '@/utils/useAnimations'

interface Props {
  show: boolean
  merchantName: string
  categories: Category[]
}

interface Emits {
  (e: 'confirm', categoryId: string): void
  (e: 'create-and-confirm', categoryData: { name: string; colour: string }): void
  (e: 'close'): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Focus management
const modalRef = ref<HTMLElement>()
const previousFocusRef = ref<HTMLElement>()

// Form state
const selectedCategoryId = ref('')
const newCategoryName = ref('')
const newCategoryColor = ref(DEFAULT_COLORS[0])

// Animation utilities
const modalTransition = useTransitions('modal')

// Validation
const validationErrors = computed(() => {
  const errors: string[] = []
  
  if (isCreatingNew.value) {
    if (!newCategoryName.value.trim()) {
      errors.push('Category name is required')
    }
    if (newCategoryName.value.trim().length < 2) {
      errors.push('Category name must be at least 2 characters')
    }
    if (props.categories.some(cat => cat.name.toLowerCase() === newCategoryName.value.trim().toLowerCase())) {
      errors.push('A category with this name already exists')
    }
  } else if (!selectedCategoryId.value) {
    errors.push('Please select a category')
  }
  
  return errors
})

const isCreatingNew = computed(() => newCategoryName.value.trim().length > 0)
const canConfirm = computed(() => {
  if (isCreatingNew.value) {
    return newCategoryName.value.trim().length >= 2 && 
           !props.categories.some(cat => cat.name.toLowerCase() === newCategoryName.value.trim().toLowerCase())
  }
  return selectedCategoryId.value !== ''
})

// Focus management
function handleEscape() {
  emit('close')
}

function handleCancel() {
  emit('cancel')
  emit('close')
}

function handleConfirm() {
  if (isCreatingNew.value) {
    // Pass raw data - parent will validate with Zod (which auto-sanitizes)
    emit('create-and-confirm', {
      name: newCategoryName.value.trim(),
      colour: newCategoryColor.value
    })
  } else if (selectedCategoryId.value) {
    emit('confirm', selectedCategoryId.value)
  }
}

// Focus trap and restoration
watch(() => props.show, async (show) => {
  if (show) {
    // Reset form when modal opens
    selectedCategoryId.value = ''
    newCategoryName.value = ''
    newCategoryColor.value = DEFAULT_COLORS[0]
    
    // Store previous focus
    previousFocusRef.value = document.activeElement as HTMLElement
    
    // Wait for modal to be rendered
    await nextTick()
    
    // Focus first focusable element
    const firstFocusable = modalRef.value?.querySelector('select, input, button') as HTMLElement
    if (firstFocusable) {
      firstFocusable.focus()
    }
  } else {
    // Restore focus
    if (previousFocusRef.value) {
      previousFocusRef.value.focus()
    }
  }
})

// Close on Escape key
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.show) {
      handleEscape()
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  
  // Cleanup
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
})

// Helper function to determine contrast color for checkmark
function getContrastColor(backgroundColor: string): string {
  // Simple luminance calculation for contrast
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
</script>

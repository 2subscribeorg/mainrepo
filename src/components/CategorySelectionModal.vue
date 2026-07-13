<template>
  <Teleport to="body">
  <Transition 
    :enter-active-class="modalTransition.enterActiveClass"
    :leave-active-class="modalTransition.leaveActiveClass"
    :enter-from-class="modalTransition.enterFromClass || 'modal-enter-from'"
    :leave-to-class="modalTransition.leaveToClass || 'modal-leave-to'"
    appear
  >
    <div 
      v-if="show" 
      class="fixed inset-0 z-modal"
      @keydown.esc="handleEscape"
    >
      <!-- Backdrop with blur -->
      <div 
        class="fixed inset-0 bg-black/70 backdrop-blur-xl"
        @click="handleCancel"
      />
      
      <!-- Modal container -->
      <div class="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <!-- Modal content -->
        <div 
          ref="modalRef"
          class="relative bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
        <!-- Header -->
        <div class="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h3 id="modal-title" class="text-lg font-semibold text-text-primary">
            Select Category for {{ merchantName }}
          </h3>
        </div>
        
        <!-- Scrollable content -->
        <div class="px-6 py-4 overflow-y-auto flex-1">
      
      <!-- Existing Categories -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-text-primary mb-2">
          Choose existing category:
        </label>
        <div class="max-h-48 overflow-y-auto rounded-lg border border-[rgba(15,23,42,0.08)] p-2">
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              class="touch-target rounded-lg border text-sm font-medium transition-all flex items-center gap-2 px-3 py-2"
              :class="
                selectedCategoryId === category.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-light bg-surface text-text-secondary hover:border-primary/30'
              "
              :aria-pressed="selectedCategoryId === category.id"
              :disabled="isCreatingNew"
              @click="selectedCategoryId = category.id"
            >
              <span
                class="h-4 w-4 rounded-full flex-shrink-0"
                :style="{ backgroundColor: category.colour || '#6366f1' }"
              />
              <span class="truncate">{{ category.name }}</span>
              <span v-if="selectedCategoryId === category.id" class="ml-auto text-primary">✓</span>
            </button>
          </div>
        </div>
        <p id="category-description" class="sr-only">
          Select an existing category from the list or create a new one below
        </p>
      </div>

      <!-- Or Create New (hidden when existing category is selected) -->
      <div v-if="!selectedCategoryId" class="mb-4">
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

          <div>
            <label class="text-sm font-medium text-text-primary">Icon (Optional)</label>
            <div class="mt-1">
              <IconSelector 
                v-model="newCategoryIcon" 
                :fallback-color="newCategoryColor"
              />
            </div>
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

        </div>
        
        <!-- Footer with actions -->
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div class="flex justify-end space-x-3">
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
      </div>
    </div>
  </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { Category } from '@/domain/models'
import { DEFAULT_COLORS } from '@/utils/colors'
import { useTransitions } from '@/utils/useAnimations'
import IconSelector from '@/components/ui/IconSelector.vue'
import { getDefaultIconForCategory } from '@/utils/categoryIcons'

interface Props {
  show: boolean
  merchantName: string
  categories: Category[]
}

interface Emits {
  (e: 'confirm', categoryId: string): void
  (e: 'create-and-confirm', categoryData: { name: string; colour: string; icon?: string }): void
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
const newCategoryIcon = ref<string | undefined>(undefined)
const isSubmitting = ref(false) // Track if form is being submitted

// Animation utilities
const { modalTransition } = useTransitions()

// Validation
const validationErrors = computed(() => {
  // Don't show validation errors while submitting (prevents showing duplicate error after creation)
  if (isSubmitting.value) {
    return []
  }
  
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

// Smart icon suggestion based on new category name
watch(newCategoryName, (newName) => {
  if (!newCategoryIcon.value && newName.trim()) {
    const suggestedIcon = getDefaultIconForCategory(newName)
    if (suggestedIcon && suggestedIcon !== 'tag') {
      newCategoryIcon.value = suggestedIcon
    }
  }
  // Clear existing category selection when typing a new name
  if (newName.trim()) {
    selectedCategoryId.value = ''
  }
})
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
  isSubmitting.value = false
  emit('cancel')
  emit('close')
}

function handleConfirm() {
  // Set submitting flag to prevent validation errors during creation
  isSubmitting.value = true
  
  if (isCreatingNew.value) {
    // Pass raw data - parent will validate with Zod (which auto-sanitizes)
    emit('create-and-confirm', {
      name: newCategoryName.value.trim(),
      colour: newCategoryColor.value,
      icon: newCategoryIcon.value
    })
  } else if (selectedCategoryId.value) {
    emit('confirm', selectedCategoryId.value)
  }
}

// Focus trap and restoration
let savedOverflow = ''

watch(() => props.show, async (show) => {
  if (show) {
    // Reset form when modal opens
    isSubmitting.value = false
    selectedCategoryId.value = ''
    newCategoryName.value = ''
    newCategoryColor.value = DEFAULT_COLORS[0]
    newCategoryIcon.value = undefined
    
    // Lock body scroll
    if (typeof document !== 'undefined') {
      savedOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    
    // Store previous focus
    previousFocusRef.value = document.activeElement as HTMLElement
    
    // Wait for modal to be rendered
    await nextTick()
    
    // Focus first focusable element
    const firstFocusable = modalRef.value?.querySelector('button, input, [tabindex]') as HTMLElement
    if (firstFocusable) {
      firstFocusable.focus()
    }
  } else {
    // Restore body scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = savedOverflow
    }
    
    // Restore focus
    if (previousFocusRef.value) {
      previousFocusRef.value.focus()
    }
  }
})

// Close on Escape key
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) {
    handleEscape()
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleKeyDown)
    document.body.style.overflow = savedOverflow
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

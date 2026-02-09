<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div
        v-if="show"
        class="modal-overlay modal-backdrop-enter"
        @click.self="$emit('close')"
        @keydown.esc="handleEscape"
      >
        <div 
          ref="modalRef"
          class="modal-card modal-enter gpu-accelerated"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <h3 id="modal-title" class="modal-title slide-down">
            {{ editing ? 'Edit Category' : 'Add Category' }}
          </h3>

      <div class="modal-content">
        <div>
          <label for="category-name" class="input-label">Name</label>
          <input
            id="category-name"
            v-model="nameModel"
            type="text"
            class="text-input input-animated"
            placeholder="e.g. Streaming"
            autocomplete="off"
            aria-describedby="name-hint"
            :aria-invalid="validationErrors.length > 0"
            aria-required="true"
          />
          <p id="name-hint" class="sr-only">
            Enter a name for the category
          </p>
        </div>

        <div>
          <label for="category-color" class="input-label">Color</label>
          <CategoryColorPicker 
            id="category-color"
            v-model="colorModel" 
            :aria-label="`Select color for category`"
          />
        </div>

        <ValidationErrors 
          v-if="validationErrors.length" 
          :errors="validationErrors"
          role="alert"
          aria-live="polite"
        />
      </div>

      <div class="modal-actions">
        <button 
          class="btn-secondary btn-animated" 
          @click="$emit('close')"
          aria-label="Cancel category form"
        >
          Cancel
        </button>
        <button
          v-if="editing"
          class="btn-danger btn-animated"
          type="button"
          @click="$emit('delete')"
          aria-label="Delete this category"
        >
          Delete
        </button>
        <button
          class="btn-primary btn-animated"
          :disabled="saving"
          @click="$emit('save')"
          :aria-label="editing ? 'Update category' : 'Create new category'"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import CategoryColorPicker from './CategoryColorPicker.vue'
import ValidationErrors from '@/components/ValidationErrors.vue'

interface CategoryFormData {
  name: string
  colour: string
}

const props = defineProps<{
  show: boolean
  formData: CategoryFormData
  saving: boolean
  editing: boolean
  validationErrors: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'delete'): void
  (e: 'update:formData', value: CategoryFormData): void
}>()

// Focus management
const modalRef = ref<HTMLElement>()
const previousFocusRef = ref<HTMLElement>()

// Computed properties
const nameModel = computed({
  get: () => props.formData.name,
  set: (value) => emit('update:formData', { ...props.formData, name: value })
})

const colorModel = computed({
  get: () => props.formData.colour,
  set: (value) => emit('update:formData', { ...props.formData, colour: value })
})

// Focus management
function handleEscape() {
  emit('close')
}

// Focus trap and restoration
watch(() => props.show, async (show) => {
  if (show) {
    // Store previous focus
    previousFocusRef.value = document.activeElement as HTMLElement
    
    // Wait for modal to be rendered
    await nextTick()
    
    // Focus first input
    const firstInput = modalRef.value?.querySelector('input') as HTMLElement
    if (firstInput) {
      firstInput.focus()
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
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-card {
  width: min(520px, 100%);
  border-radius: 24px;
  background: var(--color-surface);
  padding: 2rem;
  box-shadow: 0 32px 80px rgba(15, 23, 42, 0.25);
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 1.5rem;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-label {
  display: block;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.35rem;
}

.text-input {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(93, 63, 211, 0.2);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 0.65rem 1.4rem;
  border-radius: 999px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(15, 23, 42, 0.06);
  color: var(--color-text-primary);
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-primary:hover:not(:disabled),
.btn-secondary:hover,
.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15);
}
</style>

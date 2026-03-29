<template>
  <div class="form-error-boundary">
    <div v-if="error" class="form-error">
      <div class="form-error-container">
        <div class="error-icon">⚠️</div>
        <h4>{{ errorTitle }}</h4>
        <p>{{ errorMessage }}</p>
        
        <!-- Field-specific errors -->
        <div v-if="fieldErrors.length > 0" class="field-errors">
          <h5>Issues to fix:</h5>
          <ul>
            <li v-for="fieldError in fieldErrors" :key="fieldError.field">
              <strong>{{ fieldError.field }}:</strong> {{ fieldError.message }}
            </li>
          </ul>
        </div>
        
        <div class="form-error-actions">
          <button @click="retry" class="retry-button">
            🔄 Try Again
          </button>
          <button @click="clearForm" class="clear-button">
            🗑️ Clear Form
          </button>
        </div>
      </div>
    </div>
    
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { ref, computed, onErrorCaptured } from 'vue'

interface FieldError {
  field: string
  message: string
}

interface FormErrorBoundaryProps {
  fallbackMessage?: string
  preserveFormData?: boolean
}

const props = withDefaults(defineProps<FormErrorBoundaryProps>(), {
  fallbackMessage: 'Form submission failed. Please check your input and try again.',
  preserveFormData: true
})

const error = ref<Error | null>(null)
const fieldErrors = ref<FieldError[]>([])

const errorTitle = computed(() => {
  if (!error.value) return ''
  
  const message = error.value.message.toLowerCase()
  
  if (message.includes('validation')) {
    return 'Validation Error'
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Submission Error'
  }
  
  if (message.includes('duplicate') || message.includes('exists')) {
    return 'Duplicate Entry'
  }
  
  return 'Form Error'
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  
  const message = error.value.message.toLowerCase()
  
  if (message.includes('validation')) {
    return 'Please check the highlighted fields and correct any errors before submitting.'
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to submit the form due to connection issues. Please try again.'
  }
  
  if (message.includes('duplicate') || message.includes('exists')) {
    return 'This entry already exists. Please use a different value or check existing records.'
  }
  
  return props.fallbackMessage
})

onErrorCaptured((err: Error) => {
  logger.error('FormErrorBoundary caught error:', err)
  error.value = err
  
  // Try to extract field errors from the error message
  extractFieldErrors(err)
  
  return false
})

function extractFieldErrors(err: Error) {
  const message = err.message.toLowerCase()
  const errors: FieldError[] = []
  
  // Common field error patterns
  if (message.includes('email')) {
    errors.push({ field: 'Email', message: 'Please enter a valid email address' })
  }
  
  if (message.includes('password')) {
    errors.push({ field: 'Password', message: 'Password does not meet requirements' })
  }
  
  if (message.includes('name') && message.includes('required')) {
    errors.push({ field: 'Name', message: 'Name is required' })
  }
  
  if (message.includes('amount') || message.includes('number')) {
    errors.push({ field: 'Amount', message: 'Please enter a valid amount' })
  }
  
  fieldErrors.value = errors
}

function retry() {
  error.value = null
  fieldErrors.value = []
}

function clearForm() {
  // Emit event to parent to clear form
  const formElement = document.querySelector('form')
  if (formElement) {
    formElement.reset()
  }
  
  error.value = null
  fieldErrors.value = []
}

// Expose methods for parent components
defineExpose({
  retry,
  clearForm,
  setError: (err: Error) => {
    error.value = err
    extractFieldErrors(err)
  },
  clearError: () => {
    error.value = null
    fieldErrors.value = []
  }
})
</script>

<style scoped>
.form-error-boundary {
  width: 100%;
}

.form-error {
  margin: 1rem 0;
}

.form-error-container {
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #7f1d1d;
}

.error-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  text-align: center;
}

.form-error-container h4 {
  margin: 0 0 0.5rem 0;
  color: #dc2626;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
}

.form-error-container p {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  line-height: 1.4;
  text-align: center;
}

.field-errors {
  margin: 1rem 0;
  padding: 0.75rem;
  background: #fff5f5;
  border-radius: 4px;
  border: 1px solid #fed7d7;
}

.field-errors h5 {
  margin: 0 0 0.5rem 0;
  color: #c53030;
  font-size: 0.875rem;
  font-weight: 600;
}

.field-errors ul {
  margin: 0;
  padding-left: 1.2rem;
  list-style-type: none;
}

.field-errors li {
  margin: 0.25rem 0;
  font-size: 0.813rem;
  line-height: 1.4;
}

.field-errors strong {
  color: #c53030;
}

.form-error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1rem;
}

.retry-button {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.813rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #b91c1c;
}

.clear-button {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.813rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-button:hover {
  background: #4b5563;
}
</style>

/**
 * Composable for form validation
 * Provides reusable validation state and error handling
 */

import { ref } from 'vue'
import type { ValidationResult } from '@/utils/validation'

export function useFormValidation() {
  const errors = ref<string[]>([])
  const isValidating = ref(false)

  function setErrors(validationResult: ValidationResult) {
    errors.value = validationResult.errors
  }

  function clearErrors() {
    errors.value = []
  }

  function addError(error: string) {
    errors.value.push(error)
  }

  function hasErrors(): boolean {
    return errors.value.length > 0
  }

  return {
    errors,
    isValidating,
    setErrors,
    clearErrors,
    addError,
    hasErrors,
  }
}

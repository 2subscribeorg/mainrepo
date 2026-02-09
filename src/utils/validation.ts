/**
 * Input validation utilities
 * 
 * Note: Most validation has been migrated to Zod schemas in /schemas/
 * This file is kept for the ValidationResult interface which is still used in some places.
 */

// Validation result type
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}


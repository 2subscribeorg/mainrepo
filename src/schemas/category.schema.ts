import { z } from 'zod'
import { sanitizeCategoryName } from '@/utils/sanitize'

/**
 * Zod schema for Category validation
 * 
 * This schema provides runtime validation for Category objects,
 * complementing the existing TypeScript interface in domain/models.ts
 * 
 * Validation rules match existing validation.ts logic:
 * - Name: 2-50 characters (trimmed)
 * - Colour: Optional hex color (#RRGGBB format)
 */

// Schema for category input (when creating/updating)
export const CategoryInputSchema = z.object({
  name: z
    .string()
    .transform((val) => sanitizeCategoryName(val))
    .pipe(
      z.string()
        .min(2, 'Category name must be at least 2 characters')
        .max(50, 'Category name must not exceed 50 characters')
    ),
  
  colour: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use #RRGGBB)')
    .optional()
})

// Schema for full Category model (with id and metadata)
export const CategorySchema = CategoryInputSchema.extend({
  id: z.string().min(1, 'Category ID is required'),
  userId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

// Infer TypeScript types from schemas
export type CategoryInput = z.infer<typeof CategoryInputSchema>
export type CategoryValidated = z.infer<typeof CategorySchema>

/**
 * Helper function to validate category input
 * Returns validation result compatible with existing ValidationResult interface
 */
export function validateCategoryWithZod(data: unknown) {
  const result = CategoryInputSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error?.issues?.map((err) => err.message) || ['Validation failed'],
    data: null
  }
}

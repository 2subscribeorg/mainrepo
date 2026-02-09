import { z } from 'zod'
import { validatePassword, isCommonWeakPassword } from '@/utils/passwordValidation'
import { sanitizeMerchantName, sanitizeMerchantPattern } from '@/utils/sanitize'

/**
 * Zod schemas for form validation
 * 
 * These schemas replace manual validation logic in forms,
 * providing runtime type safety and better error messages.
 */

// ============================================================================
// AUTH FORM SCHEMAS
// ============================================================================

/**
 * Email validation schema
 * Matches existing isValidEmail logic
 */
export const EmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email format')

/**
 * Password validation schema with strong password policy
 * Uses modular password validation utilities
 */
export const PasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .superRefine((password, ctx) => {
    const errors = validatePassword(password)
    if (errors.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: errors[0] || 'Password does not meet requirements'
      })
    }
    
    if (isCommonWeakPassword(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'This password is too common. Please choose a stronger password.'
      })
    }
  })

/**
 * Login form schema
 */
export const LoginFormSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required')
})

/**
 * Signup form schema
 */
export const SignupFormSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

/**
 * Forgot password form schema
 */
export const ForgotPasswordFormSchema = z.object({
  email: EmailSchema
})

/**
 * Change email form schema
 */
export const ChangeEmailFormSchema = z.object({
  newEmail: EmailSchema,
  currentPassword: z.string().min(1, 'Current password is required')
})

/**
 * Change password form schema
 */
export const ChangePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
  confirmNewPassword: z.string().min(1, 'Please confirm your new password')
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword']
})

// ============================================================================
// SUBSCRIPTION FORM SCHEMAS
// ============================================================================

/**
 * Amount validation schema
 * Matches existing isValidAmount logic (0 to 999,999.99)
 */
export const AmountSchema = z
  .number()
  .min(0, 'Amount must be at least 0')
  .max(999999.99, 'Amount must not exceed 999,999.99')

/**
 * Merchant name validation schema
 * Matches existing isValidMerchantName logic (2-100 characters)
 * Automatically sanitizes input to prevent XSS
 */
export const MerchantNameSchema = z
  .string()
  .transform((val) => sanitizeMerchantName(val))
  .pipe(
    z.string()
      .min(2, 'Merchant name must be at least 2 characters')
      .max(100, 'Merchant name must not exceed 100 characters')
  )

/**
 * ISO date validation schema
 * Validates YYYY-MM-DD format
 */
export const ISODateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
  .refine((date) => {
    const parsed = new Date(date)
    return parsed instanceof Date && !isNaN(parsed.getTime())
  }, 'Invalid date')

/**
 * Recurrence validation schema
 */
export const RecurrenceSchema = z.enum(['monthly', 'yearly', 'weekly', 'biweekly', 'quarterly', 'custom'], {
  errorMap: () => ({ message: 'Invalid recurrence type' })
})

/**
 * Subscription form schema
 */
export const SubscriptionFormSchema = z.object({
  merchantName: MerchantNameSchema,
  amount: AmountSchema,
  recurrence: RecurrenceSchema,
  nextPaymentDate: ISODateSchema,
  categoryId: z.string().min(1, 'Category is required')
})

// ============================================================================
// MERCHANT RULE FORM SCHEMAS
// ============================================================================

/**
 * Merchant pattern validation schema
 * Matches existing isValidMerchantPattern logic (2-50 characters)
 * Automatically sanitizes input to prevent XSS
 */
export const MerchantPatternSchema = z
  .string()
  .transform((val) => sanitizeMerchantPattern(val))
  .pipe(
    z.string()
      .min(2, 'Merchant pattern must be at least 2 characters')
      .max(50, 'Merchant pattern must not exceed 50 characters')
  )

/**
 * Merchant rule form schema
 */
export const MerchantRuleFormSchema = z.object({
  merchantPattern: MerchantPatternSchema,
  categoryId: z.string().min(1, 'Category is required')
})

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validates login form data
 */
export function validateLoginForm(data: unknown) {
  return LoginFormSchema.safeParse(data)
}

/**
 * Validates signup form data
 */
export function validateSignupForm(data: unknown) {
  return SignupFormSchema.safeParse(data)
}

/**
 * Validates forgot password form data
 */
export function validateForgotPasswordForm(data: unknown) {
  return ForgotPasswordFormSchema.safeParse(data)
}

/**
 * Validates change email form data
 */
export function validateChangeEmailForm(data: unknown) {
  return ChangeEmailFormSchema.safeParse(data)
}

/**
 * Validates change password form data
 */
export function validateChangePasswordForm(data: unknown) {
  return ChangePasswordFormSchema.safeParse(data)
}

/**
 * Validates subscription form data
 */
export function validateSubscriptionForm(data: unknown) {
  return SubscriptionFormSchema.safeParse(data)
}

/**
 * Validates merchant rule form data
 */
export function validateMerchantRuleForm(data: unknown) {
  return MerchantRuleFormSchema.safeParse(data)
}

/**
 * Helper to extract field-specific errors from Zod validation result
 * Returns an object with field names as keys and error messages as values
 */
export function getFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  
  if (error?.issues) {
    error.issues.forEach((err) => {
      const field = err.path.join('.')
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = err.message
      }
    })
  }
  
  return fieldErrors
}

/**
 * Helper to extract all error messages as an array
 * Compatible with existing ValidationResult interface
 */
export function getErrorMessages(error: z.ZodError): string[] {
  return error?.issues?.map(err => err.message) || []
}

// Infer TypeScript types from schemas
export type LoginFormData = z.infer<typeof LoginFormSchema>
export type SignupFormData = z.infer<typeof SignupFormSchema>
export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordFormSchema>
export type ChangeEmailFormData = z.infer<typeof ChangeEmailFormSchema>
export type ChangePasswordFormData = z.infer<typeof ChangePasswordFormSchema>
export type SubscriptionFormData = z.infer<typeof SubscriptionFormSchema>
export type MerchantRuleFormData = z.infer<typeof MerchantRuleFormSchema>

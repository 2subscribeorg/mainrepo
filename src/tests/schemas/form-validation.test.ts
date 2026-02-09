import { describe, test, expect } from 'vitest'
import {
  validateLoginForm,
  validateSignupForm,
  validateForgotPasswordForm,
  validateChangeEmailForm,
  validateChangePasswordForm,
  validateSubscriptionForm,
  validateMerchantRuleForm,
  getFieldErrors,
  getErrorMessages,
  LoginFormSchema,
  SignupFormSchema,
  SubscriptionFormSchema
} from '@/schemas/form-validation.schema'

describe('Form Validation Schemas', () => {
  describe('Login Form Validation', () => {
    test('validates valid login data', () => {
      const validLogin = {
        email: 'user@example.com',
        password: 'password123'
      }

      const result = validateLoginForm(validLogin)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
        expect(result.data.password).toBe('password123')
      }
    })

    test('rejects invalid email', () => {
      const invalidLogin = {
        email: 'not-an-email',
        password: 'password123'
      }

      const result = validateLoginForm(invalidLogin)
      
      expect(result.success).toBe(false)
    })

    test('rejects empty password', () => {
      const invalidLogin = {
        email: 'user@example.com',
        password: ''
      }

      const result = validateLoginForm(invalidLogin)
      
      expect(result.success).toBe(false)
    })

    test('trims email whitespace', () => {
      const login = {
        email: '  user@example.com  ',
        password: 'password123'
      }

      const result = validateLoginForm(login)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })
  })

  describe('Signup Form Validation', () => {
    test('validates valid signup data', () => {
      const validSignup = {
        email: 'newuser@example.com',
        password: 'SecureP@ss123',
        confirmPassword: 'SecureP@ss123'
      }

      const result = validateSignupForm(validSignup)
      
      expect(result.success).toBe(true)
    })

    test('rejects password shorter than 8 characters', () => {
      const invalidSignup = {
        email: 'user@example.com',
        password: 'short',
        confirmPassword: 'short'
      }

      const result = validateSignupForm(invalidSignup)
      
      expect(result.success).toBe(false)
    })

    test('rejects mismatched passwords', () => {
      const invalidSignup = {
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'different123'
      }

      const result = validateSignupForm(invalidSignup)
      
      expect(result.success).toBe(false)
    })

    test('provides field-specific errors', () => {
      const invalidSignup = {
        email: 'invalid-email',
        password: 'short',
        confirmPassword: 'different'
      }

      const result = validateSignupForm(invalidSignup)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Forgot Password Form Validation', () => {
    test('validates valid email', () => {
      const validForm = {
        email: 'user@example.com'
      }

      const result = validateForgotPasswordForm(validForm)
      
      expect(result.success).toBe(true)
    })

    test('rejects invalid email', () => {
      const invalidForm = {
        email: 'not-an-email'
      }

      const result = validateForgotPasswordForm(invalidForm)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Change Email Form Validation', () => {
    test('validates valid change email data', () => {
      const validForm = {
        newEmail: 'newemail@example.com',
        currentPassword: 'currentpass123'
      }

      const result = validateChangeEmailForm(validForm)
      
      expect(result.success).toBe(true)
    })

    test('rejects invalid new email', () => {
      const invalidForm = {
        newEmail: 'invalid',
        currentPassword: 'currentpass123'
      }

      const result = validateChangeEmailForm(invalidForm)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Change Password Form Validation', () => {
    test('validates valid change password data', () => {
      const validForm = {
        currentPassword: 'OldP@ss123',
        newPassword: 'NewP@ss456',
        confirmNewPassword: 'NewP@ss456'
      }

      const result = validateChangePasswordForm(validForm)
      
      expect(result.success).toBe(true)
    })

    test('rejects short new password', () => {
      const invalidForm = {
        currentPassword: 'oldpass123',
        newPassword: 'short',
        confirmNewPassword: 'short'
      }

      const result = validateChangePasswordForm(invalidForm)
      
      expect(result.success).toBe(false)
    })

    test('rejects mismatched new passwords', () => {
      const invalidForm = {
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
        confirmNewPassword: 'different123'
      }

      const result = validateChangePasswordForm(invalidForm)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Subscription Form Validation', () => {
    test('validates valid subscription data', () => {
      const validSubscription = {
        merchantName: 'Netflix',
        amount: 15.99,
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment'
      }

      const result = validateSubscriptionForm(validSubscription)
      
      expect(result.success).toBe(true)
    })

    test('rejects merchant name too short', () => {
      const invalidSubscription = {
        merchantName: 'N',
        amount: 15.99,
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment'
      }

      const result = validateSubscriptionForm(invalidSubscription)
      
      expect(result.success).toBe(false)
    })

    test('rejects merchant name too long', () => {
      const invalidSubscription = {
        merchantName: 'A'.repeat(101),
        amount: 15.99,
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment'
      }

      const result = validateSubscriptionForm(invalidSubscription)
      
      expect(result.success).toBe(false)
    })

    test('rejects negative amount', () => {
      const invalidSubscription = {
        merchantName: 'Netflix',
        amount: -10,
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment'
      }

      const result = validateSubscriptionForm(invalidSubscription)
      
      expect(result.success).toBe(false)
    })

    test('rejects amount exceeding maximum', () => {
      const invalidSubscription = {
        merchantName: 'Netflix',
        amount: 1000000,
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment'
      }

      const result = validateSubscriptionForm(invalidSubscription)
      
      expect(result.success).toBe(false)
    })

    test('rejects invalid recurrence', () => {
      const invalidSubscription = {
        merchantName: 'Netflix',
        amount: 15.99,
        recurrence: 'daily',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment'
      }

      const result = validateSubscriptionForm(invalidSubscription)
      
      expect(result.success).toBe(false)
    })

    test('rejects invalid date format', () => {
      const invalidSubscription = {
        merchantName: 'Netflix',
        amount: 15.99,
        recurrence: 'monthly',
        nextPaymentDate: '15/02/2024',
        categoryId: 'cat_entertainment'
      }

      const result = validateSubscriptionForm(invalidSubscription)
      
      expect(result.success).toBe(false)
    })

    test('rejects invalid date value', () => {
      const invalidSubscription = {
        merchantName: 'Netflix',
        amount: 15.99,
        recurrence: 'monthly',
        nextPaymentDate: '2024-13-45',
        categoryId: 'cat_entertainment'
      }

      const result = validateSubscriptionForm(invalidSubscription)
      
      expect(result.success).toBe(false)
    })

    test('trims merchant name whitespace', () => {
      const subscription = {
        merchantName: '  Netflix  ',
        amount: 15.99,
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment'
      }

      const result = validateSubscriptionForm(subscription)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.merchantName).toBe('Netflix')
      }
    })
  })

  describe('Merchant Rule Form Validation', () => {
    test('validates valid merchant rule', () => {
      const validRule = {
        merchantPattern: 'NETFLIX',
        categoryId: 'cat_entertainment'
      }

      const result = validateMerchantRuleForm(validRule)
      
      expect(result.success).toBe(true)
    })

    test('rejects pattern too short', () => {
      const invalidRule = {
        merchantPattern: 'N',
        categoryId: 'cat_entertainment'
      }

      const result = validateMerchantRuleForm(invalidRule)
      
      expect(result.success).toBe(false)
    })

    test('rejects pattern too long', () => {
      const invalidRule = {
        merchantPattern: 'A'.repeat(51),
        categoryId: 'cat_entertainment'
      }

      const result = validateMerchantRuleForm(invalidRule)
      
      expect(result.success).toBe(false)
    })

    test('rejects empty category', () => {
      const invalidRule = {
        merchantPattern: 'NETFLIX',
        categoryId: ''
      }

      const result = validateMerchantRuleForm(invalidRule)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Error Helper Functions', () => {
    test('getFieldErrors returns object', () => {
      const invalidData = {
        email: 'invalid',
        password: 'short'
      }

      const result = LoginFormSchema.safeParse(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        const fieldErrors = getFieldErrors(result.error)
        expect(typeof fieldErrors).toBe('object')
      }
    })

    test('getErrorMessages returns array', () => {
      const invalidData = {
        email: 'invalid',
        password: ''
      }

      const result = LoginFormSchema.safeParse(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = getErrorMessages(result.error)
        expect(Array.isArray(messages)).toBe(true)
      }
    })

    test('helper functions handle errors safely', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'different'
      }

      const result = SignupFormSchema.safeParse(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        const fieldErrors = getFieldErrors(result.error)
        const messages = getErrorMessages(result.error)
        expect(typeof fieldErrors).toBe('object')
        expect(Array.isArray(messages)).toBe(true)
      }
    })
  })

  describe('Edge Cases', () => {
    test('handles null input', () => {
      const result = validateLoginForm(null)
      expect(result.success).toBe(false)
    })

    test('handles undefined input', () => {
      const result = validateLoginForm(undefined)
      expect(result.success).toBe(false)
    })

    test('handles empty object', () => {
      const result = validateLoginForm({})
      expect(result.success).toBe(false)
    })

    test('handles non-object input', () => {
      const result = validateLoginForm('not an object')
      expect(result.success).toBe(false)
    })
  })
})

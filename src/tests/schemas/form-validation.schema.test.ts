import { describe, it, expect } from 'vitest'
import {
  EmailSchema,
  PasswordSchema,
  LoginFormSchema,
  SignupFormSchema,
  MerchantNameSchema,
  MerchantPatternSchema,
  AmountSchema,
  ISODateSchema,
  RecurrenceSchema,
  SubscriptionFormSchema,
  MerchantRuleFormSchema,
  validateLoginForm,
  validateSignupForm,
  validateSubscriptionForm,
  validateMerchantRuleForm,
  getFieldErrors,
  getErrorMessages
} from '@/schemas/form-validation.schema'

describe('EmailSchema', () => {
  it('should accept valid email addresses', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.co.uk',
      'user+tag@example.com',
      'user123@test-domain.com'
    ]

    validEmails.forEach(email => {
      const result = EmailSchema.safeParse(email)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid email addresses', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user @example.com',
      'user@.com',
      ''
    ]

    invalidEmails.forEach(email => {
      const result = EmailSchema.safeParse(email)
      expect(result.success).toBe(false)
    })
  })

  it('should trim whitespace', () => {
    const result = EmailSchema.safeParse('  user@example.com  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('user@example.com')
    }
  })
})

describe('PasswordSchema', () => {
  it('should accept strong passwords', () => {
    const strongPasswords = [
      'MyP@ssw0rd123',
      'Secure!Pass123',
      'C0mpl3x&Strong'
    ]

    strongPasswords.forEach(password => {
      const result = PasswordSchema.safeParse(password)
      expect(result.success).toBe(true)
    })
  })

  it('should reject weak passwords', () => {
    const weakPasswords = [
      'short',
      'nouppercaseordigits',
      'NOLOWERCASEORDIGITS',
      '12345678'
    ]

    weakPasswords.forEach(password => {
      const result = PasswordSchema.safeParse(password)
      expect(result.success).toBe(false)
    })
  })

  it('should reject common weak passwords', () => {
    const commonPasswords = [
      'password',
      'Password123',
      '12345678'
    ]

    commonPasswords.forEach(password => {
      const result = PasswordSchema.safeParse(password)
      expect(result.success).toBe(false)
    })
  })

  it('should reject empty password', () => {
    const result = PasswordSchema.safeParse('')
    expect(result.success).toBe(false)
  })
})

describe('MerchantNameSchema', () => {
  describe('Sanitization', () => {
    it('should sanitize HTML tags', () => {
      const result = MerchantNameSchema.safeParse('<script>Netflix</script>')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toContain('<script>')
        expect(result.data).not.toContain('</script>')
      }
    })

    it('should remove control characters', () => {
      const result = MerchantNameSchema.safeParse('Netflix\u0000\u001F')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toMatch(/[\u0000-\u001F]/)
      }
    })

    it('should trim whitespace', () => {
      const result = MerchantNameSchema.safeParse('  Netflix  ')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Netflix')
      }
    })

    it('should truncate to 100 characters', () => {
      const longName = 'A'.repeat(150)
      const result = MerchantNameSchema.safeParse(longName)
      
      if (result.success) {
        expect(result.data.length).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('Validation', () => {
    it('should accept valid merchant names', () => {
      const validNames = [
        'Netflix',
        'Amazon Prime Video',
        'Spotify Premium',
        'Ab' // Minimum 2 chars
      ]

      validNames.forEach(name => {
        const result = MerchantNameSchema.safeParse(name)
        expect(result.success).toBe(true)
      })
    })

    it('should reject names too short', () => {
      const result = MerchantNameSchema.safeParse('A')
      expect(result.success).toBe(false)
    })

    it('should reject names too long', () => {
      const result = MerchantNameSchema.safeParse('A'.repeat(101))
      expect(result.success).toBe(false)
    })
  })
})

describe('MerchantPatternSchema', () => {
  describe('Sanitization', () => {
    it('should convert to lowercase', () => {
      const result = MerchantPatternSchema.safeParse('NETFLIX')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('netflix')
      }
    })

    it('should sanitize HTML tags', () => {
      const result = MerchantPatternSchema.safeParse('<b>spotify</b>')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toContain('<b>')
      }
    })

    it('should remove control characters', () => {
      const result = MerchantPatternSchema.safeParse('netflix\u0000')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toMatch(/[\u0000-\u001F]/)
      }
    })
  })

  describe('Validation', () => {
    it('should accept valid patterns', () => {
      const validPatterns = [
        'netflix',
        'amazon prime',
        'spotify',
        'ab' // Minimum 2 chars
      ]

      validPatterns.forEach(pattern => {
        const result = MerchantPatternSchema.safeParse(pattern)
        expect(result.success).toBe(true)
      })
    })

    it('should reject patterns too short', () => {
      const result = MerchantPatternSchema.safeParse('a')
      expect(result.success).toBe(false)
    })

    it('should reject patterns too long', () => {
      const result = MerchantPatternSchema.safeParse('a'.repeat(51))
      expect(result.success).toBe(false)
    })
  })
})

describe('AmountSchema', () => {
  it('should accept valid amounts', () => {
    const validAmounts = [0, 0.01, 10.99, 999999.99]

    validAmounts.forEach(amount => {
      const result = AmountSchema.safeParse(amount)
      expect(result.success).toBe(true)
    })
  })

  it('should reject negative amounts', () => {
    const result = AmountSchema.safeParse(-1)
    expect(result.success).toBe(false)
  })

  it('should reject amounts exceeding maximum', () => {
    const result = AmountSchema.safeParse(1000000)
    expect(result.success).toBe(false)
  })

  it('should reject non-numeric values', () => {
    const result = AmountSchema.safeParse('not a number' as any)
    expect(result.success).toBe(false)
  })
})

describe('ISODateSchema', () => {
  it('should accept valid ISO dates', () => {
    const validDates = [
      '2024-01-01',
      '2024-12-31',
      '2023-06-15'
    ]

    validDates.forEach(date => {
      const result = ISODateSchema.safeParse(date)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid date formats', () => {
    const invalidDates = [
      '01-01-2024', // Wrong format
      '2024/01/01', // Wrong separator
      '2024-1-1', // Missing leading zeros
      '2024-13-01', // Invalid month
      '2024-01-32', // Invalid day
      'not-a-date'
    ]

    invalidDates.forEach(date => {
      const result = ISODateSchema.safeParse(date)
      expect(result.success).toBe(false)
    })
  })
})

describe('RecurrenceSchema', () => {
  it('should accept valid recurrence types', () => {
    const validTypes = ['monthly', 'yearly', 'weekly', 'biweekly', 'quarterly', 'custom']

    validTypes.forEach(type => {
      const result = RecurrenceSchema.safeParse(type)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid recurrence types', () => {
    const invalidTypes = ['daily', 'hourly', 'invalid', '']

    invalidTypes.forEach(type => {
      const result = RecurrenceSchema.safeParse(type)
      expect(result.success).toBe(false)
    })
  })
})

describe('LoginFormSchema', () => {
  it('should accept valid login data', () => {
    const result = validateLoginForm({
      email: 'user@example.com',
      password: 'anypassword'
    })

    expect(result.success).toBe(true)
  })

  it('should reject missing email', () => {
    const result = validateLoginForm({
      email: '',
      password: 'anypassword'
    })

    expect(result.success).toBe(false)
  })

  it('should reject missing password', () => {
    const result = validateLoginForm({
      email: 'user@example.com',
      password: ''
    })

    expect(result.success).toBe(false)
  })
})

describe('SignupFormSchema', () => {
  it('should accept valid signup data', () => {
    const result = validateSignupForm({
      email: 'user@example.com',
      password: 'MyP@ssw0rd123',
      confirmPassword: 'MyP@ssw0rd123'
    })

    expect(result.success).toBe(true)
  })

  it('should reject mismatched passwords', () => {
    const result = validateSignupForm({
      email: 'user@example.com',
      password: 'MyP@ssw0rd123',
      confirmPassword: 'DifferentP@ss123'
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.issues.map(i => i.message)
      expect(errors.some(e => e.includes('do not match'))).toBe(true)
    }
  })

  it('should reject weak password', () => {
    const result = validateSignupForm({
      email: 'user@example.com',
      password: 'weak',
      confirmPassword: 'weak'
    })

    expect(result.success).toBe(false)
  })
})

describe('SubscriptionFormSchema', () => {
  it('should accept valid subscription data with sanitization', () => {
    const result = validateSubscriptionForm({
      merchantName: '  <script>Netflix</script>  ',
      amount: 15.99,
      recurrence: 'monthly',
      nextPaymentDate: '2024-12-01',
      categoryId: 'cat_123'
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.merchantName).not.toContain('<script>')
      expect(result.data.merchantName).toBe('Netflix')
    }
  })

  it('should reject invalid subscription data', () => {
    const result = validateSubscriptionForm({
      merchantName: 'A', // Too short
      amount: 15.99,
      recurrence: 'monthly',
      nextPaymentDate: '2024-12-01',
      categoryId: 'cat_123'
    })

    expect(result.success).toBe(false)
  })
})

describe('MerchantRuleFormSchema', () => {
  it('should accept valid merchant rule with sanitization', () => {
    const result = validateMerchantRuleForm({
      merchantPattern: '  NETFLIX  ',
      categoryId: 'cat_123'
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.merchantPattern).toBe('netflix')
    }
  })

  it('should reject invalid merchant rule', () => {
    const result = validateMerchantRuleForm({
      merchantPattern: 'a', // Too short
      categoryId: 'cat_123'
    })

    expect(result.success).toBe(false)
  })
})

describe('Helper Functions', () => {
  describe('getFieldErrors', () => {
    it('should extract field-specific errors', () => {
      const result = SignupFormSchema.safeParse({
        email: 'invalid',
        password: 'weak',
        confirmPassword: 'different'
      })

      if (!result.success) {
        const fieldErrors = getFieldErrors(result.error)
        expect(fieldErrors).toHaveProperty('email')
        expect(fieldErrors).toHaveProperty('password')
      }
    })
  })

  describe('getErrorMessages', () => {
    it('should extract all error messages as array', () => {
      const result = SignupFormSchema.safeParse({
        email: '',
        password: '',
        confirmPassword: ''
      })

      if (!result.success) {
        const messages = getErrorMessages(result.error)
        expect(Array.isArray(messages)).toBe(true)
        expect(messages.length).toBeGreaterThan(0)
      }
    })
  })
})

describe('Security Tests', () => {
  it('should prevent XSS in merchant names', () => {
    const xssAttempts = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)'
    ]

    xssAttempts.forEach(xss => {
      const result = MerchantNameSchema.safeParse(xss)
      if (result.success) {
        expect(result.data).not.toContain('<script>')
        expect(result.data).not.toContain('<img')
        expect(result.data).not.toContain('javascript:')
      }
    })
  })

  it('should prevent XSS in merchant patterns', () => {
    const result = MerchantPatternSchema.safeParse('<svg onload=alert(1)>')
    
    if (result.success) {
      expect(result.data).not.toContain('<svg')
      expect(result.data).not.toContain('onload')
    }
  })
})

describe('Edge Cases', () => {
  it('should handle undefined input', () => {
    const result = LoginFormSchema.safeParse(undefined)
    expect(result.success).toBe(false)
  })

  it('should handle null input', () => {
    const result = LoginFormSchema.safeParse(null)
    expect(result.success).toBe(false)
  })

  it('should handle extra fields', () => {
    const result = validateLoginForm({
      email: 'user@example.com',
      password: 'password',
      extraField: 'should be ignored'
    } as any)

    expect(result.success).toBe(true)
  })

  it('should handle unicode in merchant names', () => {
    const result = MerchantNameSchema.safeParse('Café ☕ 日本')
    expect(result.success).toBe(true)
  })
})

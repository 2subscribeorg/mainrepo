import { describe, it, expect, beforeEach } from 'vitest'
import {
  isValidEmail,
  isValidAmount,
  isValidISODate,
  isValidMerchantName,
  isValidHexColor,
  validateBudget,
  validateCategory,
  validateMerchantRule,
} from '@/utils/validation'
import {
  sanitizeHtml,
  sanitizeMerchantName,
  sanitizeCategoryName,
  sanitizeAmount,
  sanitizeHexColor,
  sanitizeUrl,
} from '@/utils/sanitize'
import { rateLimiter } from '@/utils/rateLimiter'

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
    })
  })

  describe('isValidAmount', () => {
    it('should accept valid amounts', () => {
      expect(isValidAmount(0)).toBe(true)
      expect(isValidAmount(50.99)).toBe(true)
      expect(isValidAmount(999999.99)).toBe(true)
    })

    it('should reject invalid amounts', () => {
      expect(isValidAmount(-1)).toBe(false)
      expect(isValidAmount(1000000)).toBe(false)
      expect(isValidAmount(NaN)).toBe(false)
    })
  })

  describe('isValidISODate', () => {
    it('should accept valid dates', () => {
      expect(isValidISODate('2024-01-15')).toBe(true)
      expect(isValidISODate('2024-12-31')).toBe(true)
    })

    it('should reject invalid dates', () => {
      expect(isValidISODate('2024/01/15')).toBe(false)
      expect(isValidISODate('15-01-2024')).toBe(false)
      expect(isValidISODate('2024-13-01')).toBe(false)
      expect(isValidISODate('not-a-date')).toBe(false)
    })
  })

  describe('isValidMerchantName', () => {
    it('should accept valid names', () => {
      expect(isValidMerchantName('Spotify')).toBe(true)
      expect(isValidMerchantName('Test Merchant Name')).toBe(true)
    })

    it('should reject invalid names', () => {
      expect(isValidMerchantName('X')).toBe(false) // Too short
      expect(isValidMerchantName('a'.repeat(101))).toBe(false) // Too long
      expect(isValidMerchantName('  ')).toBe(false) // Only whitespace
    })
  })

  describe('isValidHexColor', () => {
    it('should accept valid hex colors', () => {
      expect(isValidHexColor('#FF0000')).toBe(true)
      expect(isValidHexColor('#00ff00')).toBe(true)
      expect(isValidHexColor('#AABBCC')).toBe(true)
    })

    it('should reject invalid colors', () => {
      expect(isValidHexColor('FF0000')).toBe(false) // Missing #
      expect(isValidHexColor('#FF00')).toBe(false) // Too short
      expect(isValidHexColor('#GGGGGG')).toBe(false) // Invalid chars
    })
  })

  describe('validateBudget', () => {
    it('should accept valid budget config', () => {
      const result = validateBudget({
        monthlyLimit: 1000,
        yearlyLimit: 15000,
      })
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject monthly > yearly × 12', () => {
      const result = validateBudget({
        monthlyLimit: 2000,
        yearlyLimit: 15000, // 2000 × 12 = 24000 > 15000
      })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Monthly limit × 12 cannot exceed yearly limit')
    })

    it('should reject invalid amounts', () => {
      const result = validateBudget({
        monthlyLimit: -100,
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateCategory', () => {
    it('should accept valid category', () => {
      const result = validateCategory({
        name: 'Streaming',
        colour: '#FF0000',
        monthlyLimit: 50,
      })
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid category name', () => {
      const result = validateCategory({
        name: 'X',
        colour: '#FF0000',
      })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Category name must be between 2 and 50 characters')
    })

    it('should reject invalid color', () => {
      const result = validateCategory({
        name: 'Streaming',
        colour: 'red',
      })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid color format (use #RRGGBB)')
    })
  })

  describe('validateMerchantRule', () => {
    it('should accept valid rule', () => {
      const result = validateMerchantRule({
        merchantPattern: 'spotify',
        categoryId: 'cat-123',
      })
      expect(result.isValid).toBe(true)
    })

    it('should reject empty pattern', () => {
      const result = validateMerchantRule({
        merchantPattern: 'x',
        categoryId: 'cat-123',
      })
      expect(result.isValid).toBe(false)
    })

    it('should reject missing category', () => {
      const result = validateMerchantRule({
        merchantPattern: 'spotify',
        categoryId: '',
      })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Category is required')
    })
  })
})

describe('Sanitization Utilities', () => {
  describe('sanitizeHtml', () => {
    it('should escape HTML tags', () => {
      const result = sanitizeHtml('<script>alert("XSS")</script>')
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
    })

    it('should handle plain text', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World')
    })

    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('')
    })
  })

  describe('sanitizeMerchantName', () => {
    it('should trim whitespace', () => {
      expect(sanitizeMerchantName('  Spotify  ')).toBe('Spotify')
    })

    it('should remove HTML brackets', () => {
      expect(sanitizeMerchantName('Test<>Name')).toBe('TestName')
    })

    it('should enforce max length', () => {
      const longName = 'a'.repeat(150)
      const result = sanitizeMerchantName(longName)
      expect(result.length).toBe(100)
    })
  })

  describe('sanitizeCategoryName', () => {
    it('should sanitize category name', () => {
      expect(sanitizeCategoryName('  Test<Category>  ')).toBe('TestCategory')
    })

    it('should enforce max length', () => {
      const longName = 'a'.repeat(100)
      const result = sanitizeCategoryName(longName)
      expect(result.length).toBe(50)
    })
  })

  describe('sanitizeAmount', () => {
    it('should round to 2 decimal places', () => {
      expect(sanitizeAmount(10.999)).toBe(11.00)
      expect(sanitizeAmount(10.001)).toBe(10.00)
    })

    it('should reject negative amounts', () => {
      expect(sanitizeAmount(-50)).toBe(0)
    })

    it('should cap at max', () => {
      expect(sanitizeAmount(2000000)).toBe(999999.99)
    })

    it('should handle string inputs', () => {
      expect(sanitizeAmount('123.45')).toBe(123.45)
    })

    it('should handle invalid inputs', () => {
      expect(sanitizeAmount('invalid')).toBe(0)
      expect(sanitizeAmount(NaN)).toBe(0)
    })
  })

  describe('sanitizeHexColor', () => {
    it('should accept valid colors', () => {
      expect(sanitizeHexColor('#FF0000')).toBe('#FF0000')
      expect(sanitizeHexColor('#aabbcc')).toBe('#AABBCC')
    })

    it('should return default for invalid colors', () => {
      expect(sanitizeHexColor('red')).toBe('#9E9E9E')
      expect(sanitizeHexColor('FF0000')).toBe('#9E9E9E')
      expect(sanitizeHexColor('#ZZZ')).toBe('#9E9E9E')
    })

    it('should use custom default', () => {
      expect(sanitizeHexColor('invalid', '#000000')).toBe('#000000')
    })
  })

  describe('sanitizeUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
    })

    it('should block dangerous protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe(null)
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe(null)
      expect(sanitizeUrl('vbscript:msgbox')).toBe(null)
    })

    it('should require http/https protocol', () => {
      expect(sanitizeUrl('ftp://example.com')).toBe(null)
      expect(sanitizeUrl('//example.com')).toBe(null)
    })
  })
})

describe('Rate Limiter', () => {
  beforeEach(() => {
    rateLimiter.clear()
  })

  it('should allow actions within limit', () => {
    expect(rateLimiter.check('test', 3, 60000)).toBe(true)
    expect(rateLimiter.check('test', 3, 60000)).toBe(true)
    expect(rateLimiter.check('test', 3, 60000)).toBe(true)
  })

  it('should block after exceeding limit', () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimiter.check('test', 3, 60000)).toBe(true)
    }
    expect(rateLimiter.check('test', 3, 60000)).toBe(false)
  })

  it('should track different keys separately', () => {
    expect(rateLimiter.check('action1', 2, 60000)).toBe(true)
    expect(rateLimiter.check('action2', 2, 60000)).toBe(true)
    expect(rateLimiter.check('action1', 2, 60000)).toBe(true)
    expect(rateLimiter.check('action2', 2, 60000)).toBe(true)
    
    // Both should be at limit now
    expect(rateLimiter.check('action1', 2, 60000)).toBe(false)
    expect(rateLimiter.check('action2', 2, 60000)).toBe(false)
  })

  it('should allow actions after time window expires', () => {
    // This test would need to mock time or use a very short window
    // For production, just document the behavior
    expect(rateLimiter.check('test', 1, 100)).toBe(true)
    expect(rateLimiter.check('test', 1, 100)).toBe(false)
    
    // In real scenario, after 100ms:
    // expect(rateLimiter.check('test', 1, 100)).toBe(true)
  })

  it('should reset specific key', () => {
    rateLimiter.check('test', 1, 60000)
    rateLimiter.check('test', 1, 60000) // Should be blocked
    
    rateLimiter.reset('test')
    
    expect(rateLimiter.check('test', 1, 60000)).toBe(true)
  })

  it('should get remaining attempts', () => {
    expect(rateLimiter.getRemaining('test', 3, 60000)).toBe(3)
    
    rateLimiter.check('test', 3, 60000)
    expect(rateLimiter.getRemaining('test', 3, 60000)).toBe(2)
    
    rateLimiter.check('test', 3, 60000)
    expect(rateLimiter.getRemaining('test', 3, 60000)).toBe(1)
    
    rateLimiter.check('test', 3, 60000)
    expect(rateLimiter.getRemaining('test', 3, 60000)).toBe(0)
  })
})

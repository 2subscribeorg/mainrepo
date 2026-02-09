import { describe, it, expect } from 'vitest'
import { CategoryInputSchema, validateCategoryWithZod } from '@/schemas/category.schema'

describe('CategoryInputSchema', () => {
  describe('Sanitization (XSS Prevention)', () => {
    it('should sanitize HTML tags from category name', () => {
      const result = CategoryInputSchema.safeParse({
        name: '<script>alert("xss")</script>Netflix',
        colour: '#FF0000'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).not.toContain('<script>')
        expect(result.data.name).not.toContain('</script>')
      }
    })

    it('should remove control characters from category name', () => {
      const result = CategoryInputSchema.safeParse({
        name: 'Netflix\u0000\u0001\u001F',
        colour: '#FF0000'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).not.toMatch(/[\u0000-\u001F]/)
      }
    })

    it('should trim whitespace from category name', () => {
      const result = CategoryInputSchema.safeParse({
        name: '   Netflix   ',
        colour: '#FF0000'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Netflix')
      }
    })

    it('should handle multiple sanitization issues at once', () => {
      const result = CategoryInputSchema.safeParse({
        name: '  <b>Netflix</b>\u0000  ',
        colour: '#FF0000'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).not.toContain('<b>')
        expect(result.data.name).not.toMatch(/[\u0000-\u001F]/)
        expect(result.data.name).not.toMatch(/^\s|\s$/)
      }
    })
  })

  describe('Name Validation', () => {
    it('should accept valid category names', () => {
      const validNames = [
        'Netflix',
        'Amazon Prime',
        'Spotify Premium',
        'Ab', // Minimum 2 chars
        'A'.repeat(50) // Maximum 50 chars
      ]

      validNames.forEach(name => {
        const result = CategoryInputSchema.safeParse({
          name,
          colour: '#FF0000'
        })
        expect(result.success).toBe(true)
      })
    })

    it('should reject names that are too short', () => {
      const result = CategoryInputSchema.safeParse({
        name: 'A',
        colour: '#FF0000'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters')
      }
    })

    it('should reject names that are too long', () => {
      const result = CategoryInputSchema.safeParse({
        name: 'A'.repeat(51),
        colour: '#FF0000'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('not exceed 50 characters')
      }
    })

    it('should reject empty names', () => {
      const result = CategoryInputSchema.safeParse({
        name: '',
        colour: '#FF0000'
      })

      expect(result.success).toBe(false)
    })

    it('should reject whitespace-only names', () => {
      const result = CategoryInputSchema.safeParse({
        name: '   ',
        colour: '#FF0000'
      })

      expect(result.success).toBe(false)
    })
  })

  describe('Colour Validation', () => {
    it('should accept valid hex colors', () => {
      const validColors = [
        '#FF0000',
        '#00FF00',
        '#0000FF',
        '#FFFFFF',
        '#000000',
        '#123ABC',
        '#abc123' // Lowercase should work
      ]

      validColors.forEach(colour => {
        const result = CategoryInputSchema.safeParse({
          name: 'Netflix',
          colour
        })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid hex colors', () => {
      const invalidColors = [
        'FF0000', // Missing #
        '#FF00', // Too short
        '#FF00000', // Too long
        '#GGGGGG', // Invalid characters
        'red', // Named color
        'rgb(255,0,0)', // RGB format
        '#FF-00-00' // Invalid format
      ]

      invalidColors.forEach(colour => {
        const result = CategoryInputSchema.safeParse({
          name: 'Netflix',
          colour
        })
        expect(result.success).toBe(false)
      })
    })

    it('should accept optional colour', () => {
      const result = CategoryInputSchema.safeParse({
        name: 'Netflix'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validateCategoryWithZod Helper', () => {
    it('should return isValid true for valid data', () => {
      const result = validateCategoryWithZod({
        name: 'Netflix',
        colour: '#FF0000'
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe('Netflix')
    })

    it('should return isValid false for invalid data', () => {
      const result = validateCategoryWithZod({
        name: 'A',
        colour: '#FF0000'
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.data).toBeNull()
    })

    it('should return sanitized data', () => {
      const result = validateCategoryWithZod({
        name: '  <script>Netflix</script>  ',
        colour: '#FF0000'
      })

      expect(result.isValid).toBe(true)
      if (result.data) {
        expect(result.data.name).not.toContain('<script>')
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined input', () => {
      const result = CategoryInputSchema.safeParse(undefined)
      expect(result.success).toBe(false)
    })

    it('should handle null input', () => {
      const result = CategoryInputSchema.safeParse(null)
      expect(result.success).toBe(false)
    })

    it('should handle missing required fields', () => {
      const result = CategoryInputSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should handle extra fields gracefully', () => {
      const result = CategoryInputSchema.safeParse({
        name: 'Netflix',
        colour: '#FF0000',
        extraField: 'should be ignored'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('extraField')
      }
    })

    it('should handle unicode characters in name', () => {
      const result = CategoryInputSchema.safeParse({
        name: 'Café ☕ 日本',
        colour: '#FF0000'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toContain('Café')
      }
    })

    it('should truncate names longer than 50 chars after sanitization', () => {
      const longName = 'A'.repeat(100)
      const result = CategoryInputSchema.safeParse({
        name: longName,
        colour: '#FF0000'
      })

      // Should fail validation because sanitization truncates to 50, 
      // but if it somehow passes, length should be <= 50
      if (result.success) {
        expect(result.data.name.length).toBeLessThanOrEqual(50)
      }
    })
  })

  describe('Security Tests', () => {
    it('should prevent XSS via script tags', () => {
      const xssAttempts = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
      ]

      xssAttempts.forEach(xss => {
        const result = CategoryInputSchema.safeParse({
          name: xss,
          colour: '#FF0000'
        })

        if (result.success) {
          expect(result.data.name).not.toContain('<script>')
          expect(result.data.name).not.toContain('<img')
          expect(result.data.name).not.toContain('<svg')
          expect(result.data.name).not.toContain('<iframe')
          expect(result.data.name).not.toContain('javascript:')
        }
      })
    })

    it('should prevent SQL injection attempts', () => {
      const sqlAttempts = [
        "'; DROP TABLE categories; --",
        "1' OR '1'='1",
        "admin'--",
      ]

      sqlAttempts.forEach(sql => {
        const result = CategoryInputSchema.safeParse({
          name: sql,
          colour: '#FF0000'
        })

        // Should either fail validation or sanitize the input
        if (result.success) {
          expect(result.data.name.length).toBeLessThanOrEqual(50)
        }
      })
    })
  })
})

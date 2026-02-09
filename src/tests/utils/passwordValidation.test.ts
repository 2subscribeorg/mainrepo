import { describe, test, expect } from 'vitest'
import {
  PASSWORD_REQUIREMENTS,
  validatePassword,
  isPasswordValid,
  calculatePasswordStrength,
  getPasswordStrengthColor,
  isCommonWeakPassword
} from '@/utils/passwordValidation'

describe('Password Validation', () => {
  describe('validatePassword', () => {
    test('returns empty array for valid strong password', () => {
      const errors = validatePassword('MyP@ssw0rd!')
      expect(errors).toEqual([])
    })

    test('returns error for password too short', () => {
      const errors = validatePassword('Ab1!')
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.includes('8 characters'))).toBe(true)
    })

    test('returns error for password without uppercase', () => {
      const errors = validatePassword('myp@ssw0rd!')
      expect(errors.some(e => e.includes('uppercase'))).toBe(true)
    })

    test('returns error for password without lowercase', () => {
      const errors = validatePassword('MYP@SSW0RD!')
      expect(errors.some(e => e.includes('lowercase'))).toBe(true)
    })

    test('returns error for password without number', () => {
      const errors = validatePassword('MyP@ssword!')
      expect(errors.some(e => e.includes('number'))).toBe(true)
    })

    test('returns error for password without special character', () => {
      const errors = validatePassword('MyPassw0rd')
      expect(errors.some(e => e.includes('special'))).toBe(true)
    })

    test('returns multiple errors for very weak password', () => {
      const errors = validatePassword('abc')
      expect(errors.length).toBeGreaterThan(1)
    })
  })

  describe('isPasswordValid', () => {
    test('returns true for valid strong password', () => {
      expect(isPasswordValid('MyP@ssw0rd!')).toBe(true)
      expect(isPasswordValid('Str0ng!Pass')).toBe(true)
      expect(isPasswordValid('C0mpl3x#Pwd')).toBe(true)
    })

    test('returns false for weak passwords', () => {
      expect(isPasswordValid('password')).toBe(false)
      expect(isPasswordValid('12345678')).toBe(false)
      expect(isPasswordValid('abcdefgh')).toBe(false)
    })

    test('returns false for passwords missing requirements', () => {
      expect(isPasswordValid('NoSpecialChar1')).toBe(false)
      expect(isPasswordValid('nouppercas3!')).toBe(false)
      expect(isPasswordValid('NOLOWERCASE1!')).toBe(false)
      expect(isPasswordValid('NoNumber!')).toBe(false)
    })
  })

  describe('calculatePasswordStrength', () => {
    test('calculates Very Weak for empty password', () => {
      const strength = calculatePasswordStrength('')
      expect(strength.score).toBe(0)
      expect(strength.label).toBe('Very Weak')
      expect(strength.percentage).toBe(0)
    })

    test('calculates strength based on requirements met', () => {
      const weak = calculatePasswordStrength('aaaaaaaa')
      expect(weak.score).toBeGreaterThan(0)
      expect(weak.score).toBeLessThan(5)

      const stronger = calculatePasswordStrength('Aaaaaaaa')
      expect(stronger.score).toBeGreaterThan(weak.score)
    })

    test('calculates Very Strong for password with all 5 requirements', () => {
      const strength = calculatePasswordStrength('MyP@ssw0rd!')
      expect(strength.score).toBe(5)
      expect(strength.label).toBe('Very Strong')
      expect(strength.percentage).toBe(100)
    })

    test('tracks passed and failed requirements', () => {
      const strength = calculatePasswordStrength('Abcdefgh')
      expect(strength.passedRequirements).toContain('minLength')
      expect(strength.passedRequirements).toContain('uppercase')
      expect(strength.passedRequirements).toContain('lowercase')
      expect(strength.failedRequirements).toContain('number')
      expect(strength.failedRequirements).toContain('special')
    })

    test('percentage increases with more requirements met', () => {
      const weak = calculatePasswordStrength('aaaaaaaa')
      const strong = calculatePasswordStrength('MyP@ssw0rd!')
      expect(strong.percentage).toBeGreaterThan(weak.percentage)
    })

    test('assigns appropriate labels', () => {
      const veryStrong = calculatePasswordStrength('MyP@ssw0rd!')
      expect(veryStrong.label).toBe('Very Strong')
      
      const empty = calculatePasswordStrength('')
      expect(empty.label).toBe('Very Weak')
    })
  })

  describe('getPasswordStrengthColor', () => {
    test('returns error color for very weak passwords', () => {
      const strength = calculatePasswordStrength('')
      const color = getPasswordStrengthColor(strength)
      expect(color).toBe('bg-error')
    })

    test('returns appropriate colors based on score', () => {
      const veryWeak = { score: 0, label: 'Very Weak' as const, percentage: 0, passedRequirements: [], failedRequirements: [] }
      expect(getPasswordStrengthColor(veryWeak)).toBe('bg-error')

      const weak = { score: 1, label: 'Weak' as const, percentage: 20, passedRequirements: [], failedRequirements: [] }
      expect(getPasswordStrengthColor(weak)).toBe('bg-error')

      const fair = { score: 2, label: 'Fair' as const, percentage: 40, passedRequirements: [], failedRequirements: [] }
      expect(getPasswordStrengthColor(fair)).toBe('bg-warning')
    })

    test('returns success color for very strong passwords', () => {
      const strength = calculatePasswordStrength('MyP@ssw0rd!')
      const color = getPasswordStrengthColor(strength)
      expect(color).toBe('bg-success')
    })
  })

  describe('isCommonWeakPassword', () => {
    test('detects common weak passwords', () => {
      expect(isCommonWeakPassword('password')).toBe(true)
      expect(isCommonWeakPassword('password123')).toBe(true)
      expect(isCommonWeakPassword('12345678')).toBe(true)
      expect(isCommonWeakPassword('qwerty')).toBe(true)
    })

    test('detects common weak passwords case-insensitively', () => {
      expect(isCommonWeakPassword('PASSWORD')).toBe(true)
      expect(isCommonWeakPassword('Password123')).toBe(true)
      expect(isCommonWeakPassword('QWERTY')).toBe(true)
    })

    test('detects passwords containing common weak patterns', () => {
      expect(isCommonWeakPassword('MyPassword123')).toBe(true)
      expect(isCommonWeakPassword('Welcome2024')).toBe(true)
    })

    test('returns false for strong unique passwords', () => {
      expect(isCommonWeakPassword('MyP@ssw0rd!')).toBe(false)
      expect(isCommonWeakPassword('Str0ng!Pass')).toBe(false)
      expect(isCommonWeakPassword('C0mpl3x#Pwd')).toBe(false)
    })
  })

  describe('PASSWORD_REQUIREMENTS', () => {
    test('has correct number of requirements', () => {
      expect(PASSWORD_REQUIREMENTS).toHaveLength(5)
    })

    test('each requirement has required properties', () => {
      PASSWORD_REQUIREMENTS.forEach(req => {
        expect(req).toHaveProperty('id')
        expect(req).toHaveProperty('label')
        expect(req).toHaveProperty('test')
        expect(req).toHaveProperty('errorMessage')
        expect(typeof req.test).toBe('function')
      })
    })

    test('minLength requirement works correctly', () => {
      const req = PASSWORD_REQUIREMENTS.find(r => r.id === 'minLength')!
      expect(req.test('1234567')).toBe(false)
      expect(req.test('12345678')).toBe(true)
      expect(req.test('123456789')).toBe(true)
    })

    test('uppercase requirement works correctly', () => {
      const req = PASSWORD_REQUIREMENTS.find(r => r.id === 'uppercase')!
      expect(req.test('lowercase')).toBe(false)
      expect(req.test('Uppercase')).toBe(true)
      expect(req.test('UPPERCASE')).toBe(true)
    })

    test('lowercase requirement works correctly', () => {
      const req = PASSWORD_REQUIREMENTS.find(r => r.id === 'lowercase')!
      expect(req.test('UPPERCASE')).toBe(false)
      expect(req.test('Lowercase')).toBe(true)
      expect(req.test('lowercase')).toBe(true)
    })

    test('number requirement works correctly', () => {
      const req = PASSWORD_REQUIREMENTS.find(r => r.id === 'number')!
      expect(req.test('NoNumbers')).toBe(false)
      expect(req.test('Has1Number')).toBe(true)
      expect(req.test('123456')).toBe(true)
    })

    test('special character requirement works correctly', () => {
      const req = PASSWORD_REQUIREMENTS.find(r => r.id === 'special')!
      expect(req.test('NoSpecial')).toBe(false)
      expect(req.test('Has!Special')).toBe(true)
      expect(req.test('Has@Special')).toBe(true)
      expect(req.test('Has#Special')).toBe(true)
      expect(req.test('Has$Special')).toBe(true)
      expect(req.test('Has%Special')).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    test('handles empty string', () => {
      const errors = validatePassword('')
      expect(errors.length).toBeGreaterThan(0)
      expect(isPasswordValid('')).toBe(false)
    })

    test('handles very long passwords', () => {
      const longPassword = 'MyP@ssw0rd!' + 'a'.repeat(100)
      expect(isPasswordValid(longPassword)).toBe(true)
    })

    test('handles passwords with only special characters', () => {
      const errors = validatePassword('!@#$%^&*()')
      expect(errors.length).toBeGreaterThan(0)
    })

    test('handles passwords with unicode characters', () => {
      const password = 'MyP@ss😀0rd!'
      const strength = calculatePasswordStrength(password)
      expect(strength.score).toBeGreaterThan(0)
    })
  })
})

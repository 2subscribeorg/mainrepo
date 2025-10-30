import { describe, it, expect } from 'vitest'
import { formatMoney, formatDate, formatRelativeDate } from '@/utils/formatters'
import type { Money } from '@/domain/models'

describe('formatters', () => {
  describe('formatMoney', () => {
    it('should format GBP correctly', () => {
      const money: Money = { amount: 99.99, currency: 'GBP' }
      expect(formatMoney(money)).toBe('£99.99')
    })

    it('should format EUR correctly', () => {
      const money: Money = { amount: 50.00, currency: 'EUR' }
      expect(formatMoney(money)).toBe('€50.00')
    })

    it('should format USD correctly', () => {
      const money: Money = { amount: 123.45, currency: 'USD' }
      expect(formatMoney(money)).toBe('$123.45')
    })

    it('should format without symbol when requested', () => {
      const money: Money = { amount: 99.99, currency: 'GBP' }
      expect(formatMoney(money, false)).toBe('99.99')
    })

    it('should always show 2 decimal places', () => {
      const money: Money = { amount: 10, currency: 'GBP' }
      expect(formatMoney(money)).toBe('£10.00')
    })
  })

  describe('formatDate', () => {
    it('should format date in DD MMM YYYY format', () => {
      const result = formatDate('2024-03-15')
      expect(result).toMatch(/15 Mar 2024/)
    })
  })

  describe('formatRelativeDate', () => {
    it('should return "Today" for today', () => {
      const today = new Date().toISOString().split('T')[0]
      expect(formatRelativeDate(today)).toBe('Today')
    })
  })
})

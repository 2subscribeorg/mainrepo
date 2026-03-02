import { describe, test, expect } from 'vitest'
import {
  validateUserId,
  validatePublicToken,
  validateConnectionId,
  validateLinkTokenResponse,
  validateExchangeTokenResponse,
  validateSyncTransactionsResponse,
  PlaidValidationError
} from './validation'

describe('Plaid Input Validation', () => {
  describe('validateUserId', () => {
    test('accepts valid user ID', () => {
      expect(validateUserId('user123')).toBe('user123')
    })

    test('trims whitespace', () => {
      expect(validateUserId('  user123  ')).toBe('user123')
    })

    test('rejects empty string', () => {
      expect(() => validateUserId('')).toThrow(PlaidValidationError)
    })

    test('rejects whitespace-only string', () => {
      expect(() => validateUserId('   ')).toThrow(PlaidValidationError)
    })

    test('rejects too long user ID', () => {
      const longId = 'a'.repeat(129)
      expect(() => validateUserId(longId)).toThrow(PlaidValidationError)
    })
  })

  describe('validatePublicToken', () => {
    test('accepts valid public token', () => {
      const token = 'public-sandbox-abc123-def456'
      expect(validatePublicToken(token)).toBe(token)
    })

    test('trims whitespace', () => {
      const token = 'public-sandbox-abc123-def456'
      expect(validatePublicToken(`  ${token}  `)).toBe(token)
    })

    test('rejects token too short', () => {
      expect(() => validatePublicToken('short')).toThrow(PlaidValidationError)
    })

    test('rejects empty token', () => {
      expect(() => validatePublicToken('')).toThrow(PlaidValidationError)
    })

    test('rejects token too long', () => {
      const longToken = 'a'.repeat(501)
      expect(() => validatePublicToken(longToken)).toThrow(PlaidValidationError)
    })
  })

  describe('validateConnectionId', () => {
    test('accepts valid connection ID', () => {
      expect(validateConnectionId('conn123')).toBe('conn123')
    })

    test('trims whitespace', () => {
      expect(validateConnectionId('  conn123  ')).toBe('conn123')
    })

    test('rejects empty string', () => {
      expect(() => validateConnectionId('')).toThrow(PlaidValidationError)
    })

    test('rejects whitespace-only string', () => {
      expect(() => validateConnectionId('   ')).toThrow(PlaidValidationError)
    })
  })

  describe('validateLinkTokenResponse', () => {
    test('accepts valid response', () => {
      const response = { linkToken: 'link-sandbox-abc123' }
      expect(validateLinkTokenResponse(response)).toEqual(response)
    })

    test('rejects missing linkToken', () => {
      expect(() => validateLinkTokenResponse({})).toThrow(PlaidValidationError)
    })

    test('rejects empty linkToken', () => {
      expect(() => validateLinkTokenResponse({ linkToken: '' })).toThrow(PlaidValidationError)
    })

    test('rejects invalid type', () => {
      expect(() => validateLinkTokenResponse({ linkToken: 123 })).toThrow(PlaidValidationError)
    })
  })

  describe('validateExchangeTokenResponse', () => {
    test('accepts valid response', () => {
      const response = { itemId: 'item-abc123' }
      expect(validateExchangeTokenResponse(response)).toEqual(response)
    })

    test('rejects missing itemId', () => {
      expect(() => validateExchangeTokenResponse({})).toThrow(PlaidValidationError)
    })

    test('rejects empty itemId', () => {
      expect(() => validateExchangeTokenResponse({ itemId: '' })).toThrow(PlaidValidationError)
    })
  })

  describe('validateSyncTransactionsResponse', () => {
    test('accepts valid response', () => {
      const response = { transactionCount: 42 }
      expect(validateSyncTransactionsResponse(response)).toEqual(response)
    })

    test('accepts zero transactions', () => {
      const response = { transactionCount: 0 }
      expect(validateSyncTransactionsResponse(response)).toEqual(response)
    })

    test('rejects negative count', () => {
      expect(() => validateSyncTransactionsResponse({ transactionCount: -1 })).toThrow(PlaidValidationError)
    })

    test('rejects non-integer count', () => {
      expect(() => validateSyncTransactionsResponse({ transactionCount: 3.14 })).toThrow(PlaidValidationError)
    })

    test('rejects missing transactionCount', () => {
      expect(() => validateSyncTransactionsResponse({})).toThrow(PlaidValidationError)
    })
  })

  describe('PlaidValidationError', () => {
    test('has correct name', () => {
      const error = new PlaidValidationError('Test error')
      expect(error.name).toBe('PlaidValidationError')
    })

    test('stores field name', () => {
      const error = new PlaidValidationError('Test error', 'userId')
      expect(error.field).toBe('userId')
    })

    test('is instance of Error', () => {
      const error = new PlaidValidationError('Test error')
      expect(error instanceof Error).toBe(true)
    })
  })
})

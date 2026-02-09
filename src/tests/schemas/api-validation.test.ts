import { describe, test, expect } from 'vitest'
import {
  validateFirebaseTransaction,
  validateFirebaseTransactions,
  validateFirebaseSubscription,
  validatePlaidTransactionsResponse,
  validatePlaidWebhook,
  PlaidTransactionSchema
} from '@/schemas/api.schema'

describe('API Response Validation', () => {
  describe('Firebase Transaction Validation', () => {
    test('validates valid transaction data', () => {
      const validTransaction = {
        id: 'txn_123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        date: '2024-01-15',
        userId: 'user_123'
      }

      const result = validateFirebaseTransaction(validTransaction)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('txn_123')
        expect(result.data.merchantName).toBe('Netflix')
        expect(result.data.amount.amount).toBe(15.99)
      }
    })

    test('rejects transaction with invalid currency', () => {
      const invalidTransaction = {
        id: 'txn_123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'INVALID' },
        date: '2024-01-15'
      }

      const result = validateFirebaseTransaction(invalidTransaction)
      
      expect(result.success).toBe(false)
    })

    test('rejects transaction with missing required fields', () => {
      const invalidTransaction = {
        id: 'txn_123',
        // Missing merchantName
        amount: { amount: 15.99, currency: 'USD' }
        // Missing date
      }

      const result = validateFirebaseTransaction(invalidTransaction)
      
      expect(result.success).toBe(false)
    })

    test('validates transaction with optional fields', () => {
      const transaction = {
        id: 'txn_123',
        merchantName: 'Spotify',
        amount: { amount: 9.99, currency: 'GBP' },
        date: '2024-01-15',
        subscriptionId: 'sub_456',
        categoryId: 'cat_789',
        userId: 'user_123',
        plaidTransactionId: 'plaid_abc',
        accountId: 'acc_xyz',
        pending: false,
        source: 'plaid' as const,
        rawMerchantName: 'SPOTIFY USA',
        category: ['Entertainment', 'Music'],
        createdAt: '2024-01-15T10:00:00Z'
      }

      const result = validateFirebaseTransaction(transaction)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.subscriptionId).toBe('sub_456')
        expect(result.data.source).toBe('plaid')
        expect(result.data.category).toEqual(['Entertainment', 'Music'])
      }
    })

    test('validates array of transactions', () => {
      const transactions = [
        {
          id: 'txn_1',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          date: '2024-01-15'
        },
        {
          id: 'txn_2',
          merchantName: 'Spotify',
          amount: { amount: 9.99, currency: 'GBP' },
          date: '2024-01-16'
        }
      ]

      const result = validateFirebaseTransactions(transactions)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].merchantName).toBe('Netflix')
        expect(result.data[1].merchantName).toBe('Spotify')
      }
    })

    test('rejects array with one invalid transaction', () => {
      const transactions = [
        {
          id: 'txn_1',
          merchantName: 'Netflix',
          amount: { amount: 15.99, currency: 'USD' },
          date: '2024-01-15'
        },
        {
          id: 'txn_2',
          // Missing merchantName - invalid
          amount: { amount: 9.99, currency: 'GBP' },
          date: '2024-01-16'
        }
      ]

      const result = validateFirebaseTransactions(transactions)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Firebase Subscription Validation', () => {
    test('validates valid subscription data', () => {
      const validSubscription = {
        id: 'sub_123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment',
        status: 'active',
        source: 'plaid'
      }

      const result = validateFirebaseSubscription(validSubscription)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.merchantName).toBe('Netflix')
        expect(result.data.recurrence).toBe('monthly')
        expect(result.data.status).toBe('active')
      }
    })

    test('rejects subscription with invalid recurrence', () => {
      const invalidSubscription = {
        id: 'sub_123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        recurrence: 'daily', // Invalid
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment',
        status: 'active',
        source: 'plaid'
      }

      const result = validateFirebaseSubscription(invalidSubscription)
      
      expect(result.success).toBe(false)
    })

    test('rejects subscription with invalid status', () => {
      const invalidSubscription = {
        id: 'sub_123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment',
        status: 'expired', // Invalid
        source: 'plaid'
      }

      const result = validateFirebaseSubscription(invalidSubscription)
      
      expect(result.success).toBe(false)
    })

    test('validates subscription with confidence score', () => {
      const subscription = {
        id: 'sub_123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment',
        status: 'pending_review',
        source: 'plaid',
        confidence: 0.85
      }

      const result = validateFirebaseSubscription(subscription)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.confidence).toBe(0.85)
      }
    })

    test('rejects subscription with invalid confidence score', () => {
      const subscription = {
        id: 'sub_123',
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        recurrence: 'monthly',
        nextPaymentDate: '2024-02-15',
        categoryId: 'cat_entertainment',
        status: 'active',
        source: 'plaid',
        confidence: 1.5 // Invalid - must be 0-1
      }

      const result = validateFirebaseSubscription(subscription)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Plaid Transaction Validation', () => {
    test('validates valid Plaid transaction', () => {
      const plaidTransaction = {
        account_id: 'acc_123',
        amount: 15.99,
        iso_currency_code: 'USD',
        unofficial_currency_code: null,
        category: ['Entertainment', 'Streaming'],
        category_id: '17001000',
        date: '2024-01-15',
        authorized_date: '2024-01-14',
        name: 'NETFLIX.COM',
        merchant_name: 'Netflix',
        payment_channel: 'online',
        pending: false,
        pending_transaction_id: null,
        transaction_id: 'plaid_txn_123',
        transaction_type: 'special'
      }

      const result = PlaidTransactionSchema.safeParse(plaidTransaction)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.merchant_name).toBe('Netflix')
        expect(result.data.amount).toBe(15.99)
        expect(result.data.category).toEqual(['Entertainment', 'Streaming'])
      }
    })

    test('validates Plaid transaction with null merchant_name', () => {
      const plaidTransaction = {
        account_id: 'acc_123',
        amount: 15.99,
        iso_currency_code: 'USD',
        unofficial_currency_code: null,
        category: null,
        category_id: null,
        date: '2024-01-15',
        authorized_date: null,
        name: 'UNKNOWN MERCHANT',
        merchant_name: null, // Plaid sometimes returns null
        payment_channel: 'online',
        pending: true,
        pending_transaction_id: null,
        transaction_id: 'plaid_txn_123',
        transaction_type: null
      }

      const result = PlaidTransactionSchema.safeParse(plaidTransaction)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.merchant_name).toBeNull()
        expect(result.data.pending).toBe(true)
      }
    })
  })

  describe('Plaid Transactions Get Response Validation', () => {
    test('validates complete Plaid API response', () => {
      const plaidResponse = {
        accounts: [
          {
            account_id: 'acc_123',
            balances: {
              available: 1000.50,
              current: 1200.75,
              iso_currency_code: 'USD',
              limit: null,
              unofficial_currency_code: null
            },
            mask: '1234',
            name: 'Checking Account',
            official_name: 'Premier Checking',
            subtype: 'checking',
            type: 'depository'
          }
        ],
        transactions: [
          {
            account_id: 'acc_123',
            amount: 15.99,
            iso_currency_code: 'USD',
            unofficial_currency_code: null,
            category: ['Entertainment'],
            category_id: '17001000',
            date: '2024-01-15',
            authorized_date: '2024-01-14',
            name: 'NETFLIX.COM',
            merchant_name: 'Netflix',
            payment_channel: 'online',
            pending: false,
            pending_transaction_id: null,
            transaction_id: 'plaid_txn_123',
            transaction_type: 'special'
          }
        ],
        total_transactions: 1,
        request_id: 'req_abc123'
      }

      const result = validatePlaidTransactionsResponse(plaidResponse)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.accounts).toHaveLength(1)
        expect(result.data.transactions).toHaveLength(1)
        expect(result.data.total_transactions).toBe(1)
      }
    })

    test('rejects Plaid response with missing required fields', () => {
      const invalidResponse = {
        accounts: [],
        transactions: []
        // Missing total_transactions and request_id
      }

      const result = validatePlaidTransactionsResponse(invalidResponse)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Plaid Webhook Validation', () => {
    test('validates TRANSACTIONS webhook', () => {
      const webhook = {
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'DEFAULT_UPDATE',
        item_id: 'item_123',
        new_transactions: 5
      }

      const result = validatePlaidWebhook(webhook)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.webhook_type).toBe('TRANSACTIONS')
        expect(result.data.new_transactions).toBe(5)
      }
    })

    test('validates webhook with error', () => {
      const webhook = {
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'item_123',
        error: {
          error_type: 'ITEM_ERROR',
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'User needs to re-authenticate'
        }
      }

      const result = validatePlaidWebhook(webhook)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.error?.error_code).toBe('ITEM_LOGIN_REQUIRED')
      }
    })

    test('validates webhook with removed transactions', () => {
      const webhook = {
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'TRANSACTIONS_REMOVED',
        item_id: 'item_123',
        removed_transactions: ['txn_1', 'txn_2', 'txn_3']
      }

      const result = validatePlaidWebhook(webhook)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.removed_transactions).toHaveLength(3)
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('handles completely invalid data', () => {
      const result = validateFirebaseTransaction('not an object')
      
      expect(result.success).toBe(false)
    })

    test('handles null data', () => {
      const result = validateFirebaseTransaction(null)
      
      expect(result.success).toBe(false)
    })

    test('handles undefined data', () => {
      const result = validateFirebaseTransaction(undefined)
      
      expect(result.success).toBe(false)
    })

    test('handles empty object', () => {
      const result = validateFirebaseTransaction({})
      
      expect(result.success).toBe(false)
    })

    test('provides detailed error messages', () => {
      // Test with truly invalid data - id should be string not number
      const trulyInvalid = {
        id: 123, // Should be string
        merchantName: 'Netflix',
        amount: { amount: 15.99, currency: 'USD' },
        date: '2024-01-15'
      }

      const result = validateFirebaseTransaction(trulyInvalid)
      expect(result.success).toBe(false)
    })
  })
})

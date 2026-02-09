import { z } from 'zod'

/**
 * Zod schemas for API response validation
 * 
 * These schemas validate data coming from external APIs (Firebase, Plaid)
 * to ensure runtime type safety and catch unexpected data shapes early.
 */

// ============================================================================
// SHARED/COMMON SCHEMAS
// ============================================================================

export const CurrencySchema = z.enum(['GBP', 'EUR', 'USD'])

export const MoneySchema = z.object({
  amount: z.number(),
  currency: CurrencySchema
})

export const RecurrenceSchema = z.enum(['monthly', 'yearly', 'weekly', 'biweekly', 'quarterly', 'custom'])

// ============================================================================
// FIREBASE RESPONSE SCHEMAS
// ============================================================================

/**
 * Transaction schema for Firebase responses
 * Validates transaction data from Firestore
 */
export const TransactionSchema = z.object({
  id: z.string(),
  subscriptionId: z.string().optional(),
  merchantName: z.string(),
  amount: MoneySchema,
  date: z.string(), // ISO date string
  categoryId: z.string().optional(),
  // Phase 2 fields
  userId: z.string().optional(),
  plaidTransactionId: z.string().optional(),
  accountId: z.string().optional(),
  pending: z.boolean().optional(),
  source: z.enum(['plaid', 'manual']).optional(),
  rawMerchantName: z.string().optional(),
  category: z.array(z.string()).optional(),
  createdAt: z.string().optional()
})

/**
 * Subscription schema for Firebase responses
 */
export const SubscriptionSchema = z.object({
  id: z.string(),
  merchantName: z.string(),
  amount: MoneySchema,
  recurrence: RecurrenceSchema,
  nextPaymentDate: z.string(),
  lastPaymentDate: z.string().optional(),
  categoryId: z.string(),
  status: z.enum(['active', 'paused', 'cancelled', 'pending_review']),
  source: z.enum(['mock', 'plaid', 'manual']),
  // Phase 2 fields
  userId: z.string().optional(),
  plaidTransactionIds: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  detectedAt: z.string().optional(),
  confirmedAt: z.string().optional(),
  cancelledAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

/**
 * BankAccount schema for Firebase responses
 */
export const BankAccountSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  institutionName: z.string(),
  accountName: z.string(),
  accountType: z.enum(['checking', 'savings', 'credit', 'investment']),
  mask: z.string(),
  currency: CurrencySchema,
  balance: MoneySchema.optional(),
  lastSynced: z.string().optional(),
  status: z.enum(['connected', 'disconnected', 'error']),
  userId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

/**
 * BankConnection schema for Firebase responses
 */
export const BankConnectionSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  institutionName: z.string(),
  accounts: z.array(BankAccountSchema),
  status: z.enum(['connected', 'reauth_required', 'error']),
  lastSynced: z.string().optional(),
  error: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

// ============================================================================
// PLAID API RESPONSE SCHEMAS
// ============================================================================

/**
 * Plaid Account schema
 * Validates account data from Plaid API
 */
export const PlaidAccountSchema = z.object({
  account_id: z.string(),
  balances: z.object({
    available: z.number().nullable(),
    current: z.number().nullable(),
    iso_currency_code: z.string().nullable(),
    limit: z.number().nullable(),
    unofficial_currency_code: z.string().nullable()
  }),
  mask: z.string().nullable(),
  name: z.string(),
  official_name: z.string().nullable(),
  subtype: z.string().nullable(),
  type: z.string()
})

/**
 * Plaid Transaction schema
 * Validates transaction data from Plaid API
 */
export const PlaidTransactionSchema = z.object({
  account_id: z.string(),
  amount: z.number(),
  iso_currency_code: z.string().nullable(),
  unofficial_currency_code: z.string().nullable(),
  category: z.array(z.string()).nullable(),
  category_id: z.string().nullable(),
  date: z.string(),
  authorized_date: z.string().nullable(),
  name: z.string(),
  merchant_name: z.string().nullable(),
  payment_channel: z.string(),
  pending: z.boolean(),
  pending_transaction_id: z.string().nullable(),
  transaction_id: z.string(),
  transaction_type: z.string().nullable()
})

/**
 * Plaid Transactions Get Response
 */
export const PlaidTransactionsGetResponseSchema = z.object({
  accounts: z.array(PlaidAccountSchema),
  transactions: z.array(PlaidTransactionSchema),
  total_transactions: z.number(),
  request_id: z.string()
})

/**
 * Plaid Item schema
 */
export const PlaidItemSchema = z.object({
  item_id: z.string(),
  institution_id: z.string().nullable(),
  webhook: z.string().nullable(),
  error: z.object({
    error_type: z.string(),
    error_code: z.string(),
    error_message: z.string(),
    display_message: z.string().nullable()
  }).nullable(),
  available_products: z.array(z.string()),
  billed_products: z.array(z.string()),
  consent_expiration_time: z.string().nullable(),
  update_type: z.string()
})

/**
 * Plaid Institution schema
 */
export const PlaidInstitutionSchema = z.object({
  institution_id: z.string(),
  name: z.string(),
  products: z.array(z.string()),
  country_codes: z.array(z.string()),
  url: z.string().nullable(),
  primary_color: z.string().nullable(),
  logo: z.string().nullable()
})

/**
 * Plaid Webhook Event schema
 */
export const PlaidWebhookSchema = z.object({
  webhook_type: z.string(),
  webhook_code: z.string(),
  item_id: z.string(),
  error: z.object({
    error_type: z.string(),
    error_code: z.string(),
    error_message: z.string()
  }).optional(),
  new_transactions: z.number().optional(),
  removed_transactions: z.array(z.string()).optional()
})

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validates Firebase transaction response
 */
export function validateFirebaseTransaction(data: unknown) {
  return TransactionSchema.safeParse(data)
}

/**
 * Validates array of Firebase transactions
 */
export function validateFirebaseTransactions(data: unknown) {
  return z.array(TransactionSchema).safeParse(data)
}

/**
 * Validates Firebase subscription response
 */
export function validateFirebaseSubscription(data: unknown) {
  return SubscriptionSchema.safeParse(data)
}

/**
 * Validates array of Firebase subscriptions
 */
export function validateFirebaseSubscriptions(data: unknown) {
  return z.array(SubscriptionSchema).safeParse(data)
}

/**
 * Validates Firebase bank account response
 */
export function validateFirebaseBankAccount(data: unknown) {
  return BankAccountSchema.safeParse(data)
}

/**
 * Validates Firebase bank connection response
 */
export function validateFirebaseBankConnection(data: unknown) {
  return BankConnectionSchema.safeParse(data)
}

/**
 * Validates Plaid transactions response
 */
export function validatePlaidTransactionsResponse(data: unknown) {
  return PlaidTransactionsGetResponseSchema.safeParse(data)
}

/**
 * Validates Plaid webhook event
 */
export function validatePlaidWebhook(data: unknown) {
  return PlaidWebhookSchema.safeParse(data)
}

// Infer TypeScript types from schemas
export type TransactionValidated = z.infer<typeof TransactionSchema>
export type SubscriptionValidated = z.infer<typeof SubscriptionSchema>
export type BankAccountValidated = z.infer<typeof BankAccountSchema>
export type BankConnectionValidated = z.infer<typeof BankConnectionSchema>
export type PlaidTransactionValidated = z.infer<typeof PlaidTransactionSchema>
export type PlaidAccountValidated = z.infer<typeof PlaidAccountSchema>
export type PlaidWebhookValidated = z.infer<typeof PlaidWebhookSchema>

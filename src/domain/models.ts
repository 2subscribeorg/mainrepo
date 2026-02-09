export type ID = string
export type Currency = 'GBP' | 'EUR' | 'USD'
export type Recurrence = 'monthly' | 'yearly' | 'weekly' | 'biweekly' | 'quarterly' | 'custom'

export interface UserProfile {
  id: ID
  email: string
  displayName?: string
  photoURL?: string
  createdAt: string
  lastLogin?: string
  subscriptionCount?: number
  bankConnectionCount?: number
  transactionCount?: number
  isActive: boolean
  preferences?: {
    theme?: 'light' | 'dark'
    notifications?: boolean
    currency?: Currency
  }
}

export interface Money {
  amount: number
  currency: Currency
}

export interface Category {
  id: ID
  name: string
  colour?: string
  // Phase 2 fields
  userId?: ID  // Owner of this category (null = system default)
  createdAt?: string  // ISO timestamp
  updatedAt?: string
}

export interface Subscription {
  id: ID
  merchantName: string
  amount: Money
  recurrence: Recurrence
  nextPaymentDate: string
  lastPaymentDate?: string
  categoryId: ID
  status: 'active' | 'paused' | 'cancelled' | 'pending_review'  // pending_review = detected but not confirmed
  source: 'mock' | 'plaid' | 'manual'
  // Phase 2 fields
  userId?: ID  // Owner of this subscription
  plaidTransactionIds?: ID[]  // Links to transactions that detected this
  confidence?: number  // 0-1, how confident we are it's recurring
  detectedAt?: string  // When Plaid detected this
  confirmedAt?: string  // When user confirmed it
  cancelledAt?: string
  notes?: string  // User notes
  createdAt?: string
  updatedAt?: string
}

export interface Transaction {
  id: ID
  subscriptionId?: ID  // Linked subscription (if recurring)
  merchantName: string
  amount: Money
  date: string
  categoryId?: ID  // User override
  // Phase 2 fields
  userId?: ID  // Owner
  plaidTransactionId?: string  // Plaid's ID
  accountId?: string  // Which bank account
  pending?: boolean  // Transaction not yet posted
  source?: 'plaid' | 'manual'
  rawMerchantName?: string  // Original name from Plaid
  category?: string[]  // Plaid's categories
  createdAt?: string
}


export interface MerchantCategoryRule {
  id: ID
  merchantPattern: string
  categoryId: ID
  priority: number
  // Phase 2 fields
  userId?: ID  // null = global rule, string = user-specific
  createdAt?: string
  isActive?: boolean
}

export interface NotificationData {
  id: ID
  type: 'subscription_due' | 'subscription_cancelled'
  title: string
  message: string
  timestamp: string
  read: boolean
  data?: Record<string, unknown>
}

// ============================================================================
// PHASE 2 MODELS - Firebase + Plaid Integration
// ============================================================================

/**
 * User profile stored in Firestore
 * Extends Firebase Auth user data
 */
export interface UserProfile {
  id: ID  // Same as Firebase Auth UID
  email: string
  name: string
  createdAt: string
  lastLogin: string
  settings: UserSettings
  plaidAccounts: PlaidAccountLink[]
  subscription?: UserSubscription
}

export interface UserSettings {
  currency: Currency
  timezone: string
  language: string
  notifications: {
    email: boolean
    push: boolean
    newSubscriptions: boolean
    weeklyDigest: boolean
  }
}

export interface UserSubscription {
  plan: 'free' | 'premium'
  validUntil?: string
  features: string[]
}

/**
 * Plaid account connection
 * Links user to their bank accounts
 */
export interface PlaidAccountLink {
  itemId: string  // Plaid Item ID
  accessToken: string  // Encrypted, stored in backend only
  institutionId: string
  institutionName: string  // "Chase", "Barclays", etc.
  institutionLogo?: string
  accounts: PlaidAccount[]
  linkedAt: string
  lastSync: string
  syncStatus: 'active' | 'error' | 'requires_reauth'
  isActive: boolean
  error?: string
}

export interface PlaidAccount {
  accountId: string  // Plaid Account ID
  accountName: string
  mask: string  // Last 4 digits
  type: 'depository' | 'credit' | 'loan' | 'investment'
  subtype: string  // "checking", "savings", "credit card"
  currentBalance?: Money
  availableBalance?: Money
}

/**
 * Detected subscription waiting for user confirmation
 */
export interface DetectedSubscription extends Subscription {
  status: 'pending_review'
  confidence: number  // 0-1
  detectedFrom: {
    transactionIds: ID[]
    pattern: {
      frequency: Recurrence
      averageAmount: Money
      firstSeen: string
      lastSeen: string
      occurrences: number
    }
  }
  suggestions: {
    merchantName: string
    categoryId: ID
    amount: Money
  }
}

/**
 * Plaid webhook event
 * Received from Plaid when data changes
 */
export interface PlaidWebhookEvent {
  webhookType: 'TRANSACTIONS' | 'ITEM' | 'AUTH' | 'HOLDINGS'
  webhookCode: string
  itemId: string
  error?: {
    errorType: string
    errorCode: string
    errorMessage: string
  }
  newTransactions?: number
  removedTransactions?: string[]
}

/**
 * Bank Account Models (Phase 2 - Bank Integration)
 */
export interface BankAccount {
  id: ID
  institutionId: string
  institutionName: string
  accountName: string
  accountType: 'checking' | 'savings' | 'credit' | 'investment'
  mask: string  // Last 4 digits, e.g., "1234"
  currency: Currency
  balance?: Money
  lastSynced?: string  // ISO timestamp
  status: 'connected' | 'disconnected' | 'error'
  // Phase 2 fields
  userId?: ID
  createdAt?: string
  updatedAt?: string
}

export interface BankConnection {
  id: ID  // Item ID in Plaid terminology
  institutionId: string
  institutionName: string
  accounts: BankAccount[]
  status: 'connected' | 'reauth_required' | 'error'
  lastSynced?: string
  error?: string
  // Phase 2 fields
  userId?: ID
  createdAt?: string
  updatedAt?: string
}

export interface BankTransaction {
  id: ID
  accountId: ID
  amount: Money
  merchantName: string
  date: string  // ISO date
  category?: string[]
  pending: boolean
  transactionType: 'purchase' | 'payment' | 'transfer' | 'fee' | 'refund'
  // Matching
  matchedSubscriptionId?: ID
  matchConfidence?: number  // 0-1 score
  // Phase 2 fields
  userId?: ID
  createdAt?: string
}

/**
 * Firestore Security Rules Structure
 * This is a documentation interface only
 */
/**
 * Subscription detection feedback for ML training
 * Tracks user confirmation/rejection of subscription suggestions
 */
export interface SubscriptionFeedback {
  id: ID
  transactionId: ID
  userId: ID
  merchantName: string
  amount: Money
  date: string  // Transaction date
  userAction: 'confirmed' | 'rejected'
  timestamp: string  // When feedback was given
  // Optional context for ML
  detectionConfidence?: number  // Original ML confidence score
  detectionMethod?: 'rule_based' | 'ml_model' | 'pattern_matching'
  suggestedCategoryId?: ID
  actualCategoryId?: ID  // Category user assigned (if different)
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FirestoreRules {
  // All collections require userId match
  // subscriptions: userId == request.auth.uid
  // transactions: userId == request.auth.uid
  // categories: userId == request.auth.uid || userId == null (system)
  // subscription_feedback: userId == request.auth.uid
}

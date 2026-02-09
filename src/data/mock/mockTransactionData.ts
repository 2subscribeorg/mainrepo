import type { BankTransaction } from '@/domain/models'

/**
 * Comprehensive mock transaction data simulating real-world scenarios
 * Use this to test pattern detection before Plaid integration
 */

// Helper to generate dates going backwards
function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

export const mockTransactions: BankTransaction[] = [
  // SCENARIO 1: Perfect monthly subscription (Netflix)
  {
    id: 'tx-netflix-1',
    accountId: 'acc-checking',
    merchantName: 'Netflix',
    amount: { amount: 12.99, currency: 'GBP' },
    date: daysAgo(150),
    category: ['Service', 'Subscription', 'Entertainment'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-netflix-2',
    accountId: 'acc-checking',
    merchantName: 'Netflix',
    amount: { amount: 12.99, currency: 'GBP' },
    date: daysAgo(120),
    category: ['Service', 'Subscription', 'Entertainment'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-netflix-3',
    accountId: 'acc-checking',
    merchantName: 'NETFLIX.COM',  // Variation in merchant name
    amount: { amount: 12.99, currency: 'GBP' },
    date: daysAgo(90),
    category: ['Service', 'Subscription', 'Entertainment'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-netflix-4',
    accountId: 'acc-checking',
    merchantName: 'Netflix',
    amount: { amount: 12.99, currency: 'GBP' },
    date: daysAgo(60),
    category: ['Service', 'Subscription', 'Entertainment'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-netflix-5',
    accountId: 'acc-checking',
    merchantName: 'Netflix',
    amount: { amount: 12.99, currency: 'GBP' },
    date: daysAgo(30),
    category: ['Service', 'Subscription', 'Entertainment'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 2: Price increase (Spotify)
  {
    id: 'tx-spotify-1',
    accountId: 'acc-checking',
    merchantName: 'Spotify',
    amount: { amount: 9.99, currency: 'GBP' },
    date: daysAgo(120),
    category: ['Service', 'Music'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-spotify-2',
    accountId: 'acc-checking',
    merchantName: 'SPOTIFY*',
    amount: { amount: 9.99, currency: 'GBP' },
    date: daysAgo(90),
    category: ['Service', 'Music'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-spotify-3',
    accountId: 'acc-checking',
    merchantName: 'Spotify',
    amount: { amount: 10.99, currency: 'GBP' },  // Price increase!
    date: daysAgo(60),
    category: ['Service', 'Music'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-spotify-4',
    accountId: 'acc-checking',
    merchantName: 'Spotify',
    amount: { amount: 10.99, currency: 'GBP' },
    date: daysAgo(30),
    category: ['Service', 'Music'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 3: Missed payment (Gym membership)
  {
    id: 'tx-gym-1',
    accountId: 'acc-checking',
    merchantName: 'PureGym',
    amount: { amount: 29.99, currency: 'GBP' },
    date: daysAgo(120),
    category: ['Service', 'Gym'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-gym-2',
    accountId: 'acc-checking',
    merchantName: 'PureGym',
    amount: { amount: 29.99, currency: 'GBP' },
    date: daysAgo(90),
    category: ['Service', 'Gym'],
    pending: false,
    transactionType: 'purchase'
  },
  // Missed payment at day 60
  {
    id: 'tx-gym-3',
    accountId: 'acc-checking',
    merchantName: 'PureGym',
    amount: { amount: 29.99, currency: 'GBP' },
    date: daysAgo(30),
    category: ['Service', 'Gym'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 4: Yearly subscription (Amazon Prime)
  {
    id: 'tx-prime-1',
    accountId: 'acc-checking',
    merchantName: 'AMZN Mktp UK',
    amount: { amount: 95.00, currency: 'GBP' },
    date: daysAgo(730),  // 2 years ago
    category: ['Service', 'Shopping'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-prime-2',
    accountId: 'acc-checking',
    merchantName: 'Amazon Prime',
    amount: { amount: 95.00, currency: 'GBP' },
    date: daysAgo(365),  // 1 year ago
    category: ['Service', 'Shopping'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 5: Multiple Apple subscriptions (iCloud + Music)
  {
    id: 'tx-icloud-1',
    accountId: 'acc-checking',
    merchantName: 'APPLE.COM/BILL',
    amount: { amount: 0.99, currency: 'GBP' },
    date: daysAgo(90),
    category: ['Service', 'Cloud Storage'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-icloud-2',
    accountId: 'acc-checking',
    merchantName: 'Apple',
    amount: { amount: 0.99, currency: 'GBP' },
    date: daysAgo(60),
    category: ['Service', 'Cloud Storage'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-icloud-3',
    accountId: 'acc-checking',
    merchantName: 'APPLE.COM/BILL',
    amount: { amount: 0.99, currency: 'GBP' },
    date: daysAgo(30),
    category: ['Service', 'Cloud Storage'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-applemusic-1',
    accountId: 'acc-checking',
    merchantName: 'Apple Music',
    amount: { amount: 10.99, currency: 'GBP' },
    date: daysAgo(90),
    category: ['Service', 'Music'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-applemusic-2',
    accountId: 'acc-checking',
    merchantName: 'Apple Music',
    amount: { amount: 10.99, currency: 'GBP' },
    date: daysAgo(60),
    category: ['Service', 'Music'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-applemusic-3',
    accountId: 'acc-checking',
    merchantName: 'Apple Music',
    amount: { amount: 10.99, currency: 'GBP' },
    date: daysAgo(30),
    category: ['Service', 'Music'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 6: Weekly subscription (Patreon)
  {
    id: 'tx-patreon-1',
    accountId: 'acc-checking',
    merchantName: 'Patreon',
    amount: { amount: 5.00, currency: 'GBP' },
    date: daysAgo(42),
    category: ['Service', 'Membership'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-patreon-2',
    accountId: 'acc-checking',
    merchantName: 'Patreon',
    amount: { amount: 5.00, currency: 'GBP' },
    date: daysAgo(35),
    category: ['Service', 'Membership'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-patreon-3',
    accountId: 'acc-checking',
    merchantName: 'Patreon',
    amount: { amount: 5.00, currency: 'GBP' },
    date: daysAgo(28),
    category: ['Service', 'Membership'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-patreon-4',
    accountId: 'acc-checking',
    merchantName: 'Patreon',
    amount: { amount: 5.00, currency: 'GBP' },
    date: daysAgo(21),
    category: ['Service', 'Membership'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-patreon-5',
    accountId: 'acc-checking',
    merchantName: 'Patreon',
    amount: { amount: 5.00, currency: 'GBP' },
    date: daysAgo(14),
    category: ['Service', 'Membership'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-patreon-6',
    accountId: 'acc-checking',
    merchantName: 'Patreon',
    amount: { amount: 5.00, currency: 'GBP' },
    date: daysAgo(7),
    category: ['Service', 'Membership'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 7: Quarterly subscription (Adobe Creative Cloud)
  {
    id: 'tx-adobe-1',
    accountId: 'acc-checking',
    merchantName: 'Adobe',
    amount: { amount: 19.99, currency: 'GBP' },
    date: daysAgo(270),
    category: ['Service', 'Software'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-adobe-2',
    accountId: 'acc-checking',
    merchantName: 'Adobe Systems',
    amount: { amount: 19.99, currency: 'GBP' },
    date: daysAgo(180),
    category: ['Service', 'Software'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-adobe-3',
    accountId: 'acc-checking',
    merchantName: 'Adobe',
    amount: { amount: 19.99, currency: 'GBP' },
    date: daysAgo(90),
    category: ['Service', 'Software'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 8: Biweekly subscription
  {
    id: 'tx-biweekly-1',
    accountId: 'acc-checking',
    merchantName: 'ClassPass',
    amount: { amount: 15.00, currency: 'GBP' },
    date: daysAgo(56),
    category: ['Service', 'Fitness'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-biweekly-2',
    accountId: 'acc-checking',
    merchantName: 'ClassPass',
    amount: { amount: 15.00, currency: 'GBP' },
    date: daysAgo(42),
    category: ['Service', 'Fitness'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-biweekly-3',
    accountId: 'acc-checking',
    merchantName: 'ClassPass',
    amount: { amount: 15.00, currency: 'GBP' },
    date: daysAgo(28),
    category: ['Service', 'Fitness'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-biweekly-4',
    accountId: 'acc-checking',
    merchantName: 'ClassPass',
    amount: { amount: 15.00, currency: 'GBP' },
    date: daysAgo(14),
    category: ['Service', 'Fitness'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 9: One-time purchases (should NOT be detected)
  {
    id: 'tx-onetime-1',
    accountId: 'acc-checking',
    merchantName: 'Tesco',
    amount: { amount: 45.67, currency: 'GBP' },
    date: daysAgo(15),
    category: ['Shopping', 'Groceries'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-onetime-2',
    accountId: 'acc-checking',
    merchantName: 'Amazon',
    amount: { amount: 29.99, currency: 'GBP' },
    date: daysAgo(20),
    category: ['Shopping'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-onetime-3',
    accountId: 'acc-checking',
    merchantName: 'Starbucks',
    amount: { amount: 4.50, currency: 'GBP' },
    date: daysAgo(3),
    category: ['Food and Drink', 'Coffee'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 10: Irregular pattern (should have low confidence)
  {
    id: 'tx-irregular-1',
    accountId: 'acc-checking',
    merchantName: 'Variable Service',
    amount: { amount: 10.00, currency: 'GBP' },
    date: daysAgo(90),
    category: ['Service'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-irregular-2',
    accountId: 'acc-checking',
    merchantName: 'Variable Service',
    amount: { amount: 10.00, currency: 'GBP' },
    date: daysAgo(70),  // 20 days later
    category: ['Service'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-irregular-3',
    accountId: 'acc-checking',
    merchantName: 'Variable Service',
    amount: { amount: 10.00, currency: 'GBP' },
    date: daysAgo(30),  // 40 days later
    category: ['Service'],
    pending: false,
    transactionType: 'purchase'
  },

  // SCENARIO 11: Pending transaction
  {
    id: 'tx-pending-1',
    accountId: 'acc-checking',
    merchantName: 'Disney+',
    amount: { amount: 7.99, currency: 'GBP' },
    date: daysAgo(1),
    category: ['Service', 'Entertainment'],
    pending: true,  // Still pending
    transactionType: 'purchase'
  },

  // SCENARIO 12: Month-end subscription (handles February correctly)
  {
    id: 'tx-monthend-1',
    accountId: 'acc-checking',
    merchantName: 'Monthly Service',
    amount: { amount: 20.00, currency: 'GBP' },
    date: '2025-01-31',
    category: ['Service'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-monthend-2',
    accountId: 'acc-checking',
    merchantName: 'Monthly Service',
    amount: { amount: 20.00, currency: 'GBP' },
    date: '2025-02-28',  // Feb has fewer days
    category: ['Service'],
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx-monthend-3',
    accountId: 'acc-checking',
    merchantName: 'Monthly Service',
    amount: { amount: 20.00, currency: 'GBP' },
    date: '2025-03-31',
    category: ['Service'],
    pending: false,
    transactionType: 'purchase'
  },
]

/**
 * Expected detection results for testing
 */
export const expectedPatterns = {
  netflix: {
    frequency: 'monthly',
    amount: 12.99,
    transactionCount: 5,
    confidence: 'high'
  },
  spotify: {
    frequency: 'monthly',
    amount: 10.49,  // Average of 9.99 and 10.99
    transactionCount: 4,
    confidence: 'medium',  // Lower due to price change
    flags: ['price_change']
  },
  puregym: {
    frequency: 'monthly',
    amount: 29.99,
    transactionCount: 3,
    confidence: 'medium',
    flags: ['missed_payment']
  },
  amazonprime: {
    frequency: 'yearly',
    amount: 95.00,
    transactionCount: 2,
    confidence: 'medium'  // Only 2 transactions
  },
  icloud: {
    frequency: 'monthly',
    amount: 0.99,
    transactionCount: 3,
    confidence: 'high'
  },
  applemusic: {
    frequency: 'monthly',
    amount: 10.99,
    transactionCount: 3,
    confidence: 'high'
  },
  patreon: {
    frequency: 'weekly',
    amount: 5.00,
    transactionCount: 6,
    confidence: 'high'
  },
  adobe: {
    frequency: 'quarterly',
    amount: 19.99,
    transactionCount: 3,
    confidence: 'high'
  },
  classpass: {
    frequency: 'biweekly',
    amount: 15.00,
    transactionCount: 4,
    confidence: 'high'
  },
  monthlyservice: {
    frequency: 'monthly',
    amount: 20.00,
    transactionCount: 3,
    confidence: 'high'
  }
}

/**
 * Transactions that should NOT be detected as subscriptions
 */
export const nonSubscriptionTransactions = [
  'tx-onetime-1',  // Tesco
  'tx-onetime-2',  // Amazon one-time
  'tx-onetime-3',  // Starbucks
  'tx-pending-1',  // Pending Disney+
]

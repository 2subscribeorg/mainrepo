import { PatternDetector } from './src/services/PatternDetector'
import type { BankTransaction } from './src/domain/models'

// Test data: Netflix with varying merchant names and amounts
const testTransactions: BankTransaction[] = [
  // Netflix with price increase
  {
    id: 'tx1',
    merchantName: 'NETFLIX.COM',
    amount: { amount: -15.99, currency: 'GBP' },
    date: '2024-01-15',
    accountId: 'acc1',
    userId: 'user1',
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx2',
    merchantName: 'Netflix',
    amount: { amount: -15.99, currency: 'GBP' },
    date: '2024-02-15',
    accountId: 'acc1',
    userId: 'user1',
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx3',
    merchantName: 'NETFLIX LONDON',
    amount: { amount: -16.99, currency: 'GBP' }, // Price increase
    date: '2024-03-15',
    accountId: 'acc1',
    userId: 'user1',
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx4',
    merchantName: 'Netflix *Trial',
    amount: { amount: -16.99, currency: 'GBP' },
    date: '2024-04-15',
    accountId: 'acc1',
    userId: 'user1',
    pending: false,
    transactionType: 'purchase'
  },
  // Spotify - exact amounts
  {
    id: 'tx5',
    merchantName: 'Spotify',
    amount: { amount: -9.99, currency: 'GBP' },
    date: '2024-01-10',
    accountId: 'acc1',
    userId: 'user1',
    pending: false,
    transactionType: 'purchase'
  },
  {
    id: 'tx6',
    merchantName: 'SPOTIFY UK',
    amount: { amount: -9.99, currency: 'GBP' },
    date: '2024-02-10',
    accountId: 'acc1',
    userId: 'user1',
    pending: false,
    transactionType: 'purchase'
  },
  // One-off purchase (should not be detected)
  {
    id: 'tx7',
    merchantName: 'Amazon',
    amount: { amount: -25.00, currency: 'GBP' },
    date: '2024-01-20',
    accountId: 'acc1',
    userId: 'user1',
    pending: false,
    transactionType: 'purchase'
  }
]

console.log('🧪 Testing Hybrid Pattern Detection\n')
console.log('=' .repeat(60))

const detector = new PatternDetector()
const patterns = detector.detectPatterns(testTransactions)

console.log('\n' + '=' .repeat(60))
console.log(`\n✅ Found ${patterns.length} patterns:\n`)

patterns.forEach((pattern, index) => {
  console.log(`${index + 1}. ${pattern.merchant}`)
  console.log(`   Normalized: ${pattern.normalizedMerchant}`)
  console.log(`   Amount: £${pattern.amount.toFixed(2)} (variance: £${pattern.amountVariance.toFixed(2)})`)
  console.log(`   Frequency: ${pattern.frequency}`)
  console.log(`   Confidence: ${(pattern.confidence * 100).toFixed(1)}%`)
  console.log(`   Transactions: ${pattern.transactions.length}`)
  console.log(`   Amounts: ${pattern.transactions.map(t => `£${Math.abs(t.amount.amount)}`).join(', ')}`)
  console.log(`   Merchants: ${[...new Set(pattern.transactions.map(t => t.merchantName))].join(', ')}`)
  console.log('')
})

// Expected results:
console.log('Expected behavior:')
console.log('✅ Should detect Netflix despite name variations (NETFLIX.COM, Netflix, NETFLIX LONDON, Netflix *Trial)')
console.log('✅ Should handle price increase from £15.99 to £16.99 (within 15% tolerance)')
console.log('✅ Should detect Spotify with exact amounts')
console.log('❌ Should NOT detect Amazon (only 1 transaction)')

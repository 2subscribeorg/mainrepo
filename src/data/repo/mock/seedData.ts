import { faker } from '@faker-js/faker'
import type { Category, Subscription, Transaction, MerchantCategoryRule, Currency } from '@/domain/models'
import { getDB } from './db'

const CURRENCY: Currency = 'GBP'

// Default categories with colors
const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Streaming', colour: '#E91E63', monthlyLimit: { amount: 50, currency: CURRENCY } },
  { name: 'Utilities', colour: '#2196F3', monthlyLimit: { amount: 200, currency: CURRENCY } },
  { name: 'SaaS', colour: '#9C27B0', monthlyLimit: { amount: 100, currency: CURRENCY } },
  { name: 'Insurance', colour: '#4CAF50', monthlyLimit: { amount: 150, currency: CURRENCY } },
  { name: 'Fitness', colour: '#FF9800', monthlyLimit: { amount: 80, currency: CURRENCY } },
  { name: 'Cloud Storage', colour: '#00BCD4', monthlyLimit: { amount: 30, currency: CURRENCY } },
  { name: 'News & Media', colour: '#795548', monthlyLimit: { amount: 40, currency: CURRENCY } },
  { name: 'Uncategorised', colour: '#9E9E9E' },
]

// Merchant-to-category keyword mappings
const MERCHANT_KEYWORDS = [
  // Streaming
  { pattern: 'spotify', category: 'Streaming', merchants: ['Spotify Premium', 'Spotify'] },
  { pattern: 'netflix', category: 'Streaming', merchants: ['Netflix', 'Netflix Standard'] },
  { pattern: 'disney', category: 'Streaming', merchants: ['Disney+', 'Disney Plus'] },
  { pattern: 'apple music', category: 'Streaming', merchants: ['Apple Music'] },
  { pattern: 'youtube', category: 'Streaming', merchants: ['YouTube Premium'] },
  { pattern: 'amazon prime', category: 'Streaming', merchants: ['Amazon Prime Video'] },

  // Utilities
  { pattern: 'octopus', category: 'Utilities', merchants: ['Octopus Energy'] },
  { pattern: 'british gas', category: 'Utilities', merchants: ['British Gas'] },
  { pattern: 'thames water', category: 'Utilities', merchants: ['Thames Water'] },
  { pattern: 'bt broadband', category: 'Utilities', merchants: ['BT Broadband'] },
  { pattern: 'virgin media', category: 'Utilities', merchants: ['Virgin Media'] },
  { pattern: 'vodafone', category: 'Utilities', merchants: ['Vodafone'] },
  { pattern: 'ee mobile', category: 'Utilities', merchants: ['EE Mobile'] },

  // SaaS
  { pattern: 'adobe', category: 'SaaS', merchants: ['Adobe Creative Cloud'] },
  { pattern: 'microsoft', category: 'SaaS', merchants: ['Microsoft 365', 'Office 365'] },
  { pattern: 'github', category: 'SaaS', merchants: ['GitHub Pro'] },
  { pattern: 'notion', category: 'SaaS', merchants: ['Notion'] },
  { pattern: 'canva', category: 'SaaS', merchants: ['Canva Pro'] },
  { pattern: 'slack', category: 'SaaS', merchants: ['Slack Premium'] },

  // Insurance
  { pattern: 'axa', category: 'Insurance', merchants: ['AXA Insurance'] },
  { pattern: 'aviva', category: 'Insurance', merchants: ['Aviva'] },
  { pattern: 'direct line', category: 'Insurance', merchants: ['Direct Line'] },
  { pattern: 'admiral', category: 'Insurance', merchants: ['Admiral Insurance'] },

  // Fitness
  { pattern: 'gym', category: 'Fitness', merchants: ['PureGym', 'The Gym Group'] },
  { pattern: 'peloton', category: 'Fitness', merchants: ['Peloton'] },
  { pattern: 'strava', category: 'Fitness', merchants: ['Strava Premium'] },
  { pattern: 'fitness', category: 'Fitness', merchants: ['Fitness First'] },

  // Cloud Storage
  { pattern: 'dropbox', category: 'Cloud Storage', merchants: ['Dropbox Plus'] },
  { pattern: 'google one', category: 'Cloud Storage', merchants: ['Google One'] },
  { pattern: 'icloud', category: 'Cloud Storage', merchants: ['iCloud+'] },

  // News & Media
  { pattern: 'times', category: 'News & Media', merchants: ['The Times'] },
  { pattern: 'guardian', category: 'News & Media', merchants: ['The Guardian'] },
  { pattern: 'economist', category: 'News & Media', merchants: ['The Economist'] },
  { pattern: 'audible', category: 'News & Media', merchants: ['Audible'] },
]

export async function seedDatabase(): Promise<void> {
  const db = await getDB()

  // Check if already seeded
  const existingCategories = await db.getAll('categories')
  if (existingCategories.length > 0) {
    console.log('Database already seeded')
    return
  }

  console.log('Seeding database...')

  // Create categories
  const categories: Category[] = DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    id: faker.string.uuid(),
  }))

  for (const category of categories) {
    await db.put('categories', category)
  }

  // Create merchant rules
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]))
  let priority = 100

  for (const keyword of MERCHANT_KEYWORDS) {
    const categoryId = categoryMap.get(keyword.category)
    if (categoryId) {
      const rule: MerchantCategoryRule = {
        id: faker.string.uuid(),
        merchantPattern: keyword.pattern,
        categoryId,
        priority: priority--,
      }
      await db.put('merchantRules', rule)
    }
  }

  // Create subscriptions (~25)
  const subscriptions: Subscription[] = []
  const allMerchants = MERCHANT_KEYWORDS.flatMap((kw) => kw.merchants)
  const selectedMerchants = faker.helpers.arrayElements(allMerchants, 25)

  for (const merchantName of selectedMerchants) {
    const keyword = MERCHANT_KEYWORDS.find((kw) => kw.merchants.includes(merchantName))
    const categoryId = keyword ? categoryMap.get(keyword.category)! : categoryMap.get('Uncategorised')!

    const subscription: Subscription = {
      id: faker.string.uuid(),
      merchantName,
      amount: {
        amount: faker.number.float({ min: 4.99, max: 149.99, fractionDigits: 2 }),
        currency: CURRENCY,
      },
      recurrence: faker.helpers.arrayElement(['monthly', 'yearly', 'monthly', 'monthly'] as const),
      nextPaymentDate: faker.date.future({ years: 0.5 }).toISOString().split('T')[0],
      lastPaymentDate: faker.date.recent({ days: 60 }).toISOString().split('T')[0],
      categoryId,
      status: faker.helpers.arrayElement(['active', 'active', 'active', 'paused'] as const),
      source: 'mock',
    }
    subscriptions.push(subscription)
    await db.put('subscriptions', subscription)
  }

  // Seed transactions
  await seedTransactions(150, subscriptions, categories)

  console.log('Database seeded successfully!')
}

export async function seedTransactions(
  count = 150,
  existingSubscriptions?: Subscription[],
  existingCategories?: Category[]
): Promise<void> {
  const db = await getDB()

  const subscriptions = existingSubscriptions || ((await db.getAll('subscriptions')) as Subscription[])
  const categories = existingCategories || ((await db.getAll('categories')) as Category[])

  const transactions: Transaction[] = []

  // Generate transactions over the past 12 months
  for (let i = 0; i < count; i++) {
    const linkedSubscription = faker.helpers.maybe(() => faker.helpers.arrayElement(subscriptions), {
      probability: 0.7,
    })

    const merchantName = linkedSubscription
      ? linkedSubscription.merchantName
      : faker.helpers.arrayElement(MERCHANT_KEYWORDS.flatMap((kw) => kw.merchants))

    const categoryId = linkedSubscription
      ? linkedSubscription.categoryId
      : faker.helpers.arrayElement(categories).id

    const transaction: Transaction = {
      id: faker.string.uuid(),
      subscriptionId: linkedSubscription?.id,
      merchantName,
      amount: {
        amount: linkedSubscription
          ? linkedSubscription.amount.amount
          : faker.number.float({ min: 4.99, max: 149.99, fractionDigits: 2 }),
        currency: CURRENCY,
      },
      date: faker.date.recent({ days: 365 }).toISOString().split('T')[0],
      categoryId,
    }

    transactions.push(transaction)
    await db.put('transactions', transaction)
  }
}

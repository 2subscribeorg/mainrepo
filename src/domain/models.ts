export type ID = string
export type Currency = 'GBP' | 'EUR' | 'USD'
export type Recurrence = 'monthly' | 'yearly' | 'weekly' | 'custom'

export interface Money {
  amount: number
  currency: Currency
}

export interface Category {
  id: ID
  name: string
  colour?: string
  monthlyLimit?: Money
}

export interface Subscription {
  id: ID
  merchantName: string
  amount: Money
  recurrence: Recurrence
  nextPaymentDate: string
  lastPaymentDate?: string
  categoryId: ID
  status: 'active' | 'paused' | 'cancelled'
  source: 'mock' | 'plaid'
}

export interface Transaction {
  id: ID
  subscriptionId?: ID
  merchantName: string
  amount: Money
  date: string
  categoryId?: ID
}

export interface BudgetConfig {
  currency: Currency
  monthlyLimit?: Money
  yearlyLimit?: Money
  perCategoryLimits?: Record<ID, Money>
}

export interface BudgetStatus {
  month: string
  totalSpent: Money
  monthlyLimit?: Money
  yearlyLimit?: Money
  isOverBudget: boolean
  categoryStatus: Array<{
    categoryId: ID
    categoryName: string
    spent: Money
    limit?: Money
    isOver: boolean
  }>
  breaches: Array<{
    type: 'monthly' | 'yearly' | 'category'
    categoryId?: ID
    categoryName?: string
    spent: Money
    limit: Money
    overage: Money
  }>
}

export interface MerchantCategoryRule {
  id: ID
  merchantPattern: string
  categoryId: ID
  priority: number
}

export interface NotificationData {
  id: ID
  type: 'budget_breach' | 'subscription_due' | 'subscription_cancelled'
  title: string
  message: string
  timestamp: string
  read: boolean
  data?: Record<string, unknown>
}

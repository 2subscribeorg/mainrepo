// Export all types from the application
export * from './billing'
export * from './transactions'
export * from './subscriptions'

// Common interfaces that might be used across components
export interface Category {
  id: string
  name: string
  colour: string
  icon: string
}

export interface User {
  id: string
  name: string
  email: string
}

export interface Subscription {
  id: string
  name: string
  amount: number
  category: string
  nextBilling: string
}

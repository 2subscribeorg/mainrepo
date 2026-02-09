export interface User {
  id: string
  email: string
  displayName?: string
  createdAt: string
  lastLogin?: string
  status: 'active' | 'inactive' | 'suspended'
  emailVerified: boolean
  subscriptionCount: number
  bankConnectionCount: number
  subscriptionCategories?: string[]
}

export interface Activity {
  id: string
  userId: string
  userEmail: string
  type: ActivityType
  description: string
  timestamp: string
  metadata?: Record<string, any>
  ipAddress?: string
}

export enum ActivityType {
  ACCOUNT_CREATED = 'account_created',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_DELETED = 'subscription_deleted',
  BANK_CONNECTED = 'bank_connected',
  BANK_DISCONNECTED = 'bank_disconnected',
  TRANSACTION_SYNCED = 'transaction_synced',
  CATEGORY_CREATED = 'category_created',
  DATA_EXPORTED = 'data_exported'
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  timestamp: string
}

export interface UserListResponse {
  users: User[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface UserDetailsResponse {
  user: User
  stats: {
    subscriptionCount: number
    totalSpend: number
    bankConnectionCount: number
  }
}

export interface ActivitiesResponse {
  activities: Activity[]
  total: number
}

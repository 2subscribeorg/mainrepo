export enum UserActivityType {
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  DASHBOARD_VIEWED = 'DASHBOARD_VIEWED',
  SUBSCRIPTION_ADDED = 'SUBSCRIPTION_ADDED',
  SUBSCRIPTION_EDITED = 'SUBSCRIPTION_EDITED',
  SUBSCRIPTION_DELETED = 'SUBSCRIPTION_DELETED',
  BANK_ACCOUNT_CONNECTED = 'BANK_ACCOUNT_CONNECTED',
  TRANSACTIONS_SYNCED = 'TRANSACTIONS_SYNCED',
  TRANSACTION_MATCHED = 'TRANSACTION_MATCHED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
}

export interface UserActivity {
  id: string
  userId: string
  type: UserActivityType
  description: string
  timestamp: string
}

export interface AdminUserInfo {
  uid: string
  email: string
  displayName?: string
  createdAt: string
  lastLogin?: string
  isActive: boolean
  subscriptionCount: number
  bankAccountCount: number
  lastActivity?: UserActivity
  recentActivities: UserActivity[]
}

export interface AdminUserListResponse {
  users: AdminUserInfo[]
  totalCount: number
  page: number
  limit: number
}

export interface CreateUserRequest {
  email: string
  displayName?: string
  password?: string
}

export interface AdminApiResponse<T = unknown> {
  data?: T
  message?: string
  error?: string
}

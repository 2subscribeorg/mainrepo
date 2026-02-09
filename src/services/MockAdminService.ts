import { 
  AdminUserListResponse, 
  AdminUserInfo, 
  UserActivity, 
  CreateUserRequest,
  UserActivityType 
} from '@/types/admin'

// Mock users data
const MOCK_USERS: AdminUserInfo[] = [
  {
    uid: 'mock-user-1',
    email: 'john.doe@example.com',
    displayName: 'John Doe',
    createdAt: '2024-01-15T10:30:00Z',
    lastLogin: '2024-11-25T14:20:00Z',
    isActive: true,
    subscriptionCount: 5,
    bankAccountCount: 2,
    lastActivity: {
      id: 'activity-1',
      userId: 'mock-user-1',
      type: UserActivityType.DASHBOARD_VIEWED,
      description: 'Viewed dashboard',
      timestamp: '2024-11-25T14:20:00Z'
    },
    recentActivities: [
      {
        id: 'activity-1',
        userId: 'mock-user-1',
        type: UserActivityType.DASHBOARD_VIEWED,
        description: 'Viewed dashboard',
        timestamp: '2024-11-25T14:20:00Z'
      },
      {
        id: 'activity-2',
        userId: 'mock-user-1',
        type: UserActivityType.SUBSCRIPTION_ADDED,
        description: 'Added Netflix subscription',
        timestamp: '2024-11-24T09:15:00Z'
      },
      {
        id: 'activity-3',
        userId: 'mock-user-1',
        type: UserActivityType.BANK_ACCOUNT_CONNECTED,
        description: 'Connected Chase Bank account',
        timestamp: '2024-11-23T16:45:00Z'
      }
    ]
  },
  {
    uid: 'mock-user-2',
    email: 'jane.smith@example.com',
    displayName: 'Jane Smith',
    createdAt: '2024-02-20T08:15:00Z',
    lastLogin: '2024-11-20T11:30:00Z',
    isActive: false,
    subscriptionCount: 3,
    bankAccountCount: 1,
    lastActivity: {
      id: 'activity-4',
      userId: 'mock-user-2',
      type: UserActivityType.SETTINGS_CHANGED,
      description: 'Updated email preferences',
      timestamp: '2024-11-20T11:30:00Z'
    },
    recentActivities: [
      {
        id: 'activity-4',
        userId: 'mock-user-2',
        type: UserActivityType.SETTINGS_CHANGED,
        description: 'Updated email preferences',
        timestamp: '2024-11-20T11:30:00Z'
      },
      {
        id: 'activity-5',
        userId: 'mock-user-2',
        type: UserActivityType.SUBSCRIPTION_DELETED,
        description: 'Cancelled Spotify subscription',
        timestamp: '2024-11-18T13:22:00Z'
      }
    ]
  },
  {
    uid: 'mock-user-3',
    email: 'bob.wilson@example.com',
    displayName: 'Bob Wilson',
    createdAt: '2024-03-10T12:00:00Z',
    lastLogin: '2024-11-26T09:45:00Z',
    isActive: true,
    subscriptionCount: 8,
    bankAccountCount: 3,
    lastActivity: {
      id: 'activity-6',
      userId: 'mock-user-3',
      type: UserActivityType.TRANSACTIONS_SYNCED,
      description: 'Synced transactions from Wells Fargo',
      timestamp: '2024-11-26T09:45:00Z'
    },
    recentActivities: [
      {
        id: 'activity-6',
        userId: 'mock-user-3',
        type: UserActivityType.TRANSACTIONS_SYNCED,
        description: 'Synced transactions from Wells Fargo',
        timestamp: '2024-11-26T09:45:00Z'
      },
      {
        id: 'activity-7',
        userId: 'mock-user-3',
        type: UserActivityType.TRANSACTION_MATCHED,
        description: 'Matched transaction to Adobe subscription',
        timestamp: '2024-11-26T09:30:00Z'
      },
      {
        id: 'activity-8',
        userId: 'mock-user-3',
        type: UserActivityType.SUBSCRIPTION_EDITED,
        description: 'Updated Microsoft 365 subscription details',
        timestamp: '2024-11-25T15:10:00Z'
      }
    ]
  },
  {
    uid: 'mock-user-4',
    email: 'alice.johnson@example.com',
    displayName: 'Alice Johnson',
    createdAt: '2024-01-05T14:30:00Z',
    lastLogin: undefined, // Never logged in
    isActive: false,
    subscriptionCount: 0,
    bankAccountCount: 0,
    recentActivities: [
      {
        id: 'activity-9',
        userId: 'mock-user-4',
        type: UserActivityType.ACCOUNT_CREATED,
        description: 'Account created',
        timestamp: '2024-01-05T14:30:00Z'
      }
    ]
  }
]

export class MockAdminService {
  private users: AdminUserInfo[] = [...MOCK_USERS]

  /**
   * Get paginated list of users
   */
  async getUserList(
    page: number = 1, 
    limit: number = 20, 
    searchQuery?: string
  ): Promise<AdminUserListResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    let filteredUsers = [...this.users]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredUsers = filteredUsers.filter(user => 
        user.email.toLowerCase().includes(query) ||
        (user.displayName && user.displayName.toLowerCase().includes(query))
      )
    }

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    return {
      users: paginatedUsers,
      totalCount: filteredUsers.length,
      page,
      limit
    }
  }

  /**
   * Get detailed activity history for a user
   */
  async getUserActivities(userId: string, limit: number = 50): Promise<UserActivity[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200))

    const user = this.users.find(u => u.uid === userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Return recent activities, limited by the limit parameter
    return user.recentActivities.slice(0, limit)
  }

  /**
   * Create a new user
   */
  async createUser(request: CreateUserRequest): Promise<{ uid: string; email: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check if email already exists
    if (this.users.some(u => u.email === request.email)) {
      throw new Error('Email already exists')
    }

    // Create new user
    const newUser: AdminUserInfo = {
      uid: `mock-user-${Date.now()}`,
      email: request.email,
      displayName: request.displayName,
      createdAt: new Date().toISOString(),
      lastLogin: undefined,
      isActive: false,
      subscriptionCount: 0,
      bankAccountCount: 0,
      recentActivities: [
        {
          id: `activity-${Date.now()}`,
          userId: `mock-user-${Date.now()}`,
          type: UserActivityType.ACCOUNT_CREATED,
          description: 'Account created by admin',
          timestamp: new Date().toISOString()
        }
      ]
    }

    this.users.unshift(newUser) // Add to beginning of list

    console.log('✅ Mock: Created user', request.email)

    return {
      uid: newUser.uid,
      email: newUser.email
    }
  }

  /**
   * Delete a user account
   */
  async deleteUser(userId: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))

    const userIndex = this.users.findIndex(u => u.uid === userId)
    if (userIndex === -1) {
      throw new Error('User not found')
    }

    const user = this.users[userIndex]
    this.users.splice(userIndex, 1)

    console.log('✅ Mock: Deleted user', user.email)
  }

  /**
   * Send password reset email to user by user ID
   */
  async sendPasswordResetByUserId(userId: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const user = this.users.find(u => u.uid === userId)
    if (!user) {
      throw new Error('User not found')
    }

    console.log('✅ Mock: Sent password reset to', user.email)
  }

  /**
   * Send password reset email to user by email address
   */
  async sendPasswordResetByEmail(email: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const user = this.users.find(u => u.email === email)
    if (!user) {
      throw new Error('User not found')
    }

    console.log('✅ Mock: Sent password reset to', email)
  }

  /**
   * Get current admin user info
   */
  async getAdminInfo(): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      uid: 'mock-admin-1',
      email: 'admin@2subscribe.app',
      isSuperAdmin: true,
      permissions: ['view_users', 'manage_users', 'delete_users', 'reset_passwords']
    }
  }
}

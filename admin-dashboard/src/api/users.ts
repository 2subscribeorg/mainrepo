import { apiClient } from './client'
import type {
  ApiResponse,
  UserListResponse,
  UserDetailsResponse,
  ActivitiesResponse,
} from '@/types/api'

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  usersWithSubscriptions: number
  usersWithBank: number
}

export const usersApi = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get<ApiResponse<DashboardStats>>('/stats')
    return data.data!
  },

  async getRecentUsers(limit = 8): Promise<{ users: any[] }> {
    const { data } = await apiClient.get<ApiResponse<{ users: any[] }>>('/recent-users', { limit })
    return data.data!
  },

  async getUsers(params: {
    page?: number
    limit?: number
    search?: string
    status?: string
  }): Promise<UserListResponse> {
    const { data } = await apiClient.get<ApiResponse<UserListResponse>>('/users', params)
    return data.data!
  },

  async getUser(userId: string): Promise<UserDetailsResponse> {
    const { data } = await apiClient.get<ApiResponse<UserDetailsResponse>>(`/users/${userId}`)
    return data.data!
  },

  async createUser(data: { email: string; password: string; displayName?: string }): Promise<{ uid: string; email: string }> {
    const { data: res } = await apiClient.post<ApiResponse<{ uid: string; email: string }>>('/users', data)
    return res.data!
  },

  async updateUser(userId: string, updates: { displayName?: string; status?: 'active' | 'inactive'; email?: string }): Promise<void> {
    await apiClient.patch(`/users/${userId}`, updates)
  },

  async sendWelcomeEmail(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/welcome-email`)
  },

  async banUser(userId: string, reason?: string): Promise<void> {
    await apiClient.post(`/users/${userId}/ban`, { reason })
  },

  async unbanUser(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/unban`)
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`)
  },

  async sendPasswordReset(userId: string): Promise<{ email: string }> {
    const { data } = await apiClient.post<ApiResponse<{ email: string; resetLinkSent: boolean }>>(
      `/users/${userId}/password-reset`
    )
    return { email: data.data!.email }
  },

  async getUserActivities(
    userId: string,
    params?: { limit?: number; type?: string[] }
  ): Promise<ActivitiesResponse> {
    const { data } = await apiClient.get<ApiResponse<ActivitiesResponse>>(
      `/users/${userId}/activities`,
      params
    )
    return data.data!
  },

  async getUserSubscription(userId: string): Promise<SubscriptionDetails> {
    const { data } = await apiClient.get<ApiResponse<SubscriptionDetails>>(`/users/${userId}/subscription`)
    return data.data!
  },

  async cancelSubscription(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/cancel-subscription`)
  },
}

export interface SubscriptionInvoice {
  id: string
  productId: string | null
  amount: number
  currency: string
  type: string
  status: string
  autoRenews: boolean
  purchasedAt: string | null
  revenueCatUserId: string | null
  transactionId: string
}

export interface SubscriptionDetails {
  subscriptionStatus: string
  subscriptionProductId: string | null
  subscriptionExpiresAt: string | null
  revenueCatUserId: string | null
  pendingCancellation: boolean
  invoices: SubscriptionInvoice[]
}

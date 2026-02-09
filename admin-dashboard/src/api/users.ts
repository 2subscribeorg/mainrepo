import { apiClient } from './client'
import type {
  ApiResponse,
  UserListResponse,
  UserDetailsResponse,
  ActivitiesResponse,
} from '@/types/api'

export const usersApi = {
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
}

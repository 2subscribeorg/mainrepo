import { 
  AdminUserListResponse, 
  UserActivity, 
  CreateUserRequest,
  AdminApiResponse 
} from '@/types/admin'
import { MockAdminService } from './MockAdminService'

class AdminService {
  private mockService = new MockAdminService()
  private isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'
  private baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

  /**
   * Get authorization headers with current user's token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const auth = await import('@/config/firebase').then(m => m.getFirebaseAuth())
    const user = auth.currentUser
    
    if (!user) {
      throw new Error('Not authenticated')
    }

    const token = await user.getIdToken()
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  /**
   * Handle API response and throw errors if needed
   */
  private async handleResponse<T>(response: Response): Promise<AdminApiResponse<T>> {
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'API request failed')
    }
    
    return data
  }

  /**
   * Get paginated list of users
   */
  async getUserList(
    page: number = 1, 
    limit: number = 20, 
    searchQuery?: string
  ): Promise<AdminUserListResponse> {
    if (!this.isFirebaseMode) {
      return this.mockService.getUserList(page, limit, searchQuery)
    }

    const headers = await this.getAuthHeaders()
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })
    
    if (searchQuery) {
      params.append('search', searchQuery)
    }

    const response = await fetch(
      `${this.baseUrl}/api/admin/users?${params}`,
      { headers }
    )

    const result = await this.handleResponse<AdminUserListResponse>(response)
    return result.data!
  }

  /**
   * Get detailed activity history for a user
   */
  async getUserActivities(userId: string, limit: number = 50): Promise<UserActivity[]> {
    if (!this.isFirebaseMode) {
      return this.mockService.getUserActivities(userId, limit)
    }

    const headers = await this.getAuthHeaders()

    const response = await fetch(
      `${this.baseUrl}/api/admin/users/${userId}/activities?limit=${limit}`,
      { headers }
    )

    const result = await this.handleResponse<UserActivity[]>(response)
    return result.data!
  }

  /**
   * Create a new user
   */
  async createUser(request: CreateUserRequest): Promise<{ uid: string; email: string }> {
    if (!this.isFirebaseMode) {
      return this.mockService.createUser(request)
    }

    const headers = await this.getAuthHeaders()

    const response = await fetch(
      `${this.baseUrl}/api/admin/users`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      }
    )

    const result = await this.handleResponse<{ uid: string; email: string }>(response)
    return result.data!
  }

  /**
   * Delete a user account
   */
  async deleteUser(userId: string): Promise<void> {
    if (!this.isFirebaseMode) {
      return this.mockService.deleteUser(userId)
    }

    const headers = await this.getAuthHeaders()

    const response = await fetch(
      `${this.baseUrl}/api/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers
      }
    )

    await this.handleResponse(response)
  }

  /**
   * Send password reset email to user by user ID
   */
  async sendPasswordResetByUserId(userId: string): Promise<void> {
    if (!this.isFirebaseMode) {
      return this.mockService.sendPasswordResetByUserId(userId)
    }

    const headers = await this.getAuthHeaders()

    const response = await fetch(
      `${this.baseUrl}/api/admin/users/${userId}/password-reset`,
      {
        method: 'POST',
        headers
      }
    )

    await this.handleResponse(response)
  }

  /**
   * Send password reset email to user by email address
   */
  async sendPasswordResetByEmail(email: string): Promise<void> {
    if (!this.isFirebaseMode) {
      return this.mockService.sendPasswordResetByEmail(email)
    }

    const headers = await this.getAuthHeaders()

    const response = await fetch(
      `${this.baseUrl}/api/admin/users/password-reset-by-email`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ email })
      }
    )

    await this.handleResponse(response)
  }

  /**
   * Get current admin user info
   */
  async getAdminInfo(): Promise<any> {
    if (!this.isFirebaseMode) {
      return this.mockService.getAdminInfo()
    }

    const headers = await this.getAuthHeaders()

    const response = await fetch(
      `${this.baseUrl}/api/admin/me`,
      { headers }
    )

    const result = await this.handleResponse(response)
    return result.data
  }
}

export { AdminService }
export const adminService = new AdminService()

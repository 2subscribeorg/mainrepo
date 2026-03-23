import type { ID } from '@/domain/models'
import type { RenewalWarning, WarningCalculationResult } from '@/types/renewalWarning'
import { getFirebaseAuthToken } from '@/utils/authHelpers'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

class RenewalWarningService {
  private async getAuthToken(): Promise<string> {
    try {
      return await getFirebaseAuthToken()
    } catch (error) {
      throw error
    }
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response
  }

  async getWarnings(userId: ID): Promise<RenewalWarning[]> {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/api/warnings/${userId}`)
    const data = await response.json()
    return data.data || []
  }

  async calculateWarnings(userId: ID): Promise<WarningCalculationResult> {
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/api/warnings/calculate/${userId}`,
      { method: 'POST' }
    )
    const data = await response.json()
    return data.data
  }

  async dismissWarning(userId: ID, warningId: ID): Promise<void> {
    await this.fetchWithAuth(
      `${API_BASE_URL}/api/warnings/${warningId}/dismiss`,
      {
        method: 'PATCH',
        body: JSON.stringify({ userId }),
      }
    )
  }

  getWarningUrgency(daysUntilDue: number): 'critical' | 'warning' | 'info' {
    if (daysUntilDue <= 1) return 'critical'
    if (daysUntilDue <= 3) return 'warning'
    return 'info'
  }

  formatDaysRemaining(daysUntilDue: number): string {
    if (daysUntilDue === 0) return 'Today'
    if (daysUntilDue === 1) return 'Tomorrow'
    return `${daysUntilDue} days`
  }

  formatDueDate(dueDate: string): string {
    const date = new Date(dueDate)
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }
}

export const renewalWarningService = new RenewalWarningService()

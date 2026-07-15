import type { User } from 'firebase/auth'
import { buildBackendApiUrl } from '@/config/backendApi'

export interface EmailVerificationConfig {
  continueUrl?: string
  handleCodeInApp?: boolean
}

export interface EmailVerificationResult {
  success: boolean
  error?: string
}

export class EmailVerificationService {
  async sendVerificationEmail(
    user: User,
    config?: EmailVerificationConfig
  ): Promise<EmailVerificationResult> {
    try {
      const token = await user.getIdToken()

      const response = await fetch(buildBackendApiUrl('/auth/email-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          continueUrl: config?.continueUrl,
          handleCodeInApp: config?.handleCodeInApp,
        }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error?.message || 'Failed to send verification email')
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error && error.message
          ? error.message
          : 'Failed to send verification email',
      }
    }
  }

  isEmailVerified(user: User | null): boolean {
    return user?.emailVerified ?? false
  }

  async reloadAndCheckVerification(user: User): Promise<boolean> {
    try {
      await user.reload()
      return user.emailVerified
    } catch {
      return false
    }
  }
}

export const emailVerificationService = new EmailVerificationService()

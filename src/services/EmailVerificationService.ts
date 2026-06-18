import {
  sendEmailVerification,
  type ActionCodeSettings,
  type User,
} from 'firebase/auth'

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
      const actionCodeSettings = this.getActionCodeSettings(config)
      await sendEmailVerification(user, actionCodeSettings)

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: this.getErrorMessage(error),
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

  private getActionCodeSettings(config?: EmailVerificationConfig): ActionCodeSettings | undefined {
    if (!config?.continueUrl) {
      return undefined
    }

    return {
      url: config.continueUrl,
      handleCodeInApp: config.handleCodeInApp,
    }
  }

  private getErrorMessage(error: unknown): string {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''

    if (code === 'auth/too-many-requests') {
      return 'Too many verification emails were requested. Please try again later.'
    }

    if (code === 'auth/network-request-failed') {
      return 'Network error. Please check your connection and try again.'
    }

    if (code === 'auth/unauthorized-continue-uri' || code === 'auth/invalid-continue-uri') {
      return 'Verification link configuration is invalid. Please contact support.'
    }

    if (error instanceof Error && error.message) {
      return error.message
    }

    return 'Failed to send verification email'
  }
}

export const emailVerificationService = new EmailVerificationService()

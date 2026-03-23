import { sendEmailVerification, type User } from 'firebase/auth'

export interface EmailVerificationConfig {
  continueUrl?: string
  handleCodeInApp?: boolean
}

export interface EmailVerificationResult {
  success: boolean
  error?: string
}

export class EmailVerificationService {
  private getDefaultContinueUrl(): string {
    // Guard against SSR/test environments where window is undefined
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}/login`
    }
    // Fallback for SSR/test environments
    return 'http://localhost:5173/login'
  }

  private readonly defaultConfig: EmailVerificationConfig = {
    continueUrl: undefined, // Will be set lazily via getDefaultContinueUrl()
    handleCodeInApp: false,
  }

  async sendVerificationEmail(
    user: User,
    config?: EmailVerificationConfig
  ): Promise<EmailVerificationResult> {
    try {
      const actionCodeSettings = {
        url: config?.continueUrl || this.getDefaultContinueUrl(),
        handleCodeInApp: config?.handleCodeInApp ?? this.defaultConfig.handleCodeInApp!,
      }

      await sendEmailVerification(user, actionCodeSettings)

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send verification email',
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
    } catch (error) {
      return false
    }
  }
}

export const emailVerificationService = new EmailVerificationService()

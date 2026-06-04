export interface PasswordResetResult {
  success: boolean
  message: string
}

export class PasswordResetService {
  private readonly baseUrl = import.meta.env.VITE_BACKEND_API_URL

  async sendPasswordResetEmail(email: string): Promise<PasswordResetResult> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        return {
          success: false,
          message: result?.error?.message || 'Failed to send password reset email',
        }
      }

      return {
        success: true,
        message: result?.data?.message || 'If an account exists for this email, a password reset email has been sent.',
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send password reset email',
      }
    }
  }
}

export const passwordResetService = new PasswordResetService()

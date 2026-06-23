import { sendPasswordResetEmail } from 'firebase/auth'
import { getFirebaseAuth } from '@/config/firebase'

export interface PasswordResetResult {
  success: boolean
  message: string
}

export class PasswordResetService {
  async sendPasswordResetEmail(email: string): Promise<PasswordResetResult> {
    try {
      const auth = getFirebaseAuth()
      await sendPasswordResetEmail(auth, email)
      return {
        success: true,
        message: 'If an account exists for this email, a password reset link has been sent.',
      }
    } catch {
      // Always return a safe generic message to prevent email enumeration
      return {
        success: true,
        message: 'If an account exists for this email, a password reset link has been sent.',
      }
    }
  }
}

export const passwordResetService = new PasswordResetService()

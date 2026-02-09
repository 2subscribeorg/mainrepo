import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { usersApi } from '@/api/users'

export function useUserActions() {
  const message = useMessage()
  const isDeleting = ref(false)
  const isResetting = ref(false)

  async function deleteUser(userId: string, email: string): Promise<boolean> {
    isDeleting.value = true
    
    try {
      await usersApi.deleteUser(userId)
      message.success(`User ${email} deleted successfully`)
      return true
    } catch (err: any) {
      console.error('❌ Delete user error:', err)
      message.error(err.response?.data?.error?.message || err.message || 'Failed to delete user')
      return false
    } finally {
      isDeleting.value = false
    }
  }

  async function sendPasswordReset(userId: string, email: string): Promise<boolean> {
    isResetting.value = true
    
    try {
      await usersApi.sendPasswordReset(userId)
      message.success(`Password reset email sent to ${email}`)
      return true
    } catch (err: any) {
      console.error('❌ Password reset error:', err)
      message.error(err.response?.data?.error?.message || err.message || 'Failed to send password reset')
      return false
    } finally {
      isResetting.value = false
    }
  }

  return {
    isDeleting,
    isResetting,
    deleteUser,
    sendPasswordReset,
  }
}

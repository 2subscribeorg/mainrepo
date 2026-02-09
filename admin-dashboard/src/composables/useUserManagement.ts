import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { usersApi } from '@/api/users'
import type { User } from '@/types/api'

export function useUserManagement() {
  const message = useMessage()
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  async function fetchUsers(search?: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      console.log('📡 Fetching users...', { search })

      const response = await usersApi.getUsers({
        page: 1,
        limit: 100,
        search: search || searchQuery.value,
      })

      console.log('✅ Users fetched:', response.users.length)
      users.value = response.users || []

      if (users.value.length === 0) {
        error.value = search ? 'No users found matching your search' : 'No users found in database'
      }
    } catch (err: any) {
      console.error('❌ Error fetching users:', err)
      error.value = err.message || 'Failed to fetch users'
      message.error(error.value)
    } finally {
      loading.value = false
    }
  }

  function handleSearch(query: string) {
    searchQuery.value = query
    fetchUsers(query)
  }

  function handleClearSearch() {
    searchQuery.value = ''
    fetchUsers('')
  }

  return {
    users,
    loading,
    error,
    searchQuery,
    fetchUsers,
    handleSearch,
    handleClearSearch,
  }
}

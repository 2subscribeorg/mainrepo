<template>
  <div style="padding: 24px">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px">
      <h2>User Management</h2>
      <n-button @click="handleLogout">Logout</n-button>
    </div>

    <n-card title="Users">
      <template #header-extra>
        <UserSearch
          v-model="searchQuery"
          @search="handleSearch"
          @clear="handleClearSearch"
          style="width: 300px"
        />
      </template>
      
      <div v-if="loading">Loading users...</div>
      <div v-else-if="error" style="color: red">{{ error }}</div>
      <div v-else-if="users.length === 0">No users found</div>
      <div v-else>
        <p>Total users: {{ users.length }}</p>
        <n-list bordered>
          <n-list-item v-for="user in users" :key="user.id">
            <div>
              <strong>{{ user.email }}</strong>
              <div style="font-size: 12px; color: #666">
                ID: {{ user.id }}
              </div>
              <div v-if="user.subscriptionCount > 0" style="margin-top: 8px">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px">
                  {{ user.subscriptionCount }} subscription{{ user.subscriptionCount !== 1 ? 's' : '' }}
                </div>
                <div v-if="user.subscriptionCategories && user.subscriptionCategories.length > 0">
                  <n-tag
                    v-for="(category, index) in user.subscriptionCategories"
                    :key="index"
                    size="small"
                    type="success"
                    style="margin-right: 4px; margin-bottom: 4px"
                  >
                    {{ category }}
                  </n-tag>
                </div>
              </div>
              <div v-else style="font-size: 12px; color: #999; margin-top: 4px">
                No active subscriptions
              </div>
            </div>
            <template #suffix>
              <n-space>
                <n-button
                  size="small"
                  @click="handlePasswordReset(user.id, user.email)"
                  :loading="isResetting && resettingUserId === user.id"
                >
                  Reset Password
                </n-button>
                <n-button
                  size="small"
                  type="error"
                  @click="showDeleteModal(user.id, user.email)"
                  :loading="isDeleting && deletingUserId === user.id"
                >
                  Delete
                </n-button>
              </n-space>
            </template>
          </n-list-item>
        </n-list>
      </div>
    </n-card>
    <DeleteUserModal
      :show="showDeleteConfirm"
      :user="userToDelete"
      @cancel="handleDeleteCancel"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useUserActions } from '@/composables/useUserActions'
import { useUserManagement } from '@/composables/useUserManagement'
import DeleteUserModal from '@/components/DeleteUserModal.vue'
import UserSearch from '@/components/UserSearch.vue'
import type { User } from '@/types/api'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const resettingUserId = ref<string | null>(null)
const deletingUserId = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const userToDelete = ref<{ id: string; email: string } | null>(null)

const { isDeleting, isResetting, deleteUser, sendPasswordReset } = useUserActions()
const { users, loading, error, searchQuery, fetchUsers, handleSearch, handleClearSearch } = useUserManagement()


async function handlePasswordReset(userId: string, email: string): Promise<void> {
  resettingUserId.value = userId
  await sendPasswordReset(userId, email)
  resettingUserId.value = null
}

function showDeleteModal(userId: string, email: string): void {
  userToDelete.value = { id: userId, email }
  showDeleteConfirm.value = true
}

async function handleDeleteConfirm(): Promise<void> {
  if (!userToDelete.value) return
  
  deletingUserId.value = userToDelete.value.id
  const success = await deleteUser(userToDelete.value.id, userToDelete.value.email)
  
  if (success) {
    // Refresh user list
    await fetchUsers()
  }
  
  deletingUserId.value = null
  showDeleteConfirm.value = false
  userToDelete.value = null
}

function handleDeleteCancel(): void {
  showDeleteConfirm.value = false
  userToDelete.value = null
}

async function handleLogout(): Promise<void> {
  await authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  fetchUsers()
})
</script>

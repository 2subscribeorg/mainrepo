<template>
  <div>
    <n-page-header style="margin-bottom: 24px" @back="router.back()">
      <template #title>{{ user?.displayName || user?.email || 'User' }}</template>
      <template #subtitle>{{ user?.email }}</template>
      <template #extra>
        <n-space>
          <n-tag v-if="user?.isBanned" type="error" size="small">Banned</n-tag>
          <n-tag v-if="user" :type="planTagTypes[user.appPlan as AppPlan]" size="small">
            {{ planLabels[user.appPlan as AppPlan] }}
          </n-tag>
          <template v-if="canWriteUsers && user">
            <n-button
              size="small"
              :loading="resetting"
              @click="handlePasswordReset"
            >
              Reset Password
            </n-button>
            <n-button
              size="small"
              :type="user.isBanned ? 'default' : 'warning'"
              ghost
              @click="user.isBanned ? handleUnban() : (showBanModal = true)"
              :loading="banning"
            >
              {{ user.isBanned ? 'Unban' : 'Ban' }}
            </n-button>
            <n-tooltip :disabled="!isSubscribed">
              <template #trigger>
                <n-button
                  size="small"
                  type="error"
                  ghost
                  :disabled="isSubscribed"
                  :loading="deleting"
                  @click="showDeleteModal = true"
                >
                  Delete
                </n-button>
              </template>
              Cannot delete a user with an active subscription. Cancel the subscription first.
            </n-tooltip>
          </template>
        </n-space>
      </template>
    </n-page-header>

    <n-spin :show="loading">
      <n-grid v-if="user" :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>

        <!-- Edit Profile -->
        <n-gi span="2 m:1">
          <n-card title="Edit Profile">
            <n-form :model="form" label-placement="top" :disabled="saving || !canWriteUsers">
              <n-form-item label="Display Name">
                <n-input v-model:value="form.displayName" placeholder="No display name" clearable :disabled="!canWriteUsers" />
              </n-form-item>
              <n-form-item label="Email">
                <n-input v-model:value="form.email" placeholder="user@example.com" :disabled="!canWriteUsers" />
              </n-form-item>
              <n-form-item label="Account Status">
                <n-select v-model:value="form.status" :options="statusOptions" :disabled="!canWriteUsers" />
              </n-form-item>
              <n-button v-if="canWriteUsers" type="primary" :loading="saving" :disabled="!isDirty" @click="save">
                Save Changes
              </n-button>
              <n-tag v-else type="default" size="small">View only</n-tag>
            </n-form>
          </n-card>
        </n-gi>

        <!-- Account Info -->
        <n-gi span="2 m:1">
          <n-card title="Account Info">
            <n-descriptions :column="1" label-placement="left" label-style="width: 130px; color: #999">
              <n-descriptions-item label="Email">{{ user.email }}</n-descriptions-item>
              <n-descriptions-item label="Status">
                <n-tag size="small" :type="user.status === 'active' ? 'success' : 'default'">{{ user.status }}</n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="Plan">
                <n-tag size="small" :type="planTagTypes[user.appPlan as AppPlan]">{{ planLabels[user.appPlan as AppPlan] }}</n-tag>
              </n-descriptions-item>
              <n-descriptions-item v-if="user.appPlanExpiresAt" label="Plan Expires">
                {{ formatDate(user.appPlanExpiresAt) }}
              </n-descriptions-item>
              <n-descriptions-item label="Joined">{{ formatDate(user.createdAt) }}</n-descriptions-item>
              <n-descriptions-item label="Subscriptions">{{ user.subscriptionCount }}</n-descriptions-item>
              <n-descriptions-item v-if="user.isBanned" label="Banned At">
                {{ user.bannedAt ? formatDate(user.bannedAt) : '—' }}
              </n-descriptions-item>
              <n-descriptions-item v-if="user.isBanned && user.bannedReason" label="Ban Reason">
                {{ user.bannedReason }}
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-gi>

      </n-grid>

      <n-empty v-else-if="!loading" description="User not found">
        <template #extra>
          <n-button @click="router.back()">Go Back</n-button>
        </template>
      </n-empty>
    </n-spin>

    <!-- Ban modal -->
    <n-modal
      v-model:show="showBanModal"
      preset="dialog"
      type="warning"
      title="Ban User"
      positive-text="Ban"
      negative-text="Cancel"
      :loading="banning"
      @positive-click="handleBan"
    >
      <n-form-item label="Reason (optional)" style="margin-top: 16px">
        <n-input v-model:value="banReason" placeholder="Reason for ban" type="textarea" :rows="2" />
      </n-form-item>
    </n-modal>

    <!-- Delete confirm modal -->
    <n-modal
      v-model:show="showDeleteModal"
      preset="dialog"
      type="error"
      title="Delete User"
      positive-text="Yes, Delete"
      negative-text="Cancel"
      :loading="deleting"
      @positive-click="handleDelete"
    >
      This action is irreversible. The user account will be permanently removed.
      Are you sure you want to delete <strong>{{ user?.email }}</strong>?
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types/api'
import { usersApi } from '@/api/users'
import { format } from 'date-fns'

type AppPlan = 'free' | 'monthly' | 'annual' | 'lifetime'

const planLabels: Record<AppPlan, string> = {
  free: 'Free', monthly: 'Pro Monthly', annual: 'Pro Annual', lifetime: 'Lifetime',
}
const planTagTypes: Record<AppPlan, 'default' | 'info' | 'success' | 'warning'> = {
  free: 'default', monthly: 'info', annual: 'success', lifetime: 'warning',
}
const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

const router = useRouter()
const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()

const canWriteUsers = computed(() => authStore.permissions.includes('users_write'))
const isSubscribed = computed(() => user.value ? user.value.appPlan !== 'free' : false)

const user = ref<User | null>(null)
const loading = ref(true)
const saving = ref(false)
const resetting = ref(false)
const banning = ref(false)
const deleting = ref(false)
const showBanModal = ref(false)
const showDeleteModal = ref(false)
const banReason = ref('')

const form = ref({ displayName: '', email: '', status: 'active' as 'active' | 'inactive' })

const isDirty = computed(() =>
  user.value !== null && (
    form.value.displayName !== (user.value.displayName ?? '') ||
    form.value.email !== user.value.email ||
    form.value.status !== user.value.status
  )
)

function formatDate(val: string) {
  try { return format(new Date(val), 'dd MMM yyyy, HH:mm') } catch { return '—' }
}

async function load() {
  loading.value = true
  try {
    const res = await usersApi.getUser(route.params.userId as string)
    user.value = res.user as User
    form.value = {
      displayName: res.user.displayName ?? '',
      email: res.user.email,
      status: res.user.status as 'active' | 'inactive',
    }
  } catch {
    message.error('Failed to load user')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!user.value || !isDirty.value) return
  saving.value = true
  try {
    const updates: { displayName?: string; status?: 'active' | 'inactive'; email?: string } = {}
    if (form.value.displayName !== (user.value.displayName ?? '')) updates.displayName = form.value.displayName || undefined
    if (form.value.status !== user.value.status) updates.status = form.value.status
    if (form.value.email !== user.value.email) updates.email = form.value.email.trim().toLowerCase()

    await usersApi.updateUser(user.value.id, updates)
    user.value = {
      ...user.value,
      displayName: form.value.displayName,
      email: form.value.email,
      status: form.value.status,
    }
    message.success('User updated')
  } catch (err: any) {
    message.error(err?.response?.data?.error?.message || 'Failed to update user')
  } finally {
    saving.value = false
  }
}

async function handlePasswordReset() {
  if (!user.value) return
  resetting.value = true
  try {
    await usersApi.sendPasswordReset(user.value.id)
    message.success('Password reset email sent')
  } catch {
    message.error('Failed to send password reset email')
  } finally {
    resetting.value = false
  }
}

async function handleBan() {
  if (!user.value) return
  banning.value = true
  try {
    await usersApi.banUser(user.value.id, banReason.value || undefined)
    user.value = { ...user.value, isBanned: true, bannedReason: banReason.value || undefined }
    banReason.value = ''
    message.success('User banned')
  } catch {
    message.error('Failed to ban user')
  } finally {
    banning.value = false
    showBanModal.value = false
  }
}

async function handleUnban() {
  if (!user.value) return
  banning.value = true
  try {
    await usersApi.unbanUser(user.value.id)
    user.value = { ...user.value, isBanned: false, bannedReason: undefined, bannedAt: undefined }
    message.success('User unbanned')
  } catch {
    message.error('Failed to unban user')
  } finally {
    banning.value = false
  }
}

async function handleDelete() {
  if (!user.value) return
  deleting.value = true
  try {
    await usersApi.deleteUser(user.value.id)
    message.success('User deleted')
    router.push('/users')
  } catch (err: any) {
    message.error(err?.response?.data?.error?.message || 'Failed to delete user')
  } finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}

onMounted(load)
</script>

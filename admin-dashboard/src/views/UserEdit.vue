<template>
  <div>
    <n-page-header style="margin-bottom: 24px" @back="router.push('/users')">
      <template #title>{{ user?.displayName || user?.email || 'User' }}</template>
      <template #subtitle>{{ user?.email }}</template>
      <template #extra>
        <n-space>
          <n-tag v-if="user?.isBanned" type="error" size="small">Banned</n-tag>
          <n-tag v-if="user" :type="planTagTypes[user.appPlan]" size="small">
            {{ planLabels[user.appPlan] }}
          </n-tag>
        </n-space>
      </template>
    </n-page-header>

    <n-spin :show="loading">
      <n-grid v-if="user" :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <!-- Edit form -->
        <n-gi span="2 m:1">
          <n-card title="Edit Profile">
            <n-form :model="form" label-placement="top" :disabled="saving">
              <n-form-item label="Display Name">
                <n-input v-model:value="form.displayName" placeholder="No display name" clearable />
              </n-form-item>
              <n-form-item label="Account Status">
                <n-select v-model:value="form.status" :options="statusOptions" />
              </n-form-item>
              <n-button
                type="primary"
                :loading="saving"
                :disabled="!isDirty"
                @click="save"
              >
                Save Changes
              </n-button>
            </n-form>
          </n-card>
        </n-gi>

        <!-- Account info -->
        <n-gi span="2 m:1">
          <n-card title="Account Info">
            <n-descriptions :column="1" label-placement="left" label-style="width: 130px; color: #999">
              <n-descriptions-item label="Email">{{ user.email }}</n-descriptions-item>
              <n-descriptions-item label="Status">
                <n-tag size="small" :type="user.status === 'active' ? 'success' : 'default'">
                  {{ user.status }}
                </n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="Plan">
                <n-tag size="small" :type="planTagTypes[user.appPlan]">
                  {{ planLabels[user.appPlan] }}
                </n-tag>
              </n-descriptions-item>
              <n-descriptions-item v-if="user.appPlanExpiresAt" label="Plan Expires">
                {{ formatDate(user.appPlanExpiresAt) }}
              </n-descriptions-item>
              <n-descriptions-item label="Joined">{{ formatDate(user.createdAt) }}</n-descriptions-item>
              <n-descriptions-item label="Last Login">
                {{ user.lastLogin ? formatDate(user.lastLogin) : '—' }}
              </n-descriptions-item>
              <n-descriptions-item label="Subscriptions">{{ user.subscriptionCount }}</n-descriptions-item>
              <n-descriptions-item label="Bank Accounts">{{ user.bankConnectionCount }}</n-descriptions-item>
              <n-descriptions-item v-if="user.isBanned" label="Banned At">
                {{ user.bannedAt ? formatDate(user.bannedAt) : '—' }}
              </n-descriptions-item>
              <n-descriptions-item v-if="user.isBanned && user.bannedReason" label="Ban Reason">
                {{ user.bannedReason }}
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-gi>

        <!-- Actions -->
        <n-gi span="2">
          <n-card title="Actions">
            <n-space>
              <n-button :loading="resetting" @click="handlePasswordReset">
                Send Password Reset
              </n-button>
              <n-button :loading="sendingWelcome" @click="handleSendWelcomeEmail">
                Resend Welcome Email
              </n-button>
              <n-button
                v-if="!user.isBanned"
                type="warning"
                :loading="banning"
                @click="showBan = true"
              >
                Ban User
              </n-button>
              <n-button
                v-else
                type="success"
                :loading="banning"
                @click="handleUnban"
              >
                Unban User
              </n-button>
              <n-button type="error" @click="showDelete = true">
                Delete User
              </n-button>
            </n-space>
          </n-card>
        </n-gi>
      </n-grid>

      <n-empty v-else-if="!loading" description="User not found">
        <template #extra>
          <n-button @click="router.push('/users')">Back to Users</n-button>
        </template>
      </n-empty>
    </n-spin>

    <DeleteUserModal
      :show="showDelete"
      :user="userToDelete"
      @cancel="showDelete = false"
      @confirm="handleDelete"
    />

    <BanUserModal
      v-model:show="showBan"
      @confirm="handleBan"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { User } from '@/types/api'
import { usersApi } from '@/api/users'
import { useUserActions } from '@/composables/useUserActions'
import DeleteUserModal from '@/components/DeleteUserModal.vue'
import BanUserModal from '@/components/BanUserModal.vue'
import { format } from 'date-fns'

type AppPlan = 'free' | 'monthly' | 'annual' | 'lifetime'

const planLabels: Record<AppPlan, string> = {
  free: 'Free',
  monthly: 'Pro Monthly',
  annual: 'Pro Annual',
  lifetime: 'Lifetime',
}

const planTagTypes: Record<AppPlan, 'default' | 'info' | 'success' | 'warning'> = {
  free: 'default',
  monthly: 'info',
  annual: 'success',
  lifetime: 'warning',
}

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

const router = useRouter()
const route = useRoute()
const message = useMessage()
const { sendPasswordReset } = useUserActions()

const user = ref<User | null>(null)
const loading = ref(true)
const saving = ref(false)
const resetting = ref(false)
const showDelete = ref(false)
const showBan = ref(false)
const banning = ref(false)
const sendingWelcome = ref(false)

const form = ref({ displayName: '', status: 'active' as 'active' | 'inactive' })

const isDirty = computed(() =>
  user.value !== null &&
  (form.value.displayName !== (user.value.displayName ?? '') ||
   form.value.status !== user.value.status)
)

const userToDelete = computed(() =>
  user.value ? { id: user.value.id, email: user.value.email } : null
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
    await usersApi.updateUser(user.value.id, {
      displayName: form.value.displayName || undefined,
      status: form.value.status,
    })
    user.value = { ...user.value, displayName: form.value.displayName, status: form.value.status }
    message.success('User updated')
  } catch {
    message.error('Failed to update user')
  } finally {
    saving.value = false
  }
}

async function handleSendWelcomeEmail() {
  if (!user.value) return
  sendingWelcome.value = true
  try {
    await usersApi.sendWelcomeEmail(user.value.id)
    message.success(`Welcome email sent to ${user.value.email}`)
  } catch (err: any) {
    message.error(err?.response?.data?.error?.message || 'Failed to send welcome email')
  } finally {
    sendingWelcome.value = false
  }
}

async function handleBan(reason: string) {
  if (!user.value) return
  banning.value = true
  showBan.value = false
  try {
    await usersApi.banUser(user.value.id, reason || undefined)
    user.value = { ...user.value, isBanned: true, bannedAt: new Date().toISOString(), bannedReason: reason || null, status: 'inactive' }
    message.success('User banned')
  } catch {
    message.error('Failed to ban user')
  } finally {
    banning.value = false
  }
}

async function handleUnban() {
  if (!user.value) return
  banning.value = true
  try {
    await usersApi.unbanUser(user.value.id)
    user.value = { ...user.value, isBanned: false, bannedAt: null, bannedReason: null, status: 'active' }
    message.success('User unbanned')
  } catch {
    message.error('Failed to unban user')
  } finally {
    banning.value = false
  }
}

async function handlePasswordReset() {
  if (!user.value) return
  resetting.value = true
  await sendPasswordReset(user.value.id, user.value.email)
  resetting.value = false
}

async function handleDelete() {
  if (!user.value) return
  try {
    await usersApi.deleteUser(user.value.id)
    message.success('User deleted')
    router.push('/users')
  } catch {
    message.error('Failed to delete user')
  } finally {
    showDelete.value = false
  }
}

onMounted(load)
</script>

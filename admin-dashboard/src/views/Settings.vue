<template>
  <div>
    <n-grid :cols="1" :y-gap="16">

      <!-- Update Profile -->
      <n-gi>
        <n-card title="Profile">
          <n-form :model="profileForm" label-placement="top" :disabled="profileSaving" style="max-width: 420px">
            <n-form-item label="Display Name">
              <n-input v-model:value="profileForm.displayName" placeholder="Your name" clearable />
            </n-form-item>
            <n-form-item label="Email">
              <n-input :value="profileEmail" disabled />
            </n-form-item>
            <n-button type="primary" :loading="profileSaving" :disabled="!profileDirty" @click="saveProfile">
              Save Profile
            </n-button>
          </n-form>
        </n-card>
      </n-gi>

      <!-- Change Password -->
      <n-gi>
        <n-card title="Change Password">
          <n-alert v-if="passwordError" type="error" :show-icon="true" style="margin-bottom: 16px" closable @close="passwordError = ''">
            {{ passwordError }}
          </n-alert>
          <n-form :model="passwordForm" label-placement="top" :disabled="passwordSaving" style="max-width: 420px">
            <n-form-item label="Current Password">
              <n-input
                v-model:value="passwordForm.current"
                type="password"
                placeholder="Enter current password"
                show-password-on="click"
              />
            </n-form-item>
            <n-form-item label="New Password">
              <n-input
                v-model:value="passwordForm.next"
                type="password"
                placeholder="At least 8 characters"
                show-password-on="click"
              />
            </n-form-item>
            <n-form-item label="Confirm New Password">
              <n-input
                v-model:value="passwordForm.confirm"
                type="password"
                placeholder="Repeat new password"
                show-password-on="click"
              />
            </n-form-item>
            <n-button
              type="primary"
              :loading="passwordSaving"
              :disabled="!passwordForm.current || !passwordForm.next || !passwordForm.confirm"
              @click="changePassword"
            >
              Change Password
            </n-button>
          </n-form>
        </n-card>
      </n-gi>

      <!-- Change Email -->
      <n-gi>
        <n-card title="Change Email">
          <n-alert v-if="emailError" type="error" :show-icon="true" style="margin-bottom: 16px" closable @close="emailError = ''">
            {{ emailError }}
          </n-alert>
          <n-form :model="emailForm" label-placement="top" :disabled="emailSaving" style="max-width: 420px">
            <n-form-item label="Current Password">
              <n-input
                v-model:value="emailForm.password"
                type="password"
                placeholder="Confirm your current password"
                show-password-on="click"
              />
            </n-form-item>
            <n-form-item label="New Email Address">
              <n-input
                v-model:value="emailForm.newEmail"
                type="text"
                placeholder="new@example.com"
              />
            </n-form-item>
            <n-button
              type="primary"
              :loading="emailSaving"
              :disabled="!emailForm.password || !emailForm.newEmail"
              @click="changeEmail"
            >
              Change Email
            </n-button>
          </n-form>
        </n-card>
      </n-gi>

      <!-- Activity Logs -->
      <n-gi>
        <n-card title="Activity Logs">
          <template #header-extra>
            <n-button size="small" :loading="logsLoading" @click="loadLogs">Refresh</n-button>
          </template>
          <n-spin :show="logsLoading">
            <n-data-table
              v-if="logs.length > 0"
              :columns="logColumns"
              :data="logs"
              size="small"
              :pagination="{ pageSize: 20 }"
              striped
            />
            <n-empty v-else-if="!logsLoading" description="No activity logs yet" size="small" />
          </n-spin>
        </n-card>
      </n-gi>

    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useMessage, NTag, NEllipsis } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { format } from 'date-fns'
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateEmail,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const message = useMessage()
const authStore = useAuthStore()

const profileForm = ref({ displayName: '' })
const profileSaving = ref(false)
const originalDisplayName = ref('')
const profileEmail = ref('')

onMounted(async () => {
  try {
    const { data } = await apiClient.get<any>('/settings/profile')
    const displayName: string = data.data?.displayName || ''
    const email: string = data.data?.email || authStore.user?.email || ''
    profileForm.value.displayName = displayName
    originalDisplayName.value = displayName
    profileEmail.value = email
  } catch {
    // non-critical — fall back to token email
    profileEmail.value = authStore.user?.email || ''
  }
  loadLogs()
})

const profileDirty = computed(() => profileForm.value.displayName !== originalDisplayName.value)

async function saveProfile() {
  profileSaving.value = true
  try {
    await apiClient.patch('/settings/profile', { displayName: profileForm.value.displayName.trim() })
    originalDisplayName.value = profileForm.value.displayName.trim()
    message.success('Profile updated')
  } catch (err: any) {
    message.error(err?.response?.data?.error?.message || 'Failed to update profile')
  } finally {
    profileSaving.value = false
  }
}

const passwordForm = ref({ current: '', next: '', confirm: '' })
const passwordSaving = ref(false)
const passwordError = ref('')

async function changePassword() {
  passwordError.value = ''
  if (passwordForm.value.next.length < 8) {
    passwordError.value = 'New password must be at least 8 characters'
    return
  }
  if (passwordForm.value.next !== passwordForm.value.confirm) {
    passwordError.value = 'Passwords do not match'
    return
  }

  passwordSaving.value = true
  try {
    const firebaseUser = auth.currentUser
    if (!firebaseUser?.email) throw new Error('Not authenticated')

    const credential = EmailAuthProvider.credential(firebaseUser.email, passwordForm.value.current)
    await reauthenticateWithCredential(firebaseUser, credential)
    await updatePassword(firebaseUser, passwordForm.value.next)

    apiClient.post('/settings/notify-password-changed').catch(() => {})

    passwordForm.value = { current: '', next: '', confirm: '' }
    message.success('Password changed — a confirmation email has been sent')
  } catch (err: any) {
    const code = err?.code || ''
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      passwordError.value = 'Current password is incorrect'
    } else if (code === 'auth/too-many-requests') {
      passwordError.value = 'Too many attempts. Please try again later'
    } else {
      passwordError.value = err?.message || 'Failed to change password'
    }
  } finally {
    passwordSaving.value = false
  }
}

const emailForm = ref({ password: '', newEmail: '' })
const emailSaving = ref(false)
const emailError = ref('')

interface ActivityLog {
  id: string
  adminEmail: string
  action: string
  targetUserId?: string
  details?: Record<string, any>
  timestamp: string
  ipAddress?: string
}

const logs = ref<ActivityLog[]>([])
const logsLoading = ref(false)

const ACTION_LABELS: Record<string, string> = {
  CREATE_USER: 'Created User',
  UPDATE_USER: 'Updated User',
  BAN_USER: 'Banned User',
  UNBAN_USER: 'Unbanned User',
  DELETE_USER: 'Deleted User',
  PASSWORD_RESET: 'Reset User Password',
  CANCEL_SUBSCRIPTION: 'Cancelled Subscription',
  SEND_WELCOME_EMAIL: 'Sent Welcome Email',
  CREATE_ADMIN: 'Created Admin',
  UPDATE_ADMIN: 'Updated Admin',
  DELETE_ADMIN: 'Deleted Admin',
  UPDATE_PROFILE: 'Updated Own Profile',
  CHANGE_PASSWORD: 'Changed Own Password',
  CHANGE_EMAIL: 'Changed Own Email',
  VIEW_USER_DETAILS: 'Viewed User',
  VIEW_USER_ACTIVITIES: 'Viewed User Activity',
}

const WRITE_ACTIONS = new Set([
  'CREATE_USER', 'UPDATE_USER', 'BAN_USER', 'UNBAN_USER', 'DELETE_USER',
  'PASSWORD_RESET', 'CANCEL_SUBSCRIPTION', 'CREATE_ADMIN', 'UPDATE_ADMIN',
  'DELETE_ADMIN', 'UPDATE_PROFILE', 'CHANGE_PASSWORD', 'CHANGE_EMAIL',
])

const logColumns: DataTableColumns<ActivityLog> = [
  {
    title: 'Time',
    key: 'timestamp',
    width: 160,
    render: (row: ActivityLog) => {
      try { return format(new Date(row.timestamp), 'dd MMM yyyy, HH:mm') } catch { return row.timestamp }
    },
  },
  {
    title: 'Admin',
    key: 'adminEmail',
    width: 200,
    render: (row: ActivityLog) => h(NEllipsis, { style: 'max-width: 190px' }, { default: () => row.adminEmail }),
  },
  {
    title: 'Action',
    key: 'action',
    width: 200,
    render: (row: ActivityLog) =>
      h(NTag, {
        size: 'small',
        type: WRITE_ACTIONS.has(row.action) ? 'warning' : 'default',
        bordered: false,
      }, { default: () => ACTION_LABELS[row.action] || row.action }),
  },
  {
    title: 'Target',
    key: 'targetUserId',
    render: (row: ActivityLog) => row.targetUserId
      ? h(NEllipsis, { style: 'max-width: 180px' }, { default: () => row.targetUserId! })
      : h('span', { style: 'color: #666' }, '—'),
  },
]

async function loadLogs() {
  logsLoading.value = true
  try {
    const { data } = await apiClient.get<any>('/activity-logs', { limit: 100 })
    logs.value = data.data?.logs || []
  } catch (err: any) {
    message.error('Failed to load activity logs')
  } finally {
    logsLoading.value = false
  }
}

async function changeEmail() {
  emailError.value = ''
  const newEmail = emailForm.value.newEmail.trim().toLowerCase()
  if (!newEmail.includes('@')) {
    emailError.value = 'Enter a valid email address'
    return
  }
  if (newEmail === authStore.user?.email) {
    emailError.value = 'New email is the same as the current one'
    return
  }

  emailSaving.value = true
  try {
    const firebaseUser = auth.currentUser
    if (!firebaseUser?.email) throw new Error('Not authenticated')

    const credential = EmailAuthProvider.credential(firebaseUser.email, emailForm.value.password)
    await reauthenticateWithCredential(firebaseUser, credential)
    await updateEmail(firebaseUser, newEmail)

    // Update Firestore record + send notifications
    await apiClient.post('/settings/change-email', { newEmail })

    authStore.patchUser({ email: newEmail })
    profileEmail.value = newEmail
    emailForm.value = { password: '', newEmail: '' }
    message.success('Email changed — confirmation emails have been sent to both addresses')
  } catch (err: any) {
    const code = err?.code || ''
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      emailError.value = 'Current password is incorrect'
    } else if (code === 'auth/email-already-in-use') {
      emailError.value = 'That email address is already in use'
    } else if (code === 'auth/too-many-requests') {
      emailError.value = 'Too many attempts. Please try again later'
    } else {
      emailError.value = err?.message || 'Failed to change email'
    }
  } finally {
    emailSaving.value = false
  }
}
</script>

<template>
  <div>
    <n-page-header style="margin-bottom: 24px" @back="router.back()">
      <template #title>{{ admin?.displayName || admin?.email || 'Admin' }}</template>
      <template #subtitle>{{ admin?.email }}</template>
      <template #extra>
        <n-space>
          <n-tag :type="admin?.isActive ? 'success' : 'default'" size="small">
            {{ admin?.isActive ? 'Active' : 'Inactive' }}
          </n-tag>
          <n-tag v-if="admin?.id === authStore.user?.id" type="info" size="small">You</n-tag>
        </n-space>
      </template>
    </n-page-header>

    <n-spin :show="loading">
      <n-grid v-if="admin" :cols="1" :y-gap="16">

        <!-- Edit Profile -->
        <n-gi>
          <n-card title="Admin Profile">
            <n-alert v-if="saveError" type="error" :show-icon="true" style="margin-bottom: 16px" closable @close="saveError = ''">
              {{ saveError }}
            </n-alert>
            <n-form :model="form" label-placement="top" :disabled="saving" style="max-width: 480px">
              <n-form-item label="Email">
                <n-input v-model:value="form.email" placeholder="admin@example.com" />
              </n-form-item>
              <n-form-item label="Display Name">
                <n-input v-model:value="form.displayName" placeholder="Full name" clearable />
              </n-form-item>

              <n-form-item label="Permissions">
                <div style="width: 100%">
                  <div style="display: grid; grid-template-columns: 160px 80px 80px; gap: 8px; margin-bottom: 6px; font-size: 12px; color: #999; padding: 0 4px">
                    <span>Section</span>
                    <span style="text-align: center">Read</span>
                    <span style="text-align: center">Write</span>
                  </div>
                  <div v-for="section in permSections" :key="section.key"
                    style="display: grid; grid-template-columns: 160px 80px 80px; gap: 8px; align-items: center; padding: 6px 4px; border-radius: 4px">
                    <span style="font-size: 14px">{{ section.label }}</span>
                    <template v-if="section.key !== 'super_admin'">
                      <div style="text-align: center">
                        <n-checkbox
                          :checked="form.permissions.includes(section.key + '_read') || form.permissions.includes(section.key + '_write')"
                          :disabled="form.permissions.includes(section.key + '_write')"
                          @update:checked="(v: boolean) => togglePerm(section.key + '_read', v)"
                        />
                      </div>
                      <div style="text-align: center">
                        <n-checkbox
                          :checked="form.permissions.includes(section.key + '_write')"
                          @update:checked="(v: boolean) => togglePerm(section.key + '_write', v)"
                        />
                      </div>
                    </template>
                    <template v-else>
                      <div style="text-align: center; grid-column: 2 / 4">
                        <n-checkbox
                          :checked="form.permissions.includes('super_admin')"
                          @update:checked="(v: boolean) => togglePerm('super_admin', v)"
                        />
                      </div>
                    </template>
                  </div>
                </div>
              </n-form-item>

              <n-form-item label="Status">
                <n-switch v-model:value="form.isActive">
                  <template #checked>Active</template>
                  <template #unchecked>Inactive</template>
                </n-switch>
              </n-form-item>

              <n-button type="primary" :loading="saving" :disabled="!isDirty" @click="save">
                Save Changes
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
              <n-empty v-else-if="!logsLoading" description="No activity logs for this admin" size="small" />
            </n-spin>
          </n-card>
        </n-gi>

      </n-grid>

      <n-empty v-else-if="!loading" description="Admin not found">
        <template #extra>
          <n-button @click="router.back()">Go Back</n-button>
        </template>
      </n-empty>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, NTag, NEllipsis } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { format } from 'date-fns'
import { superAdminsApi, type SuperAdmin } from '@/api/superAdmins'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()

const admin = ref<SuperAdmin | null>(null)
const loading = ref(true)
const saving = ref(false)
const saveError = ref('')

const form = ref({
  email: '',
  displayName: '',
  permissions: [] as string[],
  isActive: true,
})

const permSections = [
  { key: 'users', label: 'Users' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'super_admin', label: 'Super Admin' },
]

const isDirty = computed(() => {
  if (!admin.value) return false
  return (
    form.value.email !== admin.value.email ||
    form.value.displayName !== (admin.value.displayName ?? '') ||
    form.value.isActive !== admin.value.isActive ||
    JSON.stringify([...form.value.permissions].sort()) !== JSON.stringify([...admin.value.permissions].sort())
  )
})

function togglePerm(perm: string, checked: boolean) {
  const perms = new Set(form.value.permissions)
  if (checked) {
    perms.add(perm)
    if (perm === 'users_write') perms.delete('users_read')
    if (perm === 'subscriptions_write') perms.delete('subscriptions_read')
  } else {
    perms.delete(perm)
  }
  form.value.permissions = [...perms]
}

async function load() {
  loading.value = true
  try {
    const data = await superAdminsApi.get(route.params.adminId as string)
    admin.value = data
    form.value = {
      email: data.email,
      displayName: data.displayName ?? '',
      permissions: [...data.permissions],
      isActive: data.isActive,
    }
  } catch {
    message.error('Failed to load admin')
  } finally {
    loading.value = false
  }
  loadLogs()
}

async function save() {
  if (!admin.value || !isDirty.value) return
  saveError.value = ''
  saving.value = true
  try {
    const updated = await superAdminsApi.update(admin.value.id, {
      email: form.value.email,
      displayName: form.value.displayName || undefined,
      permissions: form.value.permissions,
      isActive: form.value.isActive,
    })
    admin.value = updated
    form.value = {
      email: updated.email,
      displayName: updated.displayName ?? '',
      permissions: [...updated.permissions],
      isActive: updated.isActive,
    }
    message.success('Admin updated')
  } catch (err: any) {
    saveError.value = err?.response?.data?.error?.message || err?.message || 'Failed to save changes'
  } finally {
    saving.value = false
  }
}

interface ActivityLog {
  id: string
  adminEmail: string
  action: string
  targetUserId?: string
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
    title: 'Action',
    key: 'action',
    width: 220,
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
      ? h(NEllipsis, { style: 'max-width: 220px' }, { default: () => row.targetUserId! })
      : h('span', { style: 'color: #666' }, '—'),
  },
  {
    title: 'IP',
    key: 'ipAddress',
    width: 130,
    render: (row: ActivityLog) => row.ipAddress || '—',
  },
]

async function loadLogs() {
  if (!admin.value) return
  logsLoading.value = true
  try {
    const { data } = await apiClient.get<any>('/activity-logs', {
      filterAdminUid: admin.value.id,
      limit: 100,
    })
    logs.value = data.data?.logs || []
  } catch {
  } finally {
    logsLoading.value = false
  }
}

onMounted(load)
</script>

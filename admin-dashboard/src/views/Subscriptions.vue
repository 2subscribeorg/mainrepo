<template>
  <div>
    <n-card title="Subscriptions">
      <template #header-extra>
        <n-space>
          <UserSearch
            v-model="searchQuery"
            @search="handleSearch"
            @clear="handleClearSearch"
            style="width: 300px"
          />
          <n-button :disabled="subscribedUsers.length === 0" @click="exportCSV">
            Export CSV
          </n-button>
        </n-space>
      </template>

      <n-data-table
        :columns="columns"
        :data="subscribedUsers"
        :loading="loading"
        :pagination="{ pageSize: 20 }"
        :row-key="rowKey"
        size="small"
        striped
      />
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
import { ref, h, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NButton, NSpace, NEllipsis, NIcon, NTooltip } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { Edit, Key, TrashX } from '@vicons/tabler'
import type { User } from '@/types/api'
import { useUserActions } from '@/composables/useUserActions'
import { useUserManagement } from '@/composables/useUserManagement'
import DeleteUserModal from '@/components/DeleteUserModal.vue'
import UserSearch from '@/components/UserSearch.vue'
import { format } from 'date-fns'

const router = useRouter()

const resettingUserId = ref<string | null>(null)
const deletingUserId = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const userToDelete = ref<{ id: string; email: string } | null>(null)

const { isDeleting, isResetting, deleteUser, sendPasswordReset } = useUserActions()
const { users, loading, searchQuery, fetchUsers, handleSearch, handleClearSearch } = useUserManagement()

const subscribedUsers = computed(() => users.value.filter(u => u.appPlan !== 'free'))

const rowKey = (row: User) => row.id

type AppPlan = 'free' | 'monthly' | 'annual' | 'lifetime'

const planLabels: Record<AppPlan, string> = {
  free: 'Free',
  monthly: 'Pro Monthly',
  annual: 'Pro Annual',
  lifetime: 'Lifetime',
}

const planOrder: Record<AppPlan, number> = {
  free: 0,
  monthly: 1,
  annual: 2,
  lifetime: 3,
}

const planTagTypes: Record<AppPlan, 'default' | 'info' | 'success' | 'warning'> = {
  free: 'default',
  monthly: 'info',
  annual: 'success',
  lifetime: 'warning',
}

const columns: DataTableColumns<User> = [
  {
    title: 'Name',
    key: 'displayName',
    width: 150,
    sorter: (a, b) => (a.displayName || '').localeCompare(b.displayName || ''),
    render: (row) => h(NEllipsis, { style: 'max-width: 140px' }, { default: () => row.displayName || '—' }),
  },
  {
    title: 'Email',
    key: 'email',
    width: 220,
    sorter: (a, b) => a.email.localeCompare(b.email),
    render: (row) => h(NEllipsis, { style: 'max-width: 210px' }, { default: () => row.email }),
  },
  {
    title: 'Plan',
    key: 'appPlan',
    width: 130,
    sorter: (a, b) => planOrder[a.appPlan] - planOrder[b.appPlan],
    filterOptions: [
      { label: 'Pro Monthly', value: 'monthly' },
      { label: 'Pro Annual', value: 'annual' },
      { label: 'Lifetime', value: 'lifetime' },
    ],
    filterMultiple: true,
    filter: (value, row) => row.appPlan === value,
    render: (row) =>
      h(
        NTag,
        { size: 'small', type: planTagTypes[row.appPlan], bordered: true },
        { default: () => planLabels[row.appPlan] }
      ),
  },
  {
    title: 'Status',
    key: 'status',
    width: 110,
    sorter: (a, b) => a.status.localeCompare(b.status),
    render: (row) =>
      h(NSpace, { size: 4 }, {
        default: () => [
          row.isBanned
            ? h(NTag, { size: 'small', type: 'error' }, { default: () => 'Banned' })
            : h(NTag, { size: 'small', type: row.status === 'active' ? 'success' : 'default' }, { default: () => row.status }),
        ],
      }),
  },
  {
    title: 'Subs',
    key: 'subscriptionCount',
    width: 70,
    sorter: (a, b) => a.subscriptionCount - b.subscriptionCount,
  },
  {
    title: 'Bank',
    key: 'bankConnectionCount',
    width: 70,
    sorter: (a, b) => a.bankConnectionCount - b.bankConnectionCount,
  },
  {
    title: 'Expires',
    key: 'appPlanExpiresAt',
    width: 115,
    sorter: (a, b) => {
      const ta = a.appPlanExpiresAt ? new Date(a.appPlanExpiresAt).getTime() : 0
      const tb = b.appPlanExpiresAt ? new Date(b.appPlanExpiresAt).getTime() : 0
      return ta - tb
    },
    render: (row) => {
      if (!row.appPlanExpiresAt) return row.appPlan === 'lifetime' ? '∞' : '—'
      try { return format(new Date(row.appPlanExpiresAt), 'dd MMM yyyy') } catch { return '—' }
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 110,
    render: (row) =>
      h(NSpace, { size: 4 }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () =>
              h(NButton, { size: 'small', quaternary: true, onClick: () => router.push(`/users/${row.id}`) },
                { icon: () => h(NIcon, null, { default: () => h(Edit) }) }),
            default: () => 'Edit',
          }),
          h(NTooltip, null, {
            trigger: () =>
              h(NButton, {
                size: 'small', quaternary: true,
                loading: isResetting.value && resettingUserId.value === row.id,
                onClick: () => handlePasswordReset(row.id, row.email),
              }, { icon: () => h(NIcon, null, { default: () => h(Key) }) }),
            default: () => 'Reset Password',
          }),
          h(NTooltip, null, {
            trigger: () =>
              h(NButton, {
                size: 'small', quaternary: true, type: 'error',
                loading: isDeleting.value && deletingUserId.value === row.id,
                onClick: () => showDeleteModal(row.id, row.email),
              }, { icon: () => h(NIcon, null, { default: () => h(TrashX) }) }),
            default: () => 'Delete',
          }),
        ],
      }),
  },
]

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
  if (success) await fetchUsers()
  deletingUserId.value = null
  showDeleteConfirm.value = false
  userToDelete.value = null
}

function handleDeleteCancel(): void {
  showDeleteConfirm.value = false
  userToDelete.value = null
}

function exportCSV(): void {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const headers: (keyof User)[] = ['id', 'displayName', 'email', 'status', 'appPlan', 'appPlanExpiresAt', 'subscriptionCount', 'bankConnectionCount', 'createdAt']
  const rows = subscribedUsers.value.map((u) => headers.map(k => escape(u[k])).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `subscriptions_export_${timestamp}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  fetchUsers()
})
</script>

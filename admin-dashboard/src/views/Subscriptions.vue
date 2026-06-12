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
          <n-button-group>
            <n-dropdown :options="filterOptions" @select="handleFilterSelect" trigger="click">
              <n-button>
                <template #icon><n-icon><FilterIcon /></n-icon></template>
                {{ activeFilter ? planLabels[activeFilter] : 'Filter' }}
              </n-button>
            </n-dropdown>
            <n-button v-if="activeFilter" @click="activeFilter = null">
              <template #icon><n-icon><CloseIcon /></n-icon></template>
            </n-button>
          </n-button-group>
          <n-button :disabled="filteredUsers.length === 0" @click="exportCSV">
            Export CSV
          </n-button>
        </n-space>
      </template>

      <n-data-table
        :columns="columns"
        :data="filteredUsers"
        :loading="loading"
        :pagination="{ pageSize: 20 }"
        :row-key="rowKey"
        size="small"
        striped
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, h, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NButton, NButtonGroup, NSpace, NEllipsis, NIcon, NTooltip } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { Eye, Filter as FilterIcon, X as CloseIcon } from '@vicons/tabler'
import type { User } from '@/types/api'
import { useUserManagement } from '@/composables/useUserManagement'
import UserSearch from '@/components/UserSearch.vue'
import { format } from 'date-fns'

const router = useRouter()
const { users, loading, searchQuery, fetchUsers, handleSearch, handleClearSearch } = useUserManagement()

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

const activeFilter = ref<AppPlan | null>(null)

const filterOptions = [
  { label: 'Pro Monthly', key: 'monthly' },
  { label: 'Pro Annual', key: 'annual' },
  { label: 'Lifetime', key: 'lifetime' },
]

function handleFilterSelect(key: string) {
  activeFilter.value = key as AppPlan
}

const subscribedUsers = computed(() => users.value.filter(u => u.appPlan !== 'free'))
const filteredUsers = computed(() =>
  activeFilter.value ? subscribedUsers.value.filter(u => u.appPlan === activeFilter.value) : subscribedUsers.value
)

const rowKey = (row: User) => row.id

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
    sorter: (a, b) => (a.appPlan || '').localeCompare(b.appPlan || ''),
    render: (row) =>
      h(NTag, { size: 'small', type: planTagTypes[row.appPlan], bordered: true }, { default: () => planLabels[row.appPlan] }),
  },
  {
    title: 'Status',
    key: 'status',
    width: 110,
    render: (row) =>
      row.isBanned
        ? h(NTag, { size: 'small', type: 'error' }, { default: () => 'Banned' })
        : h(NTag, { size: 'small', type: row.status === 'active' ? 'success' : 'default' }, { default: () => row.status }),
  },
  {
    title: 'Subs',
    key: 'subscriptionCount',
    width: 70,
    sorter: (a, b) => a.subscriptionCount - b.subscriptionCount,
  },
  {
    title: 'Expires',
    key: 'appPlanExpiresAt',
    width: 120,
    defaultSortOrder: 'descend',
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
    width: 70,
    render: (row) =>
      h(NTooltip, null, {
        trigger: () =>
          h(NButton, { size: 'small', quaternary: true, onClick: () => router.push(`/subscriptions/${row.id}`) },
            { icon: () => h(NIcon, null, { default: () => h(Eye) }) }),
        default: () => 'View',
      }),
  },
]

function exportCSV(): void {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const headers: (keyof User)[] = ['id', 'displayName', 'email', 'status', 'appPlan', 'appPlanExpiresAt', 'subscriptionCount', 'createdAt']
  const rows = filteredUsers.value.map((u) => headers.map(k => escape(u[k])).join(','))
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

onMounted(fetchUsers)
</script>

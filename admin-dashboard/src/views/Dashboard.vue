<template>
  <div>
    <div class="welcome">
      <h2>Welcome back, {{ userName }} 👋</h2>
      <p style="color: #aaa; margin-top: 4px">Here's what's happening in 2Subscribe today.</p>
    </div>

    <!-- Stat cards -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" style="margin-top: 24px" responsive="screen" :collapsed-cols="2">
      <n-gi>
        <n-card>
          <n-skeleton v-if="statsLoading" text :repeat="2" />
          <n-statistic v-else label="Total Users" :value="stats.totalUsers">
            <template #prefix><n-icon color="#63e2b7"><UsersIcon /></n-icon></template>
          </n-statistic>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-skeleton v-if="statsLoading" text :repeat="2" />
          <n-statistic v-else label="Active Users" :value="stats.activeUsers">
            <template #prefix><n-icon color="#18a058"><CheckIcon /></n-icon></template>
          </n-statistic>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-skeleton v-if="statsLoading" text :repeat="2" />
          <n-statistic v-else label="With Subscriptions" :value="stats.usersWithSubscriptions">
            <template #prefix><n-icon color="#f0a020"><StarIcon /></n-icon></template>
          </n-statistic>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-skeleton v-if="statsLoading" text :repeat="2" />
          <n-statistic v-else label="Bank Connected" :value="stats.usersWithBank">
            <template #prefix><n-icon color="#2080f0"><BankIcon /></n-icon></template>
          </n-statistic>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Recent users -->
    <n-card title="Recent Users" style="margin-top: 24px">
      <template #header-extra>
        <n-button text @click="router.push({ name: 'Users' })">View all →</n-button>
      </template>

      <div v-if="usersLoading" style="padding: 8px 0">
        <n-skeleton v-for="i in 5" :key="i" text style="margin-bottom: 14px" />
      </div>

      <n-alert v-else-if="usersError" type="error" :show-icon="true">{{ usersError }}</n-alert>

      <template v-else>
        <div
          v-for="user in recentUsers"
          :key="user.id"
          class="user-row"
          @click="router.push(`/users/${user.id}`)"
        >
          <div class="user-info">
            <div class="user-name">{{ user.displayName || user.email }}</div>
            <div class="user-email" v-if="user.displayName">{{ user.email }}</div>
            <div class="user-meta">Joined {{ formatDate(user.createdAt) }}</div>
          </div>
          <n-space size="small" align="center">
            <n-tag :type="planTagTypes[user.appPlan] || 'default'" size="small">
              {{ planLabels[user.appPlan] || user.appPlan }}
            </n-tag>
            <n-tag :type="user.status === 'active' ? 'success' : 'default'" size="small">
              {{ user.status }}
            </n-tag>
            <n-tag v-if="user.subscriptionCount > 0" type="info" size="small">
              {{ user.subscriptionCount }} sub{{ user.subscriptionCount !== 1 ? 's' : '' }}
            </n-tag>
          </n-space>
        </div>

        <div v-if="recentUsers.length === 0" style="color: #aaa; padding: 16px 0; text-align: center">
          No users found.
        </div>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Users as UsersIcon, Check as CheckIcon, Star as StarIcon, BuildingBank as BankIcon } from '@vicons/tabler'
import { useAuthStore } from '@/stores/auth'
import { usersApi, type DashboardStats } from '@/api/users'
import { format } from 'date-fns'

const router = useRouter()
const authStore = useAuthStore()

const statsLoading = ref(true)
const usersLoading = ref(true)
const usersError = ref('')
const stats = ref<DashboardStats>({ totalUsers: 0, activeUsers: 0, usersWithSubscriptions: 0, usersWithBank: 0 })
const recentUsers = ref<any[]>([])

const userName = computed(() => authStore.user?.displayName || authStore.user?.email?.split('@')[0] || 'Admin')

const planLabels: Record<string, string> = {
  free: 'Free',
  monthly: 'Pro Monthly',
  annual: 'Pro Annual',
  lifetime: 'Lifetime',
}

const planTagTypes: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  free: 'default',
  monthly: 'info',
  annual: 'success',
  lifetime: 'warning',
}

function formatDate(dateStr: string) {
  try { return format(new Date(dateStr), 'MMM d, yyyy') } catch { return '—' }
}

async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await usersApi.getStats()
  } catch {
    // keep zeros, non-critical
  } finally {
    statsLoading.value = false
  }
}

async function loadRecentUsers() {
  usersLoading.value = true
  usersError.value = ''
  try {
    const res = await usersApi.getRecentUsers(8)
    recentUsers.value = res.users
  } catch (err: any) {
    usersError.value = err?.response?.data?.error?.message || 'Failed to load recent users'
  } finally {
    usersLoading.value = false
  }
}

onMounted(() => {
  loadStats()
  loadRecentUsers()
})
</script>

<style scoped>
.welcome h2 {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.user-row:last-child {
  border-bottom: none;
}

.user-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name {
  font-weight: 500;
  font-size: 14px;
}

.user-email {
  font-size: 12px;
  color: #aaa;
}

.user-meta {
  font-size: 12px;
  color: #777;
}
</style>

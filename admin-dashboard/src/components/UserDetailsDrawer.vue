<template>
  <n-spin :show="loading">
    <n-space vertical :size="16">
      <n-card title="User Information">
        <n-descriptions :column="1">
          <n-descriptions-item label="Email">{{ user?.email }}</n-descriptions-item>
          <n-descriptions-item label="Name">{{ user?.displayName || '-' }}</n-descriptions-item>
          <n-descriptions-item label="Status">
            <n-tag :type="user?.status === 'active' ? 'success' : 'default'">
              {{ user?.status }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="Created">
            {{ formatDate(user?.createdAt) }}
          </n-descriptions-item>
          <n-descriptions-item label="Last Login">
            {{ user?.lastLogin ? formatDate(user.lastLogin) : 'Never' }}
          </n-descriptions-item>
        </n-descriptions>
      </n-card>

      <n-card title="Statistics">
        <n-descriptions :column="1">
          <n-descriptions-item label="Subscriptions">
            {{ stats?.subscriptionCount || 0 }}
          </n-descriptions-item>
          <n-descriptions-item label="Bank Connections">
            {{ stats?.bankConnectionCount || 0 }}
          </n-descriptions-item>
          <n-descriptions-item label="Total Spend">
            £{{ stats?.totalSpend || 0 }}
          </n-descriptions-item>
        </n-descriptions>
      </n-card>

      <n-card title="Recent Activity">
        <ActivityTimeline :user-id="userId" />
      </n-card>
    </n-space>
  </n-spin>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usersApi } from '@/api/users'
import ActivityTimeline from './ActivityTimeline.vue'
import type { User } from '@/types/api'

const props = defineProps<{
  userId: string
}>()

const loading = ref(false)
const user = ref<User | null>(null)
const stats = ref<any>(null)

function formatDate(date?: string): string {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

async function fetchUserDetails(): Promise<void> {
  loading.value = true
  try {
    const data = await usersApi.getUser(props.userId)
    user.value = data.user
    stats.value = data.stats
  } catch (error) {
    console.error('Failed to fetch user details:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUserDetails()
})
</script>

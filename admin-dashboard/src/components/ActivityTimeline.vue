<template>
  <n-spin :show="loading">
    <n-timeline v-if="activities.length > 0">
      <n-timeline-item
        v-for="activity in activities"
        :key="activity.id"
        :time="formatTime(activity.timestamp)"
      >
        <template #header>
          <n-tag size="small">{{ activity.type }}</n-tag>
        </template>
        {{ activity.description }}
      </n-timeline-item>
    </n-timeline>
    <n-empty v-else description="No activities found" />
  </n-spin>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { usersApi } from '@/api/users'
import type { Activity } from '@/types/api'

const props = defineProps<{
  userId: string
}>()

const loading = ref(false)
const activities = ref<Activity[]>([])

function formatTime(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
}

async function fetchActivities(): Promise<void> {
  loading.value = true
  try {
    const data = await usersApi.getUserActivities(props.userId, { limit: 20 })
    activities.value = data.activities
  } catch (error) {
    console.error('Failed to fetch activities:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchActivities()
})
</script>

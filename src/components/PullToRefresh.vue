<template>
  <Vue3PullRefresh
    :loading="loading"
    @refresh="handleRefresh"
    :pull-down-threshold="pullDownThreshold"
    :start-threshold="startThreshold"
  >
    <slot></slot>
  </Vue3PullRefresh>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Vue3PullToRefresh } from '@amirafa/vue3-pull-to-refresh'

interface Props {
  onRefresh: () => Promise<void> | void
  pullDownThreshold?: number
  startThreshold?: number
}

const props = withDefaults(defineProps<Props>(), {
  pullDownThreshold: 60,
  startThreshold: 40
})

const emit = defineEmits<{
  refresh: []
}>()

const loading = ref(false)

async function handleRefresh() {
  loading.value = true
  try {
    await props.onRefresh()
    emit('refresh')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Custom styling for pull-to-refresh indicator */
:deep(.vue-pull-to-refresh__indicator) {
  color: var(--color-primary);
}

:deep(.vue-pull-to-refresh__track) {
  background: transparent;
}
</style>

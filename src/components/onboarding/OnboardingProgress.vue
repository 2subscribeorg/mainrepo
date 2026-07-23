<template>
  <div class="onboarding-progress">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-medium text-text-secondary">Step {{ current + 1 }} of {{ total }}</span>
      <span class="text-xs font-medium text-text-secondary">{{ percentage }}%</span>
    </div>
    <div class="h-2 rounded-full bg-border-light overflow-hidden">
      <div
        class="h-full rounded-full bg-primary transition-all duration-300 ease-out"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  current: number
  total: number
}>()

const percentage = computed(() => Math.round(((props.current + 1) / props.total) * 100))
</script>

<style scoped>
.onboarding-progress {
  width: 100%;
}
</style>

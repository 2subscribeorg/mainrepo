<template>
  <span 
    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
    :class="badgeClasses"
  >
    {{ text }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type: 'pending' | 'success' | 'warning' | 'error'
  text: string
}

const props = defineProps<Props>()

const badgeClasses = computed(() => {
  switch (props.type) {
    case 'pending':
      return 'bg-warning-bg text-warning-text'
    case 'success':
      return 'bg-success-bg text-success-text'
    case 'warning':
      return 'bg-warning-bg text-warning-text'
    case 'error':
      return 'bg-error-bg text-error-text'
    default:
      return 'bg-surface-elevated text-text-primary'
  }
})
</script>

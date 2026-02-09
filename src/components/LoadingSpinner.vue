<template>
  <div 
    class="flex items-center justify-center fade-in" 
    :class="containerClass"
    role="status"
    aria-live="polite"
    aria-label="Loading content"
  >
    <div
      class="spinner rounded-full border-b-2 border-blue-600"
      :class="sizeClass"
      aria-hidden="true"
    />
    <span class="sr-only">Loading, please wait...</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    fullScreen?: boolean
  }>(),
  {
    size: 'md',
    fullScreen: false,
  }
)

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-4 w-4'
    case 'lg':
      return 'h-12 w-12'
    default:
      return 'h-8 w-8'
  }
})

const containerClass = computed(() => {
  return props.fullScreen ? 'min-h-screen' : 'py-8'
})
</script>

<style scoped>
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

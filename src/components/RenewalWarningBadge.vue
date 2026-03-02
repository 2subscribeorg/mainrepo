<template>
  <button
    v-if="count > 0"
    type="button"
    class="relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium
           transition-all duration-150 ease-out
           focus:outline-none focus:ring-2 focus:ring-offset-2
           active:scale-95"
    :class="badgeClass"
    :aria-label="`${count} renewal ${count === 1 ? 'warning' : 'warnings'}${hasCritical ? ', including critical warnings' : ''}`"
    @click="$emit('click')"
  >
    <!-- Bell Icon -->
    <svg
      class="h-4 w-4"
      :class="{ 'animate-pulse': hasCritical }"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>

    <!-- Count -->
    <span class="font-semibold">{{ count }}</span>

    <!-- Critical Indicator -->
    <span
      v-if="hasCritical"
      class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 animate-pulse"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  count: number
  hasCritical?: boolean
}>()

defineEmits<{
  click: []
}>()

const badgeClass = computed(() => {
  if (props.hasCritical) {
    return `bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-md
            dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900
            focus:ring-red-500`
  }
  
  return `bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md
          dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900
          focus:ring-blue-500`
})
</script>

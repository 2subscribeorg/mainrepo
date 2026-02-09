<template>
  <div ref="emptyStateRef" class="text-center py-12 fade-in">
    <svg class="mx-auto h-12 w-12 text-gray-400 hover-scale" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <h3 class="mt-2 text-sm font-medium text-gray-900 slide-down">{{ title }}</h3>
    <p class="mt-1 text-sm text-gray-500 slide-down">{{ description }}</p>
    <div v-if="actionText && actionTo" class="mt-6">
      <router-link
        :to="actionTo"
        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-all duration-150 btn-animated"
      >
        {{ actionText }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAnimations } from '@/utils/useAnimations'

interface Props {
  title: string
  description: string
  actionText?: string
  actionTo?: string
}

defineProps<Props>()

// Use animation utilities
const { animateEntrance } = useAnimations()
const emptyStateRef = ref<HTMLElement>()

onMounted(() => {
  if (emptyStateRef.value) {
    animateEntrance(emptyStateRef.value, 'fade-in', 200)
  }
})
</script>

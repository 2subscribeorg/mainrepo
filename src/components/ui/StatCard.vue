<template>
  <div ref="statCardRef" class="stat-card rounded-2xl bg-surface-overlay shadow-lg backdrop-blur card-animated gpu-accelerated fade-in" style="padding: var(--space-5);">
    <p class="text-xs uppercase tracking-[0.2em] text-text-muted">{{ label }}</p>
    <p class="mt-3 text-3xl font-semibold text-text-primary">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAnimations } from '@/utils/useAnimations'

interface Props {
  label: string
  value: string
}

const props = defineProps<Props>()

// Use animation utilities
const { animateEntrance } = useAnimations()
const statCardRef = ref<HTMLElement>()

onMounted(() => {
  if (statCardRef.value) {
    animateEntrance(statCardRef.value, 'fade-in', 100)
  }
})
</script>

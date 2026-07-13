<template>
  <div class="skeleton-wrapper" :class="{ 'skeleton-inline': variant === 'text' }">
    <div
      v-for="i in count"
      :key="i"
      class="skeleton"
      :class="variantClass"
      :style="customStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'text' | 'card' | 'circle' | 'rect'
    count?: number
    width?: string
    height?: string
    rounded?: string
  }>(),
  {
    variant: 'rect',
    count: 1,
  }
)

const variantClass = computed(() => {
  switch (props.variant) {
    case 'text':
      return 'skeleton-text'
    case 'card':
      return 'skeleton-card'
    case 'circle':
      return 'skeleton-circle'
    default:
      return ''
  }
})

const customStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.width) style.width = props.width
  if (props.height) style.height = props.height
  if (props.rounded) style.borderRadius = props.rounded
  return style
})
</script>

<style scoped>
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-wrapper.skeleton-inline {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(15, 23, 42, 0.06) 25%,
    rgba(15, 23, 42, 0.12) 50%,
    rgba(15, 23, 42, 0.06) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  height: 0.875rem;
  width: 100%;
  border-radius: 0.25rem;
}

.skeleton-card {
  height: 120px;
  width: 100%;
  border-radius: 1rem;
}

.skeleton-circle {
  height: 48px;
  width: 48px;
  border-radius: 50%;
  flex-shrink: 0;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: rgba(15, 23, 42, 0.08);
  }
}
</style>

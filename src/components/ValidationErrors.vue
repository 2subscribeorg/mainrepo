<template>
  <div
    v-if="errors.length > 0"
    class="rounded-lg border p-3"
    :class="containerClass"
  >
    <p class="text-sm font-medium mb-1" :class="titleClass">
      {{ title }}
    </p>
    <ul class="list-disc list-inside text-sm" :class="listClass">
      <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    errors: string[]
    title?: string
    variant?: 'error' | 'warning' | 'info'
  }>(),
  {
    title: 'Please fix the following errors:',
    variant: 'error',
  }
)

const containerClass = computed(() => {
  switch (props.variant) {
    case 'warning':
      return 'bg-warning-bg border-warning-border'
    case 'info':
      return 'bg-info-bg border-info-border'
    default:
      return 'bg-error-bg border-error-border'
  }
})

const titleClass = computed(() => {
  switch (props.variant) {
    case 'warning':
      return 'text-warning-text'
    case 'info':
      return 'text-info-text'
    default:
      return 'text-error-text'
  }
})

const listClass = computed(() => {
  switch (props.variant) {
    case 'warning':
      return 'text-warning-text'
    case 'info':
      return 'text-info-text'
    default:
      return 'text-error-text'
  }
})
</script>
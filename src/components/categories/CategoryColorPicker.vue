<template>
  <div class="color-picker">
    <button
      v-for="color in colors"
      :key="color"
      type="button"
      class="swatch"
      :class="{ 'swatch--selected': modelValue === color }"
      :style="{ backgroundColor: color }"
      @click="$emit('update:modelValue', color)"
      aria-label="Select color"
    />
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_COLORS } from '@/utils/colors'

interface Props {
  modelValue: string
  colors?: string[]
}

withDefaults(defineProps<Props>(), {
  colors: () => DEFAULT_COLORS,
})

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<style scoped>
.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.swatch {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 2px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.swatch:hover {
  transform: scale(1.08);
}

.swatch--selected {
  border-color: var(--color-text-primary);
  box-shadow: 0 0 0 2px rgba(93, 63, 211, 0.2);
}
</style>

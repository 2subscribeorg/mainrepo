<template>
  <n-input
    :value="modelValue"
    @update:value="handleInput"
    placeholder="Search users by email or name..."
    clearable
    size="large"
    @clear="handleClear"
  >
    <template #prefix>
      <n-icon :component="SearchIcon" />
    </template>
  </n-input>
</template>

<script setup lang="ts">
import { Search as SearchIcon } from '@vicons/tabler'

interface Props {
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'search', query: string): void
  (e: 'clear'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function handleInput(value: string) {
  emit('update:modelValue', value)
  emit('search', value)
}

function handleClear() {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

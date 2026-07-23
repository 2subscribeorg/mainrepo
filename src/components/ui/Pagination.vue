<template>
  <div class="flex flex-col gap-2 p-4 border-t border-border-light">
    <p class="text-xs text-text-secondary flex items-center gap-1">
      {{ startItem }}–{{ endItem }}
      <span class="opacity-40">•</span>
      {{ totalItems }} total
    </p>
    <div class="flex items-center justify-center gap-3">
      <button
        :disabled="currentPage <= 1"
        aria-label="Previous page"
        class="w-11 h-11 rounded-full border border-border-light bg-surface text-text-primary transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        @click="$emit('goToPage', currentPage - 1)"
      >
        <ChevronLeft :size="20" />
      </button>
      <span class="min-w-18 text-center px-2 py-1 rounded-full bg-surface-elevated border border-border-light text-text-primary font-semibold">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <button
        :disabled="currentPage >= totalPages"
        aria-label="Next page"
        class="w-11 h-11 rounded-full border border-border-light bg-surface text-text-primary transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        @click="$emit('goToPage', currentPage + 1)"
      >
        <ChevronRight :size="20" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
}

interface Emits {
  (e: 'goToPage', page: number): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const startItem = computed(() => (props.currentPage - 1) * props.pageSize + 1)
const endItem = computed(() => Math.min(props.currentPage * props.pageSize, props.totalItems))
</script>

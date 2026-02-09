<template>
  <div class="flex flex-col gap-2 p-4 border-t border-gray-200">
    <p class="text-xs text-gray-500 flex items-center gap-1">
      {{ startItem }}–{{ endItem }}
      <span class="opacity-40">•</span>
      {{ totalItems }} total
    </p>
    <div class="flex items-center justify-center gap-3">
      <button
        @click="$emit('goToPage', currentPage - 1)"
        :disabled="currentPage <= 1"
        class="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-900 text-base font-semibold transition-all hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ‹
      </button>
      <span class="min-w-18 text-center px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-900 font-semibold">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <button
        @click="$emit('goToPage', currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-900 text-base font-semibold transition-all hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

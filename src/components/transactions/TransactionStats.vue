<template>
  <div class="mb-6">
    <div
      class="-mx-4 flex snap-x gap-4 overflow-x-auto pb-4 pl-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0 sm:pl-0"
    >
      <div
        v-for="card in cards"
        :key="card.label"
        class="min-w-[220px] flex-shrink-0 snap-start sm:min-w-0"
      >
        <StatCard :label="card.label" :value="card.value" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TransactionStats } from '@/types/transactions'
import StatCard from '@/components/ui/StatCard.vue'

interface Props {
  stats: TransactionStats
}

const props = defineProps<Props>()

const cards = computed(() => [
  { label: 'Total Transactions', value: props.stats.totalCount.toString() },
  { label: 'This Month', value: props.stats.thisMonthCount.toString() },
  { label: 'Total Amount', value: props.stats.totalAmount },
])
</script>

<template>
  <div
    class="rounded-lg border border-border-light bg-surface shadow-sm hover:shadow-lg transition-fast hover:-translate-y-1 cursor-pointer card-animated gpu-accelerated"
    @click="$emit('click')"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <div
            class="h-3 w-3 rounded-full"
            :style="{ backgroundColor: categoryColor }"
          />
          <h3 class="font-semibold text-text-primary">{{ subscription.merchantName }}</h3>
        </div>
        <p class="mt-1 text-sm text-text-secondary">{{ categoryName }}</p>
      </div>
      <div class="text-right">
        <p class="text-lg font-bold text-text-primary">{{ formattedAmount }}</p>
        <p class="text-xs text-text-secondary">{{ formattedRecurrence }}</p>
      </div>
    </div>
    <div class="mt-3 flex items-center justify-between text-sm">
      <span
        class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
        :class="statusClass"
      >
        {{ subscription.status }}
      </span>
      <span class="text-text-secondary">Next: {{ formattedNextDate }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Subscription } from '@/domain/models'
import { formatMoney, formatRelativeDate, formatRecurrence } from '@/utils/formatters'
import { useCategoriesStore } from '@/stores/categories'

const props = defineProps<{
  subscription: Subscription
}>()

defineEmits<{
  click: []
}>()

const categoriesStore = useCategoriesStore()

const category = computed(() => 
  categoriesStore.categoriesById.get(props.subscription.categoryId)
)

const categoryName = computed(() => category.value?.name || 'Uncategorised')
const categoryColor = computed(() => category.value?.colour || '#9E9E9E')

const formattedAmount = computed(() => formatMoney(props.subscription.amount))
const formattedRecurrence = computed(() => formatRecurrence(props.subscription.recurrence))
const formattedNextDate = computed(() => formatRelativeDate(props.subscription.nextPaymentDate))

const statusClass = computed(() => {
  switch (props.subscription.status) {
    case 'active':
      return 'bg-success-bg text-success-text'
    case 'paused':
      return 'bg-warning-bg text-warning-text'
    case 'cancelled':
      return 'bg-error-bg text-error-text'
    default:
      return 'bg-surface-elevated text-text-primary'
  }
})
</script>

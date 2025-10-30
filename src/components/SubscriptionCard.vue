<template>
  <div
    class="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    @click="$emit('click')"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <div
            class="h-3 w-3 rounded-full"
            :style="{ backgroundColor: categoryColor }"
          />
          <h3 class="font-semibold text-gray-900">{{ subscription.merchantName }}</h3>
        </div>
        <p class="mt-1 text-sm text-gray-500">{{ categoryName }}</p>
      </div>
      <div class="text-right">
        <p class="text-lg font-bold text-gray-900">{{ formattedAmount }}</p>
        <p class="text-xs text-gray-500">{{ formattedRecurrence }}</p>
      </div>
    </div>
    <div class="mt-3 flex items-center justify-between text-sm">
      <span
        class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
        :class="statusClass"
      >
        {{ subscription.status }}
      </span>
      <span class="text-gray-500">Next: {{ formattedNextDate }}</span>
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
      return 'bg-green-100 text-green-800'
    case 'paused':
      return 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
})
</script>

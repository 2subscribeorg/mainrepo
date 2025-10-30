<template>
  <div>
    <h2 class="text-3xl font-bold text-gray-900">Dashboard</h2>

    <LoadingSpinner v-if="loading" />

    <div v-else class="mt-6 space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg bg-white p-6 shadow">
          <p class="text-sm text-gray-500">Active Subscriptions</p>
          <p class="mt-2 text-3xl font-bold text-gray-900">{{ activeCount }}</p>
        </div>
        <div class="rounded-lg bg-white p-6 shadow">
          <p class="text-sm text-gray-500">Monthly Total</p>
          <p class="mt-2 text-3xl font-bold text-gray-900">{{ monthlyTotal }}</p>
        </div>
        <div class="rounded-lg bg-white p-6 shadow">
          <p class="text-sm text-gray-500">This Month</p>
          <p class="mt-2 text-3xl font-bold" :class="budgetStore.hasBreaches ? 'text-red-600' : 'text-gray-900'">
            {{ currentMonthSpent }}
          </p>
        </div>
        <div class="rounded-lg bg-white p-6 shadow">
          <p class="text-sm text-gray-500">Budget Status</p>
          <p class="mt-2 text-lg font-semibold" :class="budgetStore.hasBreaches ? 'text-red-600' : 'text-green-600'">
            {{ budgetStore.hasBreaches ? 'Over Budget' : 'On Track' }}
          </p>
        </div>
      </div>

      <!-- Chart Placeholder -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900">Spending Trend</h3>
        <div class="mt-4 h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
          <p class="text-gray-500">Chart: Last 12 months spending</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <router-link
          to="/subscriptions"
          class="rounded-lg bg-primary-50 p-6 text-center hover:bg-primary-100 transition-colors"
        >
          <p class="text-lg font-semibold text-primary-900">View All Subscriptions</p>
        </router-link>
        <router-link
          to="/budgets"
          class="rounded-lg bg-primary-50 p-6 text-center hover:bg-primary-100 transition-colors"
        >
          <p class="text-lg font-semibold text-primary-900">Manage Budgets</p>
        </router-link>
        <router-link
          to="/categories"
          class="rounded-lg bg-primary-50 p-6 text-center hover:bg-primary-100 transition-colors"
        >
          <p class="text-lg font-semibold text-primary-900">Edit Categories</p>
        </router-link>
      </div>

      <!-- Recent Subscriptions -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Subscriptions</h3>
        <div class="space-y-3">
          <SubscriptionCard
            v-for="sub in recentSubscriptions"
            :key="sub.id"
            :subscription="sub"
            @click="$router.push(`/subscriptions/${sub.id}`)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useBudgetStore } from '@/stores/budget'
import { useCategoriesStore } from '@/stores/categories'
import { formatMoney } from '@/utils/formatters'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SubscriptionCard from '@/components/SubscriptionCard.vue'

const subscriptionsStore = useSubscriptionsStore()
const budgetStore = useBudgetStore()
const categoriesStore = useCategoriesStore()
const loading = ref(true)

const activeCount = computed(() => 
  subscriptionsStore.subscriptions.filter((s) => s.status === 'active').length
)

const monthlyTotal = computed(() => {
  const total = subscriptionsStore.subscriptions
    .filter((s) => s.status === 'active' && s.recurrence === 'monthly')
    .reduce((sum, s) => sum + s.amount.amount, 0)
  return formatMoney({ amount: total, currency: 'GBP' })
})

const currentMonthSpent = computed(() => {
  if (!budgetStore.currentMonthStatus) return '£0.00'
  return formatMoney(budgetStore.currentMonthStatus.totalSpent)
})

const recentSubscriptions = computed(() => 
  subscriptionsStore.subscriptions.slice(0, 5)
)

onMounted(async () => {
  await Promise.all([
    subscriptionsStore.fetchAll(),
    budgetStore.fetchConfig(),
    budgetStore.evaluateCurrentMonth(),
    categoriesStore.fetchAll(),
  ])
  loading.value = false
})
</script>

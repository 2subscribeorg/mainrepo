<template>
  <div>
    <h2 class="text-3xl font-bold text-gray-900">Dashboard</h2>

    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <div v-else class="mt-6 space-y-6">
      <div class="donut-card">
        <div class="donut-card__header">
          <div>
            <p class="donut-card__eyebrow">Subscription categories</p>
            <h3 class="donut-card__title">{{ totalSubscriptions }} subscription transactions</h3>
          </div>
        </div>
        <div class="donut-card__body">
          <div class="donut-card__chart" :style="{ background: donutGradient }">
            <div class="donut-card__center">
              <p class="donut-center__value">{{ totalSpending }}</p>
              <p class="donut-center__label">monthly</p>
            </div>
          </div>
          <ul class="donut-card__legend">
            <li v-for="item in categoryData" :key="item.categoryId" class="legend-item">
              <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
              <div class="legend-text">
                <p class="legend-name">{{ item.categoryName }}</p>
                <p class="legend-count">{{ item.formattedAmount }} • {{ item.count }} subscription{{ item.count !== 1 ? 's' : '' }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
      
      <div class="action-card">
        <div class="action-card__content">
          <p class="action-card__label">Marked as subscriptions</p>
          <p class="action-card__value">{{ markedCount }}</p>
          <p class="action-card__subtitle">Bank transactions already tagged</p>
        </div>
        <button class="action-card__button" @click="goToTransactions">
          Review
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useCategoriesStore } from '@/stores/categories'
import { formatMoney } from '@/utils/formatters'

const router = useRouter()
const subscriptionsStore = useSubscriptionsStore()
const transactionsDataStore = useTransactionsDataStore()
const categoriesStore = useCategoriesStore()
const loading = ref(true)

// Get all transactions that are marked as subscriptions (with or without categories)
const subscriptionTransactions = computed(() => 
  transactionsDataStore.transactions.filter((tx) => tx.subscriptionId)
)

const totalSubscriptions = computed(() => subscriptionTransactions.value.length)

const markedCount = computed(() =>
  transactionsDataStore.transactions.filter((tx) => tx.subscriptionId).length
)

const categoryData = computed(() => {
  const categoryStats = new Map<string, { count: number; totalAmount: number }>()
  
  subscriptionTransactions.value.forEach((tx) => {
    let categoryKey: string
    
    if (!tx.categoryId) {
      // No category assigned
      categoryKey = 'uncategorized'
    } else {
      // Check if category exists in store
      const category = categoriesStore.categories.find((c) => c.id === tx.categoryId)
      if (category) {
        categoryKey = tx.categoryId
      } else {
        // Category ID exists but category not found in store
        categoryKey = 'uncategorized'
      }
    }
    
    const current = categoryStats.get(categoryKey) || { count: 0, totalAmount: 0 }
    const amount = Math.abs(tx.amount?.amount || 0)
    
    categoryStats.set(categoryKey, {
      count: current.count + 1,
      totalAmount: current.totalAmount + amount
    })
  })

  return Array.from(categoryStats.entries()).map(([categoryId, stats]) => {
    if (categoryId === 'uncategorized') {
      return {
        categoryId,
        categoryName: 'Unknown Category',
        count: stats.count,
        totalAmount: stats.totalAmount,
        formattedAmount: formatMoney({ amount: stats.totalAmount, currency: 'GBP' }),
        color: '#9CA3AF',
        percentage: totalSubscriptions.value ? (stats.count / totalSubscriptions.value) * 100 : 0
      }
    }
    
    const category = categoriesStore.categories.find((c) => c.id === categoryId)
    return {
      categoryId,
      categoryName: category?.name || 'Unknown Category',
      count: stats.count,
      totalAmount: stats.totalAmount,
      formattedAmount: formatMoney({ amount: stats.totalAmount, currency: 'GBP' }),
      color: category?.colour || '#6366f1',
      percentage: totalSubscriptions.value ? (stats.count / totalSubscriptions.value) * 100 : 0
    }
  })
})

const totalSpending = computed(() => {
  const total = categoryData.value.reduce((sum, item) => sum + item.totalAmount, 0)
  return formatMoney({ amount: total, currency: 'GBP' })
})

const donutGradient = computed(() => {
  if (!categoryData.value.length) {
    return 'conic-gradient(var(--color-text-secondary) 0 360deg)'
  }

  let current = 0
  const segments = categoryData.value
    .map((item) => {
      const start = current
      const sweep = (item.percentage / 100) * 360
      current += sweep
      return `${item.color} ${start}deg ${start + sweep}deg`
    })
    .join(', ')

  return `conic-gradient(${segments})`
})

function goToTransactions() {
  router.push('/transactions')
}

onMounted(async () => {
  try {
    await Promise.all([
      subscriptionsStore.fetchAll().catch(() => []),
      transactionsDataStore.fetchAll().catch(() => []),
      categoriesStore.fetchAll().catch(() => []),
    ])
  } catch (error) {
    console.error('Dashboard loading error:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.donut-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 32px;
  padding: 1.5rem;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.donut-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.donut-card__eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
}

.donut-card__title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.donut-card__body {
  display: flex;
  gap: 1.5rem;
}

.donut-card__chart {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 12px rgba(255, 255, 255, 0.4);
}

.donut-card__center {
  position: absolute;
  inset: 25%;
  border-radius: 50%;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
}

.donut-center__value {
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--color-text-primary);
}

.donut-center__label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.donut-card__legend {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 0.5rem;
  
  /* Custom scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
}

.donut-card__legend::-webkit-scrollbar {
  width: 6px;
}

.donut-card__legend::-webkit-scrollbar-track {
  background: transparent;
}

.donut-card__legend::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 3px;
}

.donut-card__legend::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.5);
}

/* Scroll fade indicators */
.donut-card__body {
  position: relative;
}

.donut-card__legend::before,
.donut-card__legend::after {
  content: '';
  position: sticky;
  left: 0;
  right: 0;
  height: 20px;
  pointer-events: none;
  z-index: 1;
}

.donut-card__legend::before {
  top: 0;
  background: linear-gradient(to bottom, var(--color-surface) 0%, transparent 100%);
  margin-bottom: -20px;
}

.donut-card__legend::after {
  bottom: 0;
  background: linear-gradient(to top, var(--color-surface) 0%, transparent 100%);
  margin-top: -20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.legend-count {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.action-card {
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 24px;
  background: color-mix(in srgb, var(--color-success) 8%, white);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.action-card__label {
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.action-card__value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-success);
}

.action-card__subtitle {
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.75);
}

.action-card__button {
  border: none;
  border-radius: 999px;
  padding: 0.65rem 1.4rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.action-card__button:hover {
  transform: translateY(-1px);
}
</style>

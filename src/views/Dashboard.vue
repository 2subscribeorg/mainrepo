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
          <!-- Large centered donut chart -->
          <div class="donut-card__chart-container">
            <div class="donut-card__chart" :style="{ background: donutGradient }">
              <div class="donut-card__center">
                <p class="donut-center__value">{{ totalSpending }}</p>
                <p class="donut-center__label">monthly</p>
              </div>
            </div>
          </div>
          
          <!-- Vertical legend list below chart -->
          <div class="donut-card__legend-container">
            <div class="legend-list" :class="{ 'legend-list--scrollable': categoryData.length > 4 }">
              <div 
                v-for="(item, index) in displayedCategories" 
                :key="item.categoryId" 
                class="legend-item"
                :class="{ 'legend-item--highlighted': highlightedIndex === index }"
                @click="highlightSegment(index)"
                @mouseenter="highlightSegment(index)"
                @mouseleave="clearHighlight"
              >
                <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
                <div class="legend-content">
                  <div class="legend-main">
                    <p class="legend-name">{{ item.categoryName }}</p>
                    <p class="legend-percentage">{{ Math.round(item.percentage) }}%</p>
                  </div>
                  <p class="legend-count">{{ item.formattedAmount }} • {{ item.count }} subscription{{ item.count !== 1 ? 's' : '' }}</p>
                </div>
              </div>
            </div>
            
            <!-- See All button for many categories -->
            <button 
              v-if="categoryData.length > 4" 
              class="see-all-button"
              @click="toggleSeeAll"
            >
              {{ showAll ? 'Show Less' : `See All ${categoryData.length} Categories` }}
            </button>
          </div>
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
const highlightedIndex = ref<number | null>(null)
const showAll = ref(false)

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

  const result = Array.from(categoryStats.entries()).map(([categoryId, stats]) => {
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
  
  return result
})

const displayedCategories = computed(() => {
  if (showAll.value) {
    return categoryData.value
  }
  return categoryData.value.slice(0, 4)
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

function highlightSegment(index: number) {
  highlightedIndex.value = index
}

function clearHighlight() {
  highlightedIndex.value = null
}

function toggleSeeAll() {
  showAll.value = !showAll.value
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
  padding: 2rem;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Mobile responsive adjustments */
@media (max-width: 640px) {
  .donut-card {
    padding: 1.5rem;
  }
  
  .donut-card__chart {
    width: 200px;
    height: 200px;
  }
  
  .donut-card__center {
    inset: 28%;
  }
  
  .donut-center__value {
    font-size: 1.25rem;
  }
  
  .donut-card__legend-container {
    max-width: 100%;
  }
  
  .legend-item {
    padding: 0.625rem;
  }
  
  .legend-percentage {
    min-width: 2rem;
    font-size: 0.8rem;
  }
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
  flex-direction: column;
  gap: 2rem;
  align-items: center;
}

.donut-card__chart-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.donut-card__chart {
  width: 240px;
  height: 240px;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 16px rgba(255, 255, 255, 0.4);
  transition: transform 0.2s ease;
}

.donut-card__chart:hover {
  transform: scale(1.02);
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
  gap: 0.5rem;
}

.donut-center__value {
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--color-text-primary);
  line-height: 1.1;
}

.donut-center__label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.donut-card__legend-container {
  width: 100%;
  max-width: 400px;
  margin-top: 2rem;
}

.legend-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.legend-list--scrollable {
  max-height: 240px;
  overflow-y: auto;
  padding-right: 0.5rem;
  
  /* Custom scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
}

.legend-list--scrollable::-webkit-scrollbar {
  width: 6px;
}

.legend-list--scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.legend-list--scrollable::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 3px;
}

.legend-list--scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.5);
}

/* Scroll fade indicators for scrollable legend */
.legend-list--scrollable {
  position: relative;
}

.legend-list--scrollable::before,
.legend-list--scrollable::after {
  content: '';
  position: sticky;
  left: 0;
  right: 0;
  height: 20px;
  pointer-events: none;
  z-index: 1;
}

.legend-list--scrollable::before {
  top: 0;
  background: linear-gradient(to bottom, var(--color-surface) 0%, transparent 100%);
  margin-bottom: -20px;
}

.legend-list--scrollable::after {
  bottom: 0;
  background: linear-gradient(to top, var(--color-surface) 0%, transparent 100%);
  margin-top: -20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: var(--color-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
}

.legend-item:hover {
  background: rgba(99, 102, 241, 0.05);
  border-color: rgba(99, 102, 241, 0.15);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
}

.legend-item--highlighted {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.25);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15), 0 2px 4px rgba(0, 0, 0, 0.08);
}

.legend-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.legend-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.legend-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.legend-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.legend-count {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.legend-percentage {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  min-width: 2.5rem;
  text-align: right;
  flex-shrink: 0;
}

.see-all-button {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.05);
  color: var(--color-primary);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.see-all-button:hover {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateY(-1px);
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

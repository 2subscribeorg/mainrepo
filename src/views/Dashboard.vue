<template>
  <div>
    <h2 class="text-3xl font-bold text-gray-900">Dashboard</h2>

    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <div v-else class="mt-6 space-y-6">
      <!-- Expiring connections banner -->
      <ConnectionExpirationBanner />
      
      <!-- Renewal Warnings Section -->
      <div v-if="activeWarnings.length > 0" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">Upcoming Renewals</h3>
          <span class="text-sm text-gray-500">{{ activeWarnings.length }} warning{{ activeWarnings.length !== 1 ? 's' : '' }}</span>
        </div>
        <div class="space-y-3">
          <RenewalWarningCard
            v-for="warning in activeWarnings"
            :key="warning.id"
            :warning="warning"
            @dismiss="handleDismissWarning"
            @view-subscription="handleViewSubscription"
          />
        </div>
      </div>

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
              <!-- Icons positioned inside donut segments -->
              <div 
                v-for="seg in segmentIcons" 
                :key="seg.categoryId"
                class="donut-segment-icon"
                :style="{ left: seg.x + '%', top: seg.y + '%' }"
              >
                <component 
                  v-if="seg.iconComponent" 
                  :is="seg.iconComponent" 
                  :size="seg.iconSize" 
                  class="donut-segment-icon__svg"
                />
              </div>
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
                <div class="legend-visual">
                  <CategoryIcon 
                    :icon="item.icon" 
                    :fallback-color="item.color"
                    :show-icon="true"
                    size="md"
                  />
                </div>
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

      <!-- Subscription Suggestions Section -->
      <div class="bg-white rounded-2xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Subscription Insights</h3>
          <button 
            @click="showAllSuggestions = !showAllSuggestions"
            class="text-sm text-blue-600 hover:underline focus:outline-none"
          >
            {{ showAllSuggestions ? 'Show Less' : 'View All' }}
          </button>
        </div>
        
        <div v-if="suggestionsLoading" class="flex justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        
        <div v-else-if="suggestionsError" class="text-red-500 text-sm py-2">
          {{ suggestionsError }}
        </div>
        
        <div v-else-if="suggestions.length === 0" class="text-center py-6 text-gray-500">
          <p>No subscription suggestions at the moment.</p>
        </div>
        
        <div v-else class="space-y-4">
          <div v-for="(suggestion, index) in visibleSuggestions" :key="`${suggestion.merchant}-${suggestion.amount}-${index}`">
            <SubscriptionSuggestionCard 
              :pattern="suggestion"
              @confirmed="handleSuggestionConfirmed"
              @rejected="handleSuggestionRejected"
              class="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
            />
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
import SubscriptionSuggestionCard from '@/components/SubscriptionSuggestionCard.vue'
import RenewalWarningCard from '@/components/RenewalWarningCard.vue'
import { useToast } from '@/composables/useToast'
import { useSubscriptionFeedback } from '@/composables/useSubscriptionFeedback'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useCategoriesStore } from '@/stores/categories'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import { useRenewalWarnings } from '@/composables/useRenewalWarnings'
import ConnectionExpirationBanner from '@/components/ConnectionExpirationBanner.vue'
import { formatMoney } from '@/utils/formatters'
import CategoryIcon from '@/components/ui/CategoryIcon.vue'
import { getIconComponent } from '@/utils/categoryIcons'
import { SubscriptionDetectionService } from '@/services/SubscriptionDetectionService'
import type { RecurringPattern } from '@/services/PatternDetector'

const router = useRouter()
const subscriptionsStore = useSubscriptionsStore()
const transactionsDataStore = useTransactionsDataStore()
const { activeWarnings, dismissWarning } = useRenewalWarnings()
const categoriesStore = useCategoriesStore()
const bankAccountsStore = useBankAccountsStore()
const loading = ref(true)
const highlightedIndex = ref<number | null>(null)
const showAll = ref(false)
const showAllSuggestions = ref(false)
const suggestions = ref<RecurringPattern[]>([])
const suggestionsLoading = ref(false)
const suggestionsError = ref<string | null>(null)
const dismissedMerchants = ref<Set<string>>(new Set())
const toast = useToast()
const { undoFeedback } = useSubscriptionFeedback()

// Track last feedback ID for undo functionality
const lastFeedbackId = ref<string | null>(null)

// Get all transactions that are marked as subscriptions (with or without categories)
const subscriptionTransactions = computed(() => 
  transactionsDataStore.transactions.filter((tx) => tx.subscriptionId)
)

const totalSubscriptions = computed(() => subscriptionTransactions.value.length)

// Subscription suggestions
const visibleSuggestions = computed(() => 
  showAllSuggestions.value ? suggestions.value : suggestions.value.slice(0, 2)
)

async function handleDismissWarning(warningId: string) {
  await dismissWarning(warningId)
}

function handleViewSubscription(subscriptionId: string) {
  router.push(`/subscriptions/${subscriptionId}`)
}

async function loadSubscriptionSuggestions() {
  try {
    suggestionsLoading.value = true
    suggestionsError.value = null
    
    // Ensure transactions are loaded
    await transactionsDataStore.fetchTransactions()
    
    // Fetch user's feedback history from database to know what they've already dismissed
    const { useSubscriptionFeedback: useFeedback } = await import('@/composables/useSubscriptionFeedback')
    const { getUserFeedback } = useFeedback()
    const userFeedback = await getUserFeedback(1000)
    
    // Build set of merchants user has REJECTED (not confirmed) - case-insensitive
    // Only rejected feedback should prevent suggestions from appearing again
    dismissedMerchants.value = new Set(
      userFeedback
        .filter(f => f.userAction === 'rejected')
        .map(f => f.merchantName.toLowerCase())
    )
    
    // Use actual pattern detection service
    const detectionService = new SubscriptionDetectionService()
    const bankTransactions = transactionsDataStore.transactions.map((tx) => ({
      id: tx.id,
      accountId: tx.accountId ?? '',
      amount: tx.amount,
      merchantName: tx.merchantName,
      date: tx.date,
      category: tx.category,
      pending: tx.pending ?? false,
      transactionType: 'purchase' as const,
      subscriptionId: tx.subscriptionId,
      matchedSubscriptionId: tx.subscriptionId,
      userId: tx.userId,
      createdAt: tx.createdAt,
    }))
    const allPatterns = detectionService.detectPatterns(bankTransactions)
    
    // Filter patterns with reasonable confidence and exclude ones user has already given feedback on
    // Use case-insensitive comparison for merchant names
    suggestions.value = allPatterns.filter(pattern => {
      return pattern.confidence >= 0.5 && !dismissedMerchants.value.has(pattern.merchant.toLowerCase())
    })
    
    console.log(`Found ${suggestions.value.length} subscription suggestions (filtered from ${allPatterns.length} total patterns, ${dismissedMerchants.value.size} already reviewed)`)
    
  } catch (err: any) {
    suggestionsError.value = err.message || 'Failed to load subscription suggestions'
    console.error('Error loading subscription suggestions:', err)
  } finally {
    suggestionsLoading.value = false
  }
}

function handleSuggestionConfirmed(suggestion: RecurringPattern) {
  console.log('Confirmed suggestion:', suggestion)
  // Feedback is already recorded in the database via useSubscriptionFeedback
  // Add to dismissed set so it doesn't reappear in this session (case-insensitive)
  dismissedMerchants.value.add(suggestion.merchant.toLowerCase())
  // Remove from current suggestions list
  suggestions.value = suggestions.value.filter(s => s.merchant !== suggestion.merchant)
}

function handleSuggestionRejected(suggestion: RecurringPattern, feedbackId?: string) {
  console.log('Rejected suggestion:', suggestion)
  
  // Store feedback ID for undo
  if (feedbackId) {
    lastFeedbackId.value = feedbackId
  }
  
  // Add to dismissed set so it doesn't reappear in this session (case-insensitive)
  dismissedMerchants.value.add(suggestion.merchant.toLowerCase())
  
  // Remove from current suggestions list
  const removedSuggestion = suggestion
  suggestions.value = suggestions.value.filter(s => s.merchant !== suggestion.merchant)
  
  // Show toast with undo option
  toast.info(`"${suggestion.merchant}" dismissed`, {
    label: 'Undo',
    onClick: async () => {
      if (lastFeedbackId.value) {
        const success = await undoFeedback(lastFeedbackId.value)
        if (success) {
          // Remove from dismissed set (case-insensitive)
          dismissedMerchants.value.delete(removedSuggestion.merchant.toLowerCase())
          // Add back to suggestions list
          suggestions.value.unshift(removedSuggestion)
          toast.success('Dismissal undone')
        } else {
          toast.error('Failed to undo')
        }
      }
    }
  })
}

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
        icon: undefined,
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
      icon: category?.icon,
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

// Calculate icon positions for each donut segment
const segmentIcons = computed(() => {
  if (!categoryData.value.length) return []
  
  // Donut ring center is at ~37.5% from center (midpoint between 25% hole and 50% edge)
  const ringRadius = 37.5
  
  return categoryData.value
    .filter(item => item.icon && item.percentage >= 5) // Only show icons for segments >= 5%
    .map(item => {
      // Find this item's start angle by summing all previous percentages
      let startAngle = 0
      for (const d of categoryData.value) {
        if (d.categoryId === item.categoryId) break
        startAngle += (d.percentage / 100) * 360
      }
      const sweepAngle = (item.percentage / 100) * 360
      const midAngle = startAngle + sweepAngle / 2
      
      // Convert to radians (CSS conic-gradient starts at top, going clockwise)
      // Top = -90deg in standard math coords
      const radians = ((midAngle - 90) * Math.PI) / 180
      
      // Calculate position as percentage of the chart (50% = center)
      const x = 50 + ringRadius * Math.cos(radians)
      const y = 50 + ringRadius * Math.sin(radians)
      
      // Scale icon size based on segment size
      const iconSize = sweepAngle > 60 ? 18 : sweepAngle > 30 ? 14 : 12
      
      return {
        categoryId: item.categoryId,
        icon: item.icon,
        iconComponent: getIconComponent(item.icon),
        iconSize,
        x,
        y
      }
    })
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
      loadSubscriptionSuggestions(),
      subscriptionsStore.fetchAll().catch(() => []),
      transactionsDataStore.fetchAll().catch(() => []),
      categoriesStore.fetchAll().catch(() => []),
      bankAccountsStore.fetchConnections().catch(() => []),
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

.donut-segment-icon {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1;
}

.donut-segment-icon__svg {
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
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

.legend-visual {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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

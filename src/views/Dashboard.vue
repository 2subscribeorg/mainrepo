<template>
  <div>
    <h2 class="text-3xl font-bold text-gray-900">Dashboard</h2>

    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <div v-else class="mt-6 space-y-6">
      <!-- Expiring connections banner -->
      <ErrorBoundary component="ConnectionExpirationBanner">
        <ConnectionExpirationBanner />
      </ErrorBoundary>
      
      <!-- Renewal Warnings Section -->
      <AsyncErrorBoundary loading-message="Loading renewal warnings...">
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
      </AsyncErrorBoundary>

      <ErrorBoundary component="DonutChart">
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
              <div class="legend-list">
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
            </div>
          </div>
        </div>
      </ErrorBoundary>

      <!-- Subscription Suggestions Section -->
      <ErrorBoundary component="SubscriptionSuggestions">
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
          
          <AsyncErrorBoundary loading-message="Loading suggestions...">
            <div v-if="suggestionsLoading" class="flex justify-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
            
            <div v-else-if="suggestionsError" class="text-red-500 text-sm py-2">
              {{ suggestionsError }}
            </div>
            
            <div v-else-if="filteredSuggestions.length === 0" class="text-center py-6 text-gray-500">
              <p>No subscription suggestions at the moment.</p>
            </div>
            
            <div v-else class="space-y-4">
              <div v-for="suggestion in visibleSuggestions" :key="suggestion.merchant">
                <SubscriptionSuggestionCard 
                  :pattern="suggestion"
                  @confirmed="handleSuggestionConfirmed"
                  @rejected="handleSuggestionRejected"
                  class="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
                />
              </div>
            </div>
          </AsyncErrorBoundary>
        </div>
      </ErrorBoundary>

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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import SubscriptionSuggestionCard from '@/components/SubscriptionSuggestionCard.vue'
import RenewalWarningCard from '@/components/RenewalWarningCard.vue'
import { useToast } from '@/composables/useToast'
import { useAuth } from '@/composables/useAuth'
import { useSubscriptionFeedback } from '@/composables/useSubscriptionFeedback'
import { logger } from '@/utils/logger'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsStore } from '@/stores/transactions'
import { useCategoriesStore } from '@/stores/categories'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import { useRenewalWarnings } from '@/composables/useRenewalWarnings'
import ConnectionExpirationBanner from '@/components/ConnectionExpirationBanner.vue'
import { formatMoney } from '@/utils/formatters'
import CategoryIcon from '@/components/ui/CategoryIcon.vue'
import { getIconComponent } from '@/utils/categoryIcons'
import { SubscriptionDetectionService } from '@/services/SubscriptionDetectionService'
import type { RecurringPattern } from '@/services/PatternDetector'
import { useLoadingStates } from '@/composables/useLoadingStates'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import AsyncErrorBoundary from '@/components/ui/AsyncErrorBoundary.vue'

const router = useRouter()
const subscriptionsStore = useSubscriptionsStore()
const transactionsStore = useTransactionsStore()
const { activeWarnings, dismissWarning } = useRenewalWarnings()
const categoriesStore = useCategoriesStore()
const bankAccountsStore = useBankAccountsStore()
const { user } = useAuth()
const { setLoading, isLoading, withLoading } = useLoadingStates()
const highlightedIndex = ref<number | null>(null)
const showAllSuggestions = ref(false)
const suggestions = ref<RecurringPattern[]>([])
const suggestionsError = ref<string | null>(null)

// Unified loading states
const loading = isLoading('dashboard')
const suggestionsLoading = isLoading('suggestions')
const dismissedMerchants = ref<Set<string>>(new Set())
const toast = useToast()
const { undoFeedback } = useSubscriptionFeedback()

// Track last feedback ID for undo functionality
const lastFeedbackId = ref<string | null>(null)

// Synchronously pull from localStorage immediately on setup
// This ensures dismissed merchants are loaded BEFORE the template renders
const syncLocalDismissed = () => {
  if (!user.value?.id) {
    logger.warn('No user ID available for localStorage sync')
    return
  }
  
  const cacheKey = `rejected_merchants_${user.value.id}`
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const names = JSON.parse(cached) as string[]
      if (Array.isArray(names)) {
        names.forEach(name => {
          if (typeof name === 'string' && name.trim()) {
            dismissedMerchants.value.add(name.toLowerCase().trim())
          }
        })
        logger.debug('Loaded dismissed merchants from localStorage', { count: names.length })
      }
    }
  } catch (err) {
    logger.warn('Failed to load dismissed merchants from localStorage', { error: err })
    // Don't clear the set - just continue with empty state
  }
}
syncLocalDismissed()

// Watch for user changes and resync dismissed merchants
watch(() => user.value?.id, (newUserId, oldUserId) => {
  if (newUserId && newUserId !== oldUserId) {
    // Clear the current set and resync for the new user
    dismissedMerchants.value.clear()
    categoryStatsCache.value.clear() // Also clear category cache on user change
    syncLocalDismissed()
  }
}, { immediate: false })

// Persistent cache for category statistics with automatic cleanup
const categoryStatsCache = ref(new Map<string, { count: number; totalAmount: number }>())
const lastCacheUpdate = ref<string>('')

// Cache cleanup function to prevent memory bloat
const cleanupCategoryCache = () => {
  const maxCacheSize = 100 // Limit cache size
  if (categoryStatsCache.value.size > maxCacheSize) {
    // Remove oldest entries (simple FIFO cleanup)
    const entries = Array.from(categoryStatsCache.value.entries())
    categoryStatsCache.value.clear()
    // Keep only the most recent entries
    entries.slice(-maxCacheSize * 0.8).forEach(([key, value]) => {
      categoryStatsCache.value.set(key, value)
    })
  }
}

// Watch for user changes to clear cache
watch(() => user.value?.id, () => {
  categoryStatsCache.value.clear()
}, { immediate: false })

// Get comprehensive category data from all sources
const subscriptionData = computed(() => {
  const subscriptions = subscriptionsStore.subscriptions || []
  const transactions = transactionsStore.transactions || []
  
  // Get all transactions (not just subscription ones) to capture all categories
  const allTransactions = transactions
  
  // Start with direct subscriptions
  const mergedData = [...subscriptions]
  
  // Add category information from all transactions
  // This ensures we capture categories even from non-subscription transactions
  const categoryMap = new Map<string, { amount: number; count: number }>()
  
  // Process all transactions to build category statistics
  allTransactions.forEach((tx: any) => {
    if (tx.categoryId) {
      const existing = categoryMap.get(tx.categoryId) || { amount: 0, count: 0 }
      categoryMap.set(tx.categoryId, {
        amount: existing.amount + Math.abs(tx.amount?.amount || 0),
        count: existing.count + 1
      })
    }
  })
  
  // Update subscriptions with transaction-derived category data
  mergedData.forEach((sub: any) => {
    if (sub.categoryId && categoryMap.has(sub.categoryId)) {
      const categoryData = categoryMap.get(sub.categoryId)!
      // Use subscription amount but ensure we have category info
    }
  })
  
  // Add synthetic entries for categories that appear in transactions but not in subscriptions
  categoryMap.forEach((data, categoryId) => {
    const hasSubscription = mergedData.some((sub: any) => sub.categoryId === categoryId)
    if (!hasSubscription) {
      // Find the category details
      const category = categoriesStore.categories?.find((c: any) => c.id === categoryId)
      if (category) {
        mergedData.push({
          id: `category_${categoryId}`,
          merchantName: category.name,
          amount: { amount: data.amount, currency: 'GBP' },
          categoryId: categoryId,
          status: 'active',
          source: 'pattern_detection', // Use valid source from Subscription type
          recurrence: 'monthly', // Default recurrence for synthetic entries
          nextPaymentDate: new Date().toISOString().split('T')[0] // Today's date as default
        })
      }
    }
  })
  
  return mergedData
})

const totalSubscriptions = computed(() => {
  return subscriptionData.value.length
})

const filteredSuggestions = computed(() => {
  return suggestions.value.filter(pattern => {
    const isDismissed = dismissedMerchants.value.has(pattern.merchant.toLowerCase())
    return !isDismissed
  })
})

// Visible suggestions with show/hide functionality
const visibleSuggestions = computed(() => {
  const filtered = filteredSuggestions.value
  return showAllSuggestions.value ? filtered : filtered.slice(0, 2)
})

async function handleDismissWarning(warningId: string) {
  await dismissWarning(warningId)
}

function handleViewSubscription(subscriptionId: string) {
  router.push(`/subscriptions/${subscriptionId}`)
}

async function loadSubscriptionSuggestions() {
  await withLoading('suggestions', async () => {
    try {
      suggestionsError.value = null
    
      // CRITICAL: Load database rejections FIRST, before doing anything else
      // This ensures dismissed merchants are in the Set before suggestions populate
      try {
        const { useSubscriptionFeedback: useFeedback } = await import('@/composables/useSubscriptionFeedback')
        const { getUserFeedback } = useFeedback()
        const userFeedback = await getUserFeedback(1000)
        
        // Merge database rejections with existing dismissed set (includes localStorage cache)
        // Only rejected feedback should prevent suggestions from appearing again
        if (userFeedback && Array.isArray(userFeedback)) {
          userFeedback
            .filter(f => f.userAction === 'rejected')
            .forEach(f => dismissedMerchants.value.add(f.merchantName.toLowerCase()))
        }
      } catch (dbError) {
        // If database loading fails, we still have localStorage merchants from syncLocalDismissed()
        // Don't clear the dismissed set, just log the error and continue
        logger.warn('Failed to load database rejections, using localStorage only', { error: dbError })
      }
    
    
    // Now load transactions and detect patterns
      try {
        await transactionsStore.fetchTransactions()
        
        // Use actual pattern detection service
        const detectionService = new SubscriptionDetectionService()
        const bankTransactions = transactionsStore.transactions?.map((tx: any) => ({
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
        })) || []
        const allPatterns = detectionService.detectPatterns(bankTransactions)
        
        // Store ALL patterns with reasonable confidence
        // Filtering happens in the computed property, not here
        suggestions.value = allPatterns?.filter(pattern => pattern.confidence >= 0.5) || []
      } catch (patternError) {
        // If pattern detection fails, ensure we still have empty suggestions rather than undefined
        logger.warn('Failed to detect patterns, showing no suggestions', { error: patternError })
        suggestions.value = []
      }
    
    
    } catch (err: any) {
      suggestionsError.value = err.message || 'Failed to load subscription suggestions'
      throw err // Re-throw to let withLoading handle the finally
    }
  })
}

function handleSuggestionConfirmed(suggestion: RecurringPattern) {
  // Feedback is already recorded in the database via useSubscriptionFeedback
  // Add to dismissed set so it doesn't reappear (case-insensitive)
  // The computed property will automatically hide it from the UI
  dismissedMerchants.value.add(suggestion.merchant.toLowerCase())
}

function handleSuggestionRejected(suggestion: RecurringPattern, feedbackId?: string) {
  
  // Store feedback ID for undo
  if (feedbackId) {
    lastFeedbackId.value = feedbackId
  }
  
  // Add to dismissed set immediately - the computed property will hide it instantly
  dismissedMerchants.value.add(suggestion.merchant.toLowerCase())
  
  // Show toast with undo option
  toast.info(`"${suggestion.merchant}" dismissed`, {
    label: 'Undo',
    onClick: async () => {
      if (lastFeedbackId.value) {
        const success = await undoFeedback(lastFeedbackId.value, suggestion.merchant)
        if (success) {
          // Remove from dismissed set - the computed property will show it again
          dismissedMerchants.value.delete(suggestion.merchant.toLowerCase())
          toast.success('Dismissal undone')
        } else {
          toast.error('Failed to undo')
        }
      }
    }
  })
}

const markedCount = computed(() =>
  transactionsStore.transactions?.filter((tx: any) => tx.subscriptionId).length || 0
)

const categoryData = computed(() => {
  const categories = categoriesStore.categories || []
  
  // Skip processing if categories aren't loaded yet
  if (categories.length === 0) {
    return []
  }
  
  // Create cache key based on data changes
  const cacheKey = `${categories.length}-${subscriptionData.value.length}-${transactionsStore.transactions?.length || 0}`
  
  // Return cached data if unchanged
  if (lastCacheUpdate.value === cacheKey && categoryStatsCache.value.size > 0) {
    cleanupCategoryCache() // Still run cleanup to prevent memory bloat
    return Array.from(categoryStatsCache.value.entries()).map(([categoryId, stats]) => {
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
      
      const category = categories.find((c: any) => c.id === categoryId)
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
    }).sort((a, b) => b.totalAmount - a.totalAmount)
  }
  
  // Data changed - recalculate and cache
  const categoryStats = new Map<string, { count: number; totalAmount: number }>()
  
  // DEBUG: Let's see what we're working with
  const allCategoryIds = categories.map((c: any) => c.id)
  const foundCategoryIds = new Set<string>()
  
  subscriptionData.value.forEach((sub: any) => {
    if (sub.categoryId) {
      foundCategoryIds.add(sub.categoryId)
    }
  })
  
  // TEMPORARY: Add missing categories with zero count so they appear
  allCategoryIds.forEach((categoryId: string) => {
    if (!foundCategoryIds.has(categoryId)) {
      categoryStats.set(categoryId, { count: 0, totalAmount: 0 })
    }
  })
  
  subscriptionData.value.forEach((sub: any) => {
    let categoryKey: string
    
    if (!sub.categoryId) {
      categoryKey = 'uncategorized'
    } else {
      // Find category by ID - use case-insensitive comparison as fallback
      let category = categories.find((c: any) => c.id === sub.categoryId)
      
      // If not found by exact match, try case-insensitive
      if (!category) {
        category = categories.find((c: any) => 
          c.id.toLowerCase() === sub.categoryId.toLowerCase()
        )
      }
      
      categoryKey = category ? category.id : 'uncategorized'
    }
    
    const current = categoryStats.get(categoryKey) || { count: 0, totalAmount: 0 }
    const amount = Math.abs(sub.amount?.amount || 0)
    
    categoryStats.set(categoryKey, {
      count: current.count + 1,
      totalAmount: current.totalAmount + amount
    })
  })

  // Update cache
  categoryStatsCache.value = new Map(categoryStats)
  lastCacheUpdate.value = cacheKey
  cleanupCategoryCache()

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
    
    // Find category by ID - use case-insensitive comparison as fallback
    let category = categories.find((c: any) => c.id === categoryId)
    
    // If not found by exact match, try case-insensitive
    if (!category) {
      category = categories.find((c: any) => 
        c.id.toLowerCase() === categoryId.toLowerCase()
      )
    }
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
  
  // Sort by total amount descending
  result.sort((a, b) => b.totalAmount - a.totalAmount)
  
  // TEMPORARY: Show all categories including zero-count ones for debugging
  return result
})

const displayedCategories = computed(() => {
  return categoryData.value  // Show all categories by default
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


onMounted(async () => {
  await withLoading('dashboard', async () => {
    try {
      await Promise.all([
        loadSubscriptionSuggestions(),
        subscriptionsStore.fetchAll().catch(() => []),
        transactionsStore.fetchTransactions().catch(() => []),
        categoriesStore.fetchAll().catch(() => []),
        bankAccountsStore.fetchConnections().catch(() => []),
      ])
    } catch (error) {
      throw error // Re-throw to let withLoading handle the finally
    }
  })
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

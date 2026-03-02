import { ref, computed } from 'vue'
import type { RecurringPattern } from '@/services/PatternDetector'
import type { SubscriptionFeedback } from '@/domain/models'
import { SubscriptionDetectionService } from '@/services/SubscriptionDetectionService'
import { MerchantNormalizer } from '@/services/subscriptions/MerchantNormalizer'
import { useSubscriptionFeedback } from './useSubscriptionFeedback'
import { useTransactionsDataStore } from '@/stores/transactionsData'

// Singleton state - persists across component mounts/unmounts
const suggestions = ref<RecurringPattern[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const dismissedNormalizedMerchants = ref<Set<string>>(new Set())
const merchantNormalizer = new MerchantNormalizer()
let isInitialized = false

/**
 * Singleton composable for managing subscription suggestions with proper filtering
 * State persists across navigation - rejected suggestions stay dismissed
 * Ensures rejected suggestions don't reappear by using normalized merchant names
 */
export function useSubscriptionSuggestions() {
  const transactionsDataStore = useTransactionsDataStore()
  const { getUserFeedback } = useSubscriptionFeedback()
  
  /**
   * Load subscription suggestions with proper filtering
   * Uses normalized merchant names to ensure rejected suggestions don't reappear
   * @param minConfidence - Minimum confidence threshold (0-1)
   * @param forceReload - Force reload even if already loaded in this session
   */
  async function loadSuggestions(minConfidence: number = 0.5, forceReload: boolean = false): Promise<void> {
    // Skip if already loaded in this session (unless forced)
    if (isInitialized && !forceReload) {
      console.log('📋 Suggestions already loaded in this session, skipping reload')
      return
    }
    
    try {
      loading.value = true
      error.value = null
      
      // Ensure transactions are loaded
      await transactionsDataStore.fetchTransactions()
      
      // Fetch user's feedback history from database
      const userFeedback = await getUserFeedback(1000)
      
      console.log(`📋 Fetched ${userFeedback.length} total feedback entries from database`)
      console.log('📋 Feedback details:', userFeedback.map(f => ({
        merchant: f.merchantName,
        action: f.userAction,
        timestamp: f.timestamp
      })))
      
      // Build set of NORMALIZED merchant names user has REJECTED
      // This is the key fix: we normalize the merchant names from feedback
      // so they match the normalized names in patterns
      const rejectedFeedback = userFeedback.filter(f => f.userAction === 'rejected')
      console.log(`📋 Found ${rejectedFeedback.length} rejected feedback entries`)
      
      dismissedNormalizedMerchants.value = new Set(
        rejectedFeedback.map(f => {
          const normalized = merchantNormalizer.normalize(f.merchantName)
          console.log(`📋 Normalizing rejected merchant: "${f.merchantName}" → "${normalized}"`)
          return normalized
        })
      )
      
      console.log(`📋 Loaded ${dismissedNormalizedMerchants.value.size} rejected merchants (normalized):`, 
        Array.from(dismissedNormalizedMerchants.value))
      
      // Run pattern detection
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
      
      console.log(`🔍 Detected ${allPatterns.length} total patterns`)
      allPatterns.forEach(p => {
        console.log(`🔍 Pattern: "${p.merchant}" (normalized: "${p.normalizedMerchant}") - confidence: ${Math.round(p.confidence * 100)}%`)
      })
      
      // Filter patterns using NORMALIZED merchant names
      // This ensures "Netflix Payment", "Netflix Inc", etc. all map to "netflix"
      suggestions.value = allPatterns.filter(pattern => {
        const meetsConfidence = pattern.confidence >= minConfidence
        const notDismissed = !dismissedNormalizedMerchants.value.has(pattern.normalizedMerchant)
        
        console.log(`� Checking pattern "${pattern.merchant}" (normalized: "${pattern.normalizedMerchant}"):`)
        console.log(`   - Confidence: ${Math.round(pattern.confidence * 100)}% (min: ${Math.round(minConfidence * 100)}%) → ${meetsConfidence ? '✅' : '❌'}`)
        console.log(`   - Not dismissed: ${notDismissed ? '✅' : '❌'}`)
        console.log(`   - Final: ${meetsConfidence && notDismissed ? '✅ INCLUDED' : '❌ FILTERED OUT'}`)
        
        return meetsConfidence && notDismissed
      })
      
      console.log(`✅ Found ${suggestions.value.length} subscription suggestions (filtered from ${allPatterns.length} total patterns, ${dismissedNormalizedMerchants.value.size} rejected)`)
      
    } catch (err: any) {
      error.value = err.message || 'Failed to load subscription suggestions'
      console.error('Error loading subscription suggestions:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Mark a suggestion as dismissed (in-memory only, for current session)
   * Use this after recording feedback to prevent immediate reappearance
   */
  function dismissSuggestion(pattern: RecurringPattern): void {
    // Add to dismissed set using normalized merchant name
    dismissedNormalizedMerchants.value.add(pattern.normalizedMerchant)
    
    // Remove from current suggestions list
    suggestions.value = suggestions.value.filter(
      s => s.normalizedMerchant !== pattern.normalizedMerchant
    )
  }
  
  /**
   * Restore a dismissed suggestion (for undo functionality)
   */
  function restoreSuggestion(pattern: RecurringPattern): void {
    // Remove from dismissed set
    dismissedNormalizedMerchants.value.delete(pattern.normalizedMerchant)
    
    // Add back to suggestions list if not already there
    const exists = suggestions.value.some(
      s => s.normalizedMerchant === pattern.normalizedMerchant
    )
    
    if (!exists) {
      suggestions.value.unshift(pattern)
    }
  }
  
  /**
   * Check if a merchant is dismissed (by normalized name)
   */
  function isDismissed(merchantName: string): boolean {
    const normalized = merchantNormalizer.normalize(merchantName)
    return dismissedNormalizedMerchants.value.has(normalized)
  }
  
  return {
    suggestions: computed(() => suggestions.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    dismissedNormalizedMerchants: computed(() => dismissedNormalizedMerchants.value),
    loadSuggestions,
    reloadSuggestions,
    dismissSuggestion,
    restoreSuggestion,
    isDismissed,
  }
}

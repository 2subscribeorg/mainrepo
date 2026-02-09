<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="mb-6">
      <h2 class="text-3xl font-bold text-gray-900">Subscription Suggestions</h2>
      <p class="mt-2 text-sm text-gray-600">
        We've detected these potential subscriptions from your transactions. Confirm or reject each one to help improve our detection.
      </p>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-800">
      <p class="font-medium">Error loading suggestions</p>
      <p class="text-sm mt-1">{{ error }}</p>
    </div>

    <div v-else-if="detectedPatterns.length === 0" class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No suggestions found</h3>
      <p class="mt-1 text-sm text-gray-500">
        We haven't detected any new subscription patterns yet. Check back after more transactions sync.
      </p>
    </div>

    <div v-else class="space-y-4">
      <SubscriptionSuggestionCard
        v-for="pattern in detectedPatterns"
        :key="pattern.normalizedMerchant"
        :pattern="pattern"
        @confirmed="handleConfirmed"
        @rejected="handleRejected"
      />
    </div>

    <div v-if="feedbackStats && feedbackStats.totalFeedback > 0" class="mt-8 rounded-lg bg-blue-50 p-4">
      <h3 class="text-sm font-medium text-blue-900">Your Feedback Stats</h3>
      <div class="mt-2 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p class="text-blue-600">Total Feedback</p>
          <p class="text-2xl font-bold text-blue-900">{{ feedbackStats.totalFeedback }}</p>
        </div>
        <div>
          <p class="text-green-600">Confirmed</p>
          <p class="text-2xl font-bold text-green-900">{{ feedbackStats.confirmed }}</p>
        </div>
        <div>
          <p class="text-red-600">Rejected</p>
          <p class="text-2xl font-bold text-red-900">{{ feedbackStats.rejected }}</p>
        </div>
      </div>
      <p class="mt-2 text-xs text-blue-700">
        Your feedback helps train our ML model to better detect subscriptions!
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SubscriptionSuggestionCard from '@/components/SubscriptionSuggestionCard.vue'
import { SubscriptionDetectionService } from '@/services/SubscriptionDetectionService'
import { useTransactionsDataStore } from '@/stores/transactionsData'
import { useSubscriptionFeedback } from '@/composables/useSubscriptionFeedback'
import type { RecurringPattern } from '@/services/PatternDetector'

const transactionsStore = useTransactionsDataStore()
const { getFeedbackStats } = useSubscriptionFeedback()

const loading = ref(true)
const error = ref<string | null>(null)
const detectedPatterns = ref<RecurringPattern[]>([])
const feedbackStats = ref<any>(null)

onMounted(async () => {
  await loadSuggestions()
  await loadFeedbackStats()
})

async function loadSuggestions() {
  try {
    loading.value = true
    error.value = null

    await transactionsStore.loadTransactions()
    
    const detectionService = new SubscriptionDetectionService()
    const allPatterns = detectionService.detectPatterns(transactionsStore.transactions)
    
    detectedPatterns.value = allPatterns.filter(pattern => {
      return pattern.confidence >= 0.5
    })

    console.log(`Found ${detectedPatterns.value.length} subscription suggestions`)
  } catch (err: any) {
    error.value = err.message || 'Failed to load suggestions'
    console.error('Error loading suggestions:', err)
  } finally {
    loading.value = false
  }
}

async function loadFeedbackStats() {
  try {
    feedbackStats.value = await getFeedbackStats()
  } catch (err) {
    console.error('Error loading feedback stats:', err)
  }
}

function handleConfirmed(pattern: RecurringPattern) {
  console.log('✅ User confirmed subscription:', pattern.merchant)
  
  detectedPatterns.value = detectedPatterns.value.filter(
    p => p.normalizedMerchant !== pattern.normalizedMerchant
  )
  
  loadFeedbackStats()
}

function handleRejected(pattern: RecurringPattern) {
  console.log('❌ User rejected subscription:', pattern.merchant)
  
  detectedPatterns.value = detectedPatterns.value.filter(
    p => p.normalizedMerchant !== pattern.normalizedMerchant
  )
  
  loadFeedbackStats()
}
</script>

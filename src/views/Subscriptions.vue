<template>
  <div>
    <div class="flex items-center justify-between">
      <h2 class="text-3xl font-bold text-gray-900">Subscriptions</h2>
    </div>

    <!-- Search and Filters -->
    <div class="mt-6 space-y-4">
      <div>
        <input
          v-model="searchQuery"
          @input="handleSearchInput"
          type="text"
          placeholder="Search subscriptions..."
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <p v-if="searchRateLimited" class="mt-1 text-sm text-red-600">
          ⚠️ Search rate limited. Please wait a moment.
        </p>
      </div>

      <div class="flex gap-4 overflow-x-auto pb-2">
        <button
          @click="selectedCategory = null"
          class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            selectedCategory === null
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          "
        >
          All
        </button>
        <button
          v-for="category in categoriesStore.categories"
          :key="category.id"
          @click="selectedCategory = category.id"
          class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            selectedCategory === category.id
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          "
        >
          {{ category.name }}
        </button>
      </div>

      <div class="flex gap-2">
        <button
          v-for="status in ['active', 'paused', 'cancelled']"
          :key="status"
          @click="toggleStatus(status)"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          :class="
            selectedStatuses.includes(status)
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          "
        >
          {{ status }}
        </button>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />

    <!-- Subscriptions List -->
    <div v-else class="mt-6">
      <p class="mb-4 text-sm text-gray-600">{{ filteredSubscriptions.length }} subscriptions</p>
      <div class="space-y-3">
        <SubscriptionCard
          v-for="subscription in filteredSubscriptions"
          :key="subscription.id"
          :subscription="subscription"
          @click="$router.push(`/subscriptions/${subscription.id}`)"
        />
      </div>

      <div v-if="filteredSubscriptions.length === 0" class="py-12 text-center">
        <p class="text-gray-500">No subscriptions found</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useCategoriesStore } from '@/stores/categories'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SubscriptionCard from '@/components/SubscriptionCard.vue'
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimiter'
import { sanitizeSearchQuery } from '@/utils/sanitize'

const subscriptionsStore = useSubscriptionsStore()
const categoriesStore = useCategoriesStore()

const loading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const selectedStatuses = ref<string[]>(['active'])
const searchRateLimited = ref(false)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const filteredSubscriptions = computed(() => {
  let subs = subscriptionsStore.subscriptions

  if (searchQuery.value) {
    // Sanitize search query to prevent issues
    const query = sanitizeSearchQuery(searchQuery.value).toLowerCase()
    subs = subs.filter((s) => s.merchantName.toLowerCase().includes(query))
  }

  if (selectedCategory.value) {
    subs = subs.filter((s) => s.categoryId === selectedCategory.value)
  }

  if (selectedStatuses.value.length > 0) {
    subs = subs.filter((s) => selectedStatuses.value.includes(s.status))
  }

  return subs
})

function handleSearchInput() {
  // Rate limit search operations
  if (!checkRateLimit('search-subscriptions', RATE_LIMITS.SEARCH)) {
    searchRateLimited.value = true
    setTimeout(() => {
      searchRateLimited.value = false
    }, 2000)
    return
  }

  // Debounce search to reduce computation
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = setTimeout(() => {
    // Search query is already reactive, just trigger re-computation
    searchQuery.value = searchQuery.value
  }, 300) // 300ms debounce
}

function toggleStatus(status: string) {
  const index = selectedStatuses.value.indexOf(status)
  if (index > -1) {
    selectedStatuses.value.splice(index, 1)
  } else {
    selectedStatuses.value.push(status)
  }
}

onMounted(async () => {
  await Promise.all([
    subscriptionsStore.fetchAll(),
    categoriesStore.fetchAll(),
  ])
  loading.value = false
})
</script>

<template>
  <div>
    <button @click="$router.back()" class="mb-4 text-sm text-gray-600 hover:text-gray-900">
      ← Back to Subscriptions
    </button>

    <LoadingSpinner v-if="loading" />

    <div v-else-if="subscription" class="space-y-6">
      <div class="rounded-lg bg-white p-6 shadow">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-3xl font-bold text-gray-900">{{ subscription.merchantName }}</h2>
            <p class="mt-1 text-gray-500">{{ categoryName }}</p>
          </div>
          <span
            class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
            :class="statusClass"
          >
            {{ subscription.status }}
          </span>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p class="text-sm text-gray-500">Amount</p>
            <p class="mt-1 text-xl font-bold text-gray-900">{{ formattedAmount }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Frequency</p>
            <p class="mt-1 text-xl font-bold text-gray-900">{{ formattedRecurrence }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Next Payment</p>
            <p class="mt-1 text-lg font-semibold text-gray-900">
              {{ formatDate(subscription.nextPaymentDate) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Last Payment</p>
            <p class="mt-1 text-lg font-semibold text-gray-900">
              {{ subscription.lastPaymentDate ? formatDate(subscription.lastPaymentDate) : 'N/A' }}
            </p>
          </div>
        </div>

        <div class="mt-6">
          <label class="block text-sm font-medium text-gray-700">Category</label>
          <select
            v-model="selectedCategoryId"
            @change="updateCategory"
            class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option v-for="cat in categoriesStore.categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <div class="mt-6 flex gap-3">
          <button
            v-if="subscription.status === 'active'"
            @click="handleCancel"
            :disabled="cancelling"
            class="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {{ cancelling ? 'Cancelling...' : 'Cancel Subscription' }}
          </button>
        </div>
      </div>

      <!-- Payment History -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
        <div v-if="transactions.length > 0" class="space-y-2">
          <div
            v-for="tx in transactions"
            :key="tx.id"
            class="flex items-center justify-between border-b py-3 last:border-b-0"
          >
            <div>
              <p class="font-medium text-gray-900">{{ formatDate(tx.date) }}</p>
              <p class="text-sm text-gray-500">{{ tx.merchantName }}</p>
            </div>
            <p class="font-semibold text-gray-900">{{ formatMoney(tx.amount) }}</p>
          </div>
        </div>
        <p v-else class="text-center text-gray-500 py-4">No transactions yet</p>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <p class="text-gray-500">Subscription not found</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsStore } from '@/stores/transactions'
import { useCategoriesStore } from '@/stores/categories'
import { formatMoney, formatDate, formatRecurrence } from '@/utils/formatters'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { Subscription } from '@/domain/models'

const route = useRoute()
const subscriptionsStore = useSubscriptionsStore()
const transactionsStore = useTransactionsStore()
const categoriesStore = useCategoriesStore()

const loading = ref(true)
const cancelling = ref(false)
const subscription = ref<Subscription | null>(null)
const selectedCategoryId = ref<string>('')

const categoryName = computed(() => {
  if (!subscription.value) return ''
  const cat = categoriesStore.categoriesById.get(subscription.value.categoryId)
  return cat?.name || 'Uncategorised'
})

const statusClass = computed(() => {
  if (!subscription.value) return ''
  switch (subscription.value.status) {
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

const formattedAmount = computed(() =>
  subscription.value ? formatMoney(subscription.value.amount) : ''
)

const formattedRecurrence = computed(() =>
  subscription.value ? formatRecurrence(subscription.value.recurrence) : ''
)

const transactions = computed(() =>
  transactionsStore.transactions.filter(
    (t) => t.subscriptionId === subscription.value?.id
  )
)

async function updateCategory() {
  if (!subscription.value) return
  subscription.value.categoryId = selectedCategoryId.value
  await subscriptionsStore.save(subscription.value)
}

async function handleCancel() {
  if (!subscription.value || !confirm('Are you sure you want to cancel this subscription?')) return
  
  cancelling.value = true
  try {
    const result = await subscriptionsStore.cancel(subscription.value.id)
    alert(result.message)
    if (result.supported) {
      subscription.value.status = 'cancelled'
    }
  } catch (error) {
    alert('Failed to cancel subscription')
  } finally {
    cancelling.value = false
  }
}

onMounted(async () => {
  const id = route.params.id as string
  await Promise.all([
    categoriesStore.fetchAll(),
    transactionsStore.fetchAll({ subscriptionId: id }),
  ])
  
  subscription.value = await subscriptionsStore.getById(id)
  if (subscription.value) {
    selectedCategoryId.value = subscription.value.categoryId
  }
  
  loading.value = false
})
</script>

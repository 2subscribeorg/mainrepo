<template>
  <div>
    <h2 class="text-3xl font-bold text-gray-900">Budgets</h2>

    <LoadingSpinner v-if="loading" />

    <div v-else class="mt-6 space-y-6">
      <!-- Budget Configuration -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Budget Limits</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Monthly Limit (£)</label>
            <input
              v-model.number="monthlyLimitAmount"
              type="number"
              step="0.01"
              placeholder="No limit set"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Yearly Limit (£)</label>
            <input
              v-model.number="yearlyLimitAmount"
              type="number"
              step="0.01"
              placeholder="No limit set"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <!-- Validation Errors -->
          <div v-if="validationErrors.length > 0" class="rounded-lg bg-red-50 p-3 border border-red-200">
            <p class="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
            <ul class="list-disc list-inside text-sm text-red-700">
              <li v-for="(error, index) in validationErrors" :key="index">{{ error }}</li>
            </ul>
          </div>

          <button
            @click="saveBudget"
            :disabled="saving"
            class="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : 'Save Budget' }}
          </button>
        </div>
      </div>

      <!-- Current Month Status -->
      <div v-if="budgetStore.currentMonthStatus" class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          {{ getMonthName(budgetStore.currentMonthStatus.month) }}
        </h3>

        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Total Spent</span>
            <span class="text-2xl font-bold" :class="budgetStore.hasBreaches ? 'text-red-600' : 'text-gray-900'">
              {{ formatMoney(budgetStore.currentMonthStatus.totalSpent) }}
            </span>
          </div>
          <div v-if="budgetStore.currentMonthStatus.monthlyLimit" class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Budget</span>
            <span class="font-semibold text-gray-900">
              {{ formatMoney(budgetStore.currentMonthStatus.monthlyLimit) }}
            </span>
          </div>
        </div>

        <!-- Budget Breaches -->
        <div v-if="budgetStore.breaches.length > 0" class="mb-6 space-y-2">
          <h4 class="font-semibold text-red-600">⚠️ Budget Breaches</h4>
          <div
            v-for="breach in budgetStore.breaches"
            :key="`${breach.type}-${breach.categoryId || 'general'}`"
            class="rounded-lg bg-red-50 p-3 border border-red-200"
          >
            <p class="font-medium text-red-900">
              {{ breach.categoryName || 'Monthly' }} Budget Exceeded
            </p>
            <p class="text-sm text-red-700">
              Spent {{ formatMoney(breach.spent) }} of {{ formatMoney(breach.limit) }}
              ({{ formatMoney(breach.overage) }} over)
            </p>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="space-y-3">
          <h4 class="font-semibold text-gray-900">Spending by Category</h4>
          <div
            v-for="catStatus in budgetStore.currentMonthStatus.categoryStatus"
            :key="catStatus.categoryId"
            class="rounded-lg border p-3"
            :class="catStatus.isOver ? 'border-red-300 bg-red-50' : 'border-gray-200'"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium" :class="catStatus.isOver ? 'text-red-900' : 'text-gray-900'">
                {{ catStatus.categoryName }}
              </span>
              <span class="font-semibold" :class="catStatus.isOver ? 'text-red-600' : 'text-gray-900'">
                {{ formatMoney(catStatus.spent) }}
              </span>
            </div>
            <div v-if="catStatus.limit" class="mt-1 text-sm text-gray-600">
              Limit: {{ formatMoney(catStatus.limit) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Per-Category Limits -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Per-Category Limits</h3>
        <div class="space-y-3">
          <div
            v-for="category in categoriesStore.categories"
            :key="category.id"
            class="flex items-center gap-3"
          >
            <div
              class="h-4 w-4 rounded-full flex-shrink-0"
              :style="{ backgroundColor: category.colour }"
            />
            <span class="flex-1 text-gray-900">{{ category.name }}</span>
            <input
              v-model.number="categoryLimits[category.id]"
              type="number"
              step="0.01"
              placeholder="No limit"
              class="w-32 rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useCategoriesStore } from '@/stores/categories'
import { useNotificationsStore } from '@/stores/notifications'
import { formatMoney, getMonthName } from '@/utils/formatters'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { BudgetConfig } from '@/domain/models'
import { validateBudget, type BudgetInput } from '@/utils/validation'
import { sanitizeAmount } from '@/utils/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'

const budgetStore = useBudgetStore()
const categoriesStore = useCategoriesStore()
const notificationsStore = useNotificationsStore()

const loading = ref(true)
const saving = ref(false)
const monthlyLimitAmount = ref<number | undefined>()
const yearlyLimitAmount = ref<number | undefined>()
const categoryLimits = ref<Record<string, number | undefined>>({})
const validationErrors = ref<string[]>([])

async function saveBudget() {
  validationErrors.value = []
  
  // Rate limiting
  if (!checkRateLimit('save-budget', RATE_LIMITS.SAVE_DATA)) {
    validationErrors.value = [getRateLimitMessage('save-budget', RATE_LIMITS.SAVE_DATA)]
    return
  }

  // Sanitize inputs
  const sanitizedMonthly = monthlyLimitAmount.value !== undefined 
    ? sanitizeAmount(monthlyLimitAmount.value) 
    : undefined
  const sanitizedYearly = yearlyLimitAmount.value !== undefined 
    ? sanitizeAmount(yearlyLimitAmount.value) 
    : undefined
  
  const sanitizedCategoryLimits: Record<string, number> = {}
  for (const [catId, amount] of Object.entries(categoryLimits.value)) {
    if (amount !== undefined) {
      sanitizedCategoryLimits[catId] = sanitizeAmount(amount)
    }
  }

  // Validate
  const input: BudgetInput = {
    monthlyLimit: sanitizedMonthly,
    yearlyLimit: sanitizedYearly,
    perCategoryLimits: sanitizedCategoryLimits,
  }

  const validation = validateBudget(input)
  if (!validation.isValid) {
    validationErrors.value = validation.errors
    return
  }

  saving.value = true
  try {
    const config: BudgetConfig = {
      currency: 'GBP',
      monthlyLimit: sanitizedMonthly
        ? { amount: sanitizedMonthly, currency: 'GBP' }
        : undefined,
      yearlyLimit: sanitizedYearly
        ? { amount: sanitizedYearly, currency: 'GBP' }
        : undefined,
      perCategoryLimits: {},
    }

    // Add category limits
    for (const [catId, amount] of Object.entries(sanitizedCategoryLimits)) {
      config.perCategoryLimits![catId] = { amount, currency: 'GBP' }
    }

    await budgetStore.updateConfig(config)

    // Check for breaches and notify
    if (budgetStore.hasBreaches) {
      notificationsStore.addNotification({
        type: 'budget_breach',
        title: 'Budget Exceeded',
        message: `You have ${budgetStore.breaches.length} budget breach(es) this month`,
      })
    }

    alert('Budget saved successfully!')
  } catch (error) {
    validationErrors.value = ['Failed to save budget. Please try again.']
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    budgetStore.fetchConfig(),
    budgetStore.evaluateCurrentMonth(),
    categoriesStore.fetchAll(),
  ])

  if (budgetStore.config) {
    monthlyLimitAmount.value = budgetStore.config.monthlyLimit?.amount
    yearlyLimitAmount.value = budgetStore.config.yearlyLimit?.amount

    if (budgetStore.config.perCategoryLimits) {
      for (const [catId, money] of Object.entries(budgetStore.config.perCategoryLimits)) {
        categoryLimits.value[catId] = money.amount
      }
    }
  }

  loading.value = false
})
</script>

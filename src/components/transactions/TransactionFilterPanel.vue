<template>
  <div ref="containerRef" :class="containerClasses">
    <div class="flex items-center justify-between gap-3 slide-down">
      <div>
        <p class="text-[11px] uppercase tracking-[0.3em] text-gray-500">Filters</p>
        <h3 class="text-lg font-semibold text-gray-900">Transactions</h3>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="activeFilterCount > 0"
          class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 fade-in"
        >
          {{ activeFilterCount }} active
        </span>
        <button
          v-if="activeFilterCount > 0"
          @click="$emit('clear-all')"
          class="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors duration-150 btn-animated"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Quick Filter Chips -->
    <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      <button
        v-for="chip in quickFilterChips"
        :key="chip.key"
        type="button"
        class="touch-target rounded-full border text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors"
        style="min-height: 36px; padding: 0.375rem 0.875rem;"
        :class="
          chip.active
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border-light bg-background text-text-secondary'
        "
        @click="toggleQuickFilter(chip.key)"
      >
        {{ chip.label }}
      </button>
    </div>

    <!-- Merchant Search (always visible) -->
    <div class="filter-input-group">
      <label class="filter-label">Merchant</label>
      <input
        data-testid="merchant-search"
        :value="merchantSearchInput"
        @input="merchantSearchInput = sanitizeSearchQuery(($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Search merchants..."
        class="filter-input input-animated"
      />
    </div>

    <!-- Advanced Filters Toggle -->
    <button
      type="button"
      @click="showAdvancedFilters = !showAdvancedFilters"
      class="flex items-center justify-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 py-1"
      :aria-expanded="showAdvancedFilters"
      aria-controls="advanced-filters"
    >
      <ChevronDown
        :size="18"
        class="transition-transform duration-200"
        :class="{ 'rotate-180': showAdvancedFilters }"
      />
      {{ showAdvancedFilters ? 'Hide filters' : 'More filters' }}
    </button>

    <!-- Advanced Filters (collapsible) -->
    <Transition name="expand">
      <div v-show="showAdvancedFilters" id="advanced-filters" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- Account Filter -->
        <div class="filter-input-group">
          <label class="filter-label">Account</label>
          <select 
            data-testid="account-filter"
            :value="filters.selectedAccount"
            @change="$emit('update:selectedAccount', ($event.target as HTMLSelectElement).value)"
            class="filter-input input-animated"
          >
            <option value="">All Accounts</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.institutionName }} - {{ account.accountName }}
            </option>
          </select>
        </div>

        <!-- Subscription Filter -->
        <div class="filter-input-group">
          <label class="filter-label">Type</label>
          <select 
            data-testid="subscription-filter"
            :value="filters.subscriptionFilter"
            @change="$emit('update:subscriptionFilter', ($event.target as HTMLSelectElement).value as 'all' | 'subscriptions')"
            class="filter-input input-animated"
          >
            <option value="all">All Transactions</option>
            <option value="subscriptions">Subscription Transactions</option>
          </select>
        </div>

        <!-- Date Range -->
        <div class="filter-input-group">
          <label class="filter-label">Date Range</label>
          <div class="flex gap-2">
            <input
              :value="filters.dateRange?.start || ''"
              @input="updateDateRange('start', ($event.target as HTMLInputElement).value)"
              type="date"
              :max="todayDate"
              class="filter-input flex-1 input-animated"
            />
            <input
              :value="filters.dateRange?.end || ''"
              @input="updateDateRange('end', ($event.target as HTMLInputElement).value)"
              type="date"
              :max="todayDate"
              class="filter-input flex-1 input-animated"
            />
          </div>
        </div>

        <!-- Amount Range -->
        <div class="filter-input-group">
          <label class="filter-label">Amount Range</label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <input
              :value="filters.amountRange?.min || ''"
              @input="updateAmountRange('min', sanitizeAmount(($event.target as HTMLInputElement).value).toString())"
              type="number"
              inputmode="decimal"
              placeholder="Min"
              class="filter-input flex-1 min-w-0 input-animated"
            />
            <input
              :value="filters.amountRange?.max || ''"
              @input="updateAmountRange('max', sanitizeAmount(($event.target as HTMLInputElement).value).toString())"
              type="number"
              inputmode="decimal"
              placeholder="Max"
              class="filter-input flex-1 min-w-0 input-animated"
            />
          </div>
        </div>

        <!-- Category Filter -->
        <div class="md:col-span-2">
          <label class="filter-label mb-2">Categories</label>
          <div class="flex items-center gap-2">
            <!-- Horizontal scrollable chips -->
            <div class="flex-1 overflow-x-auto scrollbar-hide">
              <div class="flex gap-2 pb-2">
                <button
                  v-for="category in visibleCategories"
                  :key="category.id"
                  type="button"
                  class="touch-target interactive rounded-full border text-sm category-btn gpu-accelerated flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0"
                  style="min-height: var(--touch-target-min); padding: var(--padding-touch-sm);"
                  :class="
                    selectedCategories.has(category.id)
                      ? 'border-primary bg-primary/10 text-primary category-btn--active'
                      : 'border-border-light bg-background text-text-secondary category-btn--default'
                  "
                  :aria-pressed="selectedCategories.has(category.id)"
                  :aria-label="`${category.name} category ${selectedCategories.has(category.id) ? '(selected)' : '(not selected)'}`"
                  @click="toggleCategory(category.id)"
                >
                  {{ category.name }}
                  <span 
                    v-if="selectedCategories.has(category.id)"
                    class="text-xs font-medium"
                    aria-hidden="true"
                  >
                    ×
                  </span>
                </button>
              </div>
            </div>
            
            <!-- All Categories button (only show if there are more categories) -->
            <button
              v-if="hasMoreCategories"
              type="button"
              class="touch-target rounded-full border border-border-medium bg-surface text-text-primary text-sm font-medium whitespace-nowrap flex-shrink-0"
              style="min-height: var(--touch-target-min); padding: var(--padding-touch-sm);"
              @click="showAllCategoriesModal = true"
            >
              All ({{ categories.length }})
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Apply/Clear Buttons (Manual Mode) -->
    <div v-if="mode === 'manual'" class="border-t border-[rgba(15,23,42,0.08)] pt-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-1 gap-2">
          <button
            data-testid="apply-filters-btn"
            @click="$emit('apply-filters')"
            class="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] transition hover:bg-primary/90"
          >
            Apply Filters
          </button>
          <button
            data-testid="clear-all-btn"
            @click="$emit('clear-all')"
            class="flex-1 rounded-2xl border border-[rgba(15,23,42,0.12)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-text-primary hover:bg-[rgba(15,23,42,0.04)]"
          >
            Clear All
          </button>
        </div>
        <span v-if="activeFilterCount > 0" class="text-center text-sm text-text-secondary md:text-right">
          {{ activeFilterCount }} filter{{ activeFilterCount !== 1 ? 's' : '' }} pending
        </span>
      </div>
    </div>

    <!-- Active Filters Display -->
    <div v-if="activeFilterCount > 0" class="border-t border-[rgba(15,23,42,0.08)] pt-4">
      <div class="flex flex-wrap gap-2">
        <span
          v-for="filter in activeFilters"
          :key="filter.key"
          class="inline-flex items-center gap-1 rounded-full bg-[var(--color-background)] px-3 py-1 text-xs font-medium text-text-primary border border-[rgba(15,23,42,0.1)]"
        >
          {{ filter.label }}
          <button
            @click="$emit('clear-filter', filter.key)"
            class="rounded-full p-0.5 text-text-secondary hover:bg-[rgba(15,23,42,0.1)]"
          >
            ×
          </button>
        </span>
      </div>
    </div>

    <!-- All Categories Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showAllCategoriesModal"
          class="fixed inset-0 z-modal-backdrop bg-surface-backdrop flex items-center justify-center p-4"
          @click.self="showAllCategoriesModal = false"
        >
          <div class="bg-surface rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-4 border-b border-border-light">
              <h3 class="text-lg font-semibold text-text-primary">All Categories</h3>
              <button
                @click="showAllCategoriesModal = false"
                class="rounded-full p-2 hover:bg-interactive-hover transition-colors"
                aria-label="Close modal"
              >
                <span class="text-xl text-text-secondary">×</span>
              </button>
            </div>

            <!-- Modal Content - Scrollable -->
            <div class="flex-1 overflow-y-auto p-4">
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="category in categories"
                  :key="category.id"
                  type="button"
                  class="touch-target rounded-full border text-sm category-btn flex items-center justify-center gap-1"
                  style="min-height: var(--touch-target-min); padding: var(--padding-touch-sm);"
                  :class="
                    selectedCategories.has(category.id)
                      ? 'border-primary bg-primary/10 text-primary category-btn--active'
                      : 'border-border-light bg-background text-text-secondary category-btn--default'
                  "
                  @click="toggleCategory(category.id)"
                >
                  {{ category.name }}
                  <span 
                    v-if="selectedCategories.has(category.id)"
                    class="text-xs font-medium"
                    aria-hidden="true"
                  >
                    ×
                  </span>
                </button>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-4 border-t border-border-light">
              <button
                @click="showAllCategoriesModal = false"
                class="w-full bg-primary text-white rounded-full py-3 font-medium hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import type { BankAccount, Category } from '@/domain/models'
import type { TransactionFilterConfig } from '@/stores/transactions'
import { useAnimations } from '@/utils/useAnimations'
import { sanitizeSearchQuery, sanitizeAmount } from '@/utils/sanitize'

interface Props {
  filters: TransactionFilterConfig
  accounts: BankAccount[]
  categories: Category[]
  activeFilterCount: number
  mode?: 'realtime' | 'manual'
  variant?: 'card' | 'sheet'
}

interface Emits {
  (e: 'update:selectedAccount', value: string): void
  (e: 'update:subscriptionFilter', value: 'all' | 'subscriptions'): void
  (e: 'update:merchantSearch', value: string): void
  (e: 'update:dateRange', value: { start: string; end: string }): void
  (e: 'update:amountRange', value: { min: number; max: number }): void
  (e: 'update:categories', value: string[]): void
  (e: 'apply-filters'): void
  (e: 'clear-all'): void
  (e: 'clear-filter', key: string): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'realtime',
  variant: 'card',
})
const emit = defineEmits<Emits>()

// Debounced merchant search
const merchantSearchInput = ref(props.filters.merchantSearch || '')
let merchantSearchTimer: ReturnType<typeof setTimeout> | null = null

watch(merchantSearchInput, (value) => {
  if (merchantSearchTimer) clearTimeout(merchantSearchTimer)
  merchantSearchTimer = setTimeout(() => {
    emit('update:merchantSearch', value)
  }, 250)
})

// Sync from external changes (e.g. clear-all)
watch(() => props.filters.merchantSearch, (value) => {
  if (value !== merchantSearchInput.value) {
    merchantSearchInput.value = value || ''
  }
})

// Quick filter chips
interface QuickFilterChip {
  key: string
  label: string
  active: boolean
}

const isThisMonthActive = computed(() => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  return props.filters.dateRange?.start === monthStart && props.filters.dateRange?.end === today
})

const isLast30DaysActive = computed(() => {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return props.filters.dateRange?.start === thirtyDaysAgo.toISOString().split('T')[0] && props.filters.dateRange?.end === now.toISOString().split('T')[0]
})

const isSubsOnlyActive = computed(() => props.filters.subscriptionFilter === 'subscriptions')

const quickFilterChips = computed<QuickFilterChip[]>(() => [
  { key: 'this-month', label: 'This Month', active: isThisMonthActive.value },
  { key: 'last-30', label: 'Last 30 Days', active: isLast30DaysActive.value },
  { key: 'subs-only', label: 'Subscriptions Only', active: isSubsOnlyActive.value },
])

function toggleQuickFilter(key: string) {
  switch (key) {
    case 'this-month': {
      if (isThisMonthActive.value) {
        emit('update:dateRange', { start: '', end: '' })
      } else {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const today = now.toISOString().split('T')[0]
        emit('update:dateRange', { start: monthStart, end: today })
      }
      break
    }
    case 'last-30': {
      if (isLast30DaysActive.value) {
        emit('update:dateRange', { start: '', end: '' })
      } else {
        const now = new Date()
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        emit('update:dateRange', { start: thirtyDaysAgo.toISOString().split('T')[0], end: now.toISOString().split('T')[0] })
      }
      break
    }
    case 'subs-only': {
      if (isSubsOnlyActive.value) {
        emit('update:subscriptionFilter', 'all')
      } else {
        emit('update:subscriptionFilter', 'subscriptions')
      }
      break
    }
  }
}

// Use animation utilities
const { animateEntrance } = useAnimations()
const containerRef = ref<HTMLElement>()

// Collapsible advanced filters
const showAdvancedFilters = ref(false)

// Category selection state (must be before hasActiveAdvancedFilters which references it)
const selectedCategories = computed(() => new Set(props.filters.categories || []))

// Auto-expand if advanced filters are already active on mount
const hasActiveAdvancedFilters = computed(() => {
  return !!(
    props.filters.selectedAccount ||
    props.filters.subscriptionFilter !== 'all' ||
    props.filters.dateRange?.start ||
    props.filters.dateRange?.end ||
    (props.filters.amountRange && (props.filters.amountRange.min || props.filters.amountRange.max)) ||
    selectedCategories.value.size > 0
  )
})

onMounted(() => {
  if (containerRef.value) {
    animateEntrance(containerRef.value, 'fade-in', 100)
  }
  if (hasActiveAdvancedFilters.value) {
    showAdvancedFilters.value = true
  }
})

// Auto-expand when a new advanced filter becomes active
watch(hasActiveAdvancedFilters, (active) => {
  if (active) showAdvancedFilters.value = true
})

// Get today's date in YYYY-MM-DD format for max date validation
const todayDate = new Date().toISOString().split('T')[0]

// Category filtering - KISS: show top 8, rest in modal
const MAX_VISIBLE_CATEGORIES = 8
const showAllCategoriesModal = ref(false)

const visibleCategories = computed(() => {
  // YAGNI: Simple slice, no complex sorting yet
  return props.categories.slice(0, MAX_VISIBLE_CATEGORIES)
})

const hasMoreCategories = computed(() => props.categories.length > MAX_VISIBLE_CATEGORIES)

const containerClasses = computed(() => {
  if (props.variant === 'sheet') {
    return [
      'rounded-t-3xl bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.15)]',
      'p-6 space-y-6',
    ].join(' ')
  }

  return 'rounded-3xl bg-[var(--color-surface)] p-5 space-y-6 shadow-[0_16px_45px_rgba(15,23,42,0.08)] border border-[rgba(15,23,42,0.08)]'
})

function updateDateRange(type: 'start' | 'end', value: string) {
  const current = props.filters.dateRange || { start: '', end: '' }
  const updated = { ...current, [type]: value }
  emit('update:dateRange', updated)
}

function updateAmountRange(type: 'min' | 'max', value: string) {
  const current = props.filters.amountRange || { min: 0, max: 0 }
  const numValue = parseFloat(value) || 0
  const updated = { ...current, [type]: numValue }
  emit('update:amountRange', updated)
}

function toggleCategory(categoryId: string) {
  const next = new Set(selectedCategories.value)
  if (next.has(categoryId)) {
    next.delete(categoryId)
  } else {
    next.add(categoryId)
  }
  emit('update:categories', Array.from(next) as string[])
}

const activeFilters = computed(() => {
  const filters: Array<{ key: string; label: string }> = []

  if (props.filters.selectedAccount) {
    const account = props.accounts.find((a) => a.id === props.filters.selectedAccount)
    filters.push({
      key: 'selectedAccount',
      label: `Account: ${account?.accountName || 'Unknown'}`,
    })
  }

  if (props.filters.subscriptionFilter !== 'all') {
    filters.push({
      key: 'subscriptionFilter',
      label: `Type: ${props.filters.subscriptionFilter}`,
    })
  }

  if (props.filters.merchantSearch) {
    filters.push({
      key: 'merchantSearch',
      label: `Merchant: ${props.filters.merchantSearch}`,
    })
  }

  if (props.filters.dateRange?.start || props.filters.dateRange?.end) {
    filters.push({
      key: 'dateRange',
      label: `Date: ${props.filters.dateRange.start || 'Start'} → ${props.filters.dateRange.end || 'End'}`,
    })
  }

  if (props.filters.amountRange && (props.filters.amountRange.min || props.filters.amountRange.max)) {
    filters.push({
      key: 'amountRange',
      label: `Amount: ${props.filters.amountRange.min || 0} - ${props.filters.amountRange.max || 0}`,
    })
  }

  if (selectedCategories.value.size > 0) {
    filters.push({
      key: 'categories',
      label: `Categories: ${selectedCategories.value.size}`,
    })
  }

  return filters
})
</script>

<style scoped>
/* Expand/collapse transition for advanced filters */
.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.2s ease-out, max-height 0.3s ease-out;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}

/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--duration-base) var(--ease-out);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-surface,
.modal-leave-active .bg-surface {
  transition: transform var(--duration-base) var(--ease-out);
}

.modal-enter-from .bg-surface {
  transform: scale(0.95);
}

.modal-leave-to .bg-surface {
  transform: scale(0.95);
}

.filter-input-group {
  @apply space-y-2;
}

.filter-label {
  @apply block text-sm font-medium text-gray-900;
}

.filter-input {
  @apply w-full rounded-2xl px-3 py-2 text-sm border border-gray-200 bg-white text-gray-900;
  transition: border-color var(--duration-micro) var(--ease-out),
              box-shadow var(--duration-micro) var(--ease-out),
              transform var(--duration-micro) var(--ease-out);
  transform: translateZ(0); /* GPU acceleration */
}

.filter-input:focus {
  @apply outline-none border-blue-500 ring-2 ring-blue-500/20;
  transform: scale(1.02);
}

.filter-input:hover {
  border-color: rgba(59, 130, 246, 0.5);
}

/* Category button animations */
.category-btn {
  transition: all var(--duration-micro) var(--ease-out);
  transform: translateZ(0); /* GPU acceleration */
}

.category-btn--default:hover {
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.category-btn--default:active {
  transform: translateY(0) scale(0.98);
}

.category-btn--active {
  transform: scale(1.05);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.category-btn--active:hover {
  transform: scale(1.08);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
}

/* Action button animations */
.action-btn {
  transition: all var(--duration-micro) var(--ease-out);
  transform: translateZ(0); /* GPU acceleration */
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-btn:active {
  transform: translateY(0) scale(0.98);
}

/* Filter pill animations */
.filter-pill {
  transition: all var(--duration-micro) var(--ease-out);
}

.filter-pill:hover {
  transform: scale(1.05);
}
</style>

<template>
  <div
    class="rounded-2xl bg-surface shadow-sm border border-border-light hover:shadow-lg transition-fast hover:-translate-y-0.5 transaction-item-hover gpu-accelerated" style="padding: var(--space-4);"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-1 items-start gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-info-bg text-sm font-semibold text-info-text shadow-inner">
          {{ merchantInitial }}
        </div>
        <div class="min-w-0 flex-1">
          <h4 class="text-sm font-semibold text-text-primary truncate">
            {{ transaction.merchantName }}
          </h4>
          <div class="mt-1 flex items-center gap-2 text-xs text-text-secondary">
            <span>{{ formattedDate }}</span>
            <span v-if="transaction.accountId" class="hidden sm:inline">• {{ accountName }}</span>
            <TransactionBadge
              v-if="transaction.pending"
              type="pending"
              text="Pending"
            />
          </div>
        </div>
      </div>
      <div class="text-right">
        <p class="text-base font-semibold" :class="amountColor">
          {{ formattedAmount }}
        </p>
      </div>
    </div>

    <div v-if="hasCategories" class="mt-4 flex flex-wrap gap-2">
      <span
        v-for="category in transaction.category"
        :key="category"
        class="rounded-full border border-border-light bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary"
      >
        {{ category }}
      </span>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <button
        v-if="!transaction.subscriptionId"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 shadow-sm transition-colors"
        @click="handleCreateSubscription"
      >
        <span>+</span>
        Subscription
      </button>

      <div
        v-else
        class="flex w-full flex-col gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_10%,white)] p-3"
      >
        <div class="flex items-center gap-2 text-xs font-semibold text-[color-mix(in_srgb,var(--color-success)_80%,black)]">
          <span class="text-base leading-none">✓</span>
          <span>Subscription</span>
          <span class="text-text-secondary font-normal">
            • {{ currentCategoryName || 'No category assigned' }}
          </span>
        </div>
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <select
            :value="transaction.categoryId || ''"
            @change="handleCategoryChange($event)"
            class="category-dropdown flex-1 rounded-xl border border-[rgba(15,23,42,0.15)] bg-[var(--color-background)] px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            size="1"
          >
            <option value="">{{ currentCategoryName ? 'Change category…' : 'Select category…' }}</option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
            <option value="__create_new__" class="font-semibold text-primary">
              + Create New Category...
            </option>
          </select>
        </div>
        <p class="text-[11px] text-text-secondary">
          Category changes save instantly.
        </p>
      </div>
    </div>

    <!-- Duplicate Subscription Modal -->
    <DuplicateSubscriptionModal
      v-if="duplicateResult"
      :is-open="showDuplicateModal"
      :duplicate-result="duplicateResult"
      :warning-message="warningMessage"
      @add-to-existing="handleAddToExisting"
      @create-separate="handleCreateSeparate"
      @cancel="handleCancelDuplicate"
    />

    <!-- Category Form Modal -->
    <CategoryFormModal
      :show="showCategoryModal"
      :form-data="categoryFormData"
      :saving="savingCategory"
      :editing="false"
      :validation-errors="categoryValidationErrors"
      @update:formData="categoryFormData = $event"
      @save="handleSaveCategory"
      @close="closeCategoryModal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Transaction, Subscription } from '@/domain/models'
import { formatMoney, formatDate } from '@/utils/formatters'
import { DuplicateSubscriptionChecker, type DuplicateCheckResult } from '@/services/DuplicateSubscriptionChecker'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useTransactionsStore } from '@/stores/transactions'
import { useCategoriesStore } from '@/stores/categories'
import TransactionBadge from './TransactionBadge.vue'
import DuplicateSubscriptionModal from '@/components/DuplicateSubscriptionModal.vue'
import CategoryFormModal from '@/components/categories/CategoryFormModal.vue'

interface Props {
  transaction: Transaction
  categories: Array<{id: string, name: string}>
  getAccountName: (accountId: string) => string
  getAmountColor: (amount: number) => string
}

interface CategoryFormData {
  name: string
  colour: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'create-subscription': []
  'edit-subscription': []
  'category-change': [categoryId: string]
  'link-to-existing-subscription': [data: { transactionId: string; subscriptionId: string; categoryId: string }]
}>()

const subscriptionsStore = useSubscriptionsStore()
const transactionsStore = useTransactionsStore()
const categoriesStore = useCategoriesStore()
const duplicateChecker = new DuplicateSubscriptionChecker()

const showDuplicateModal = ref(false)
const duplicateResult = ref<DuplicateCheckResult | null>(null)
const warningMessage = ref('')

// Category creation modal state
const showCategoryModal = ref(false)
const categoryFormData = ref<CategoryFormData>({
  name: '',
  colour: '#3B82F6'
})
const savingCategory = ref(false)
const categoryValidationErrors = ref<string[]>([])

function handleCategoryChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value
  
  // Check if user selected "Create New Category..."
  if (value === '__create_new__') {
    openCategoryModal()
    // Reset the select to current value
    target.value = props.transaction.categoryId || ''
  } else {
    emit('category-change', value)
  }
}

function openCategoryModal() {
  categoryFormData.value = {
    name: '',
    colour: '#3B82F6'
  }
  categoryValidationErrors.value = []
  showCategoryModal.value = true
}

function closeCategoryModal() {
  showCategoryModal.value = false
  categoryFormData.value = {
    name: '',
    colour: '#3B82F6'
  }
  categoryValidationErrors.value = []
}

async function handleSaveCategory() {
  // Validate
  categoryValidationErrors.value = []
  
  if (!categoryFormData.value.name.trim()) {
    categoryValidationErrors.value.push('Category name is required')
    return
  }
  
  // Check for duplicate names
  const duplicateName = props.categories.some(
    cat => cat.name.toLowerCase() === categoryFormData.value.name.trim().toLowerCase()
  )
  
  if (duplicateName) {
    categoryValidationErrors.value.push('A category with this name already exists')
    return
  }
  
  savingCategory.value = true
  
  try {
    // Create new category (trim only - store will handle full validation)
    const newCategory = {
      id: `cat_${Date.now()}`,
      name: categoryFormData.value.name.trim(),
      colour: categoryFormData.value.colour,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await categoriesStore.save(newCategory)
    
    // Automatically assign the new category to this transaction
    emit('category-change', newCategory.id)
    
    closeCategoryModal()
  } catch (error) {
    console.error('Failed to create category:', error)
    categoryValidationErrors.value.push('Failed to create category. Please try again.')
  } finally {
    savingCategory.value = false
  }
}

const merchantInitial = computed(
  () => props.transaction.merchantName?.charAt(0)?.toUpperCase() || '?'
)
const formattedAmount = computed(() => formatMoney(props.transaction.amount))
const formattedDate = computed(() => formatDate(props.transaction.date))
const accountName = computed(() => props.getAccountName(props.transaction.accountId || ''))
const amountColor = computed(() => props.getAmountColor(props.transaction.amount.amount))
const hasCategories = computed(() => 
  props.transaction.category && props.transaction.category.length > 0
)

async function handleCreateSubscription() {
  // Check for duplicates before creating subscription
  const result = duplicateChecker.checkForDuplicates(
    props.transaction,
    subscriptionsStore.subscriptions,
    transactionsStore.transactions
  )

  if (result.isDuplicate) {
    // Show duplicate warning modal
    duplicateResult.value = result
    warningMessage.value = duplicateChecker.generateWarningMessage(result)
    showDuplicateModal.value = true
  } else {
    // No duplicates found, proceed with normal creation
    emit('create-subscription')
  }
}

function handleAddToExisting() {
  showDuplicateModal.value = false
  
  if (duplicateResult.value?.existingSubscription) {
    // Link this transaction to the existing subscription
    const existingSubscription = duplicateResult.value.existingSubscription
    
    // Update the transaction to link it to the existing subscription
    const updatedTransaction = {
      ...props.transaction,
      subscriptionId: existingSubscription.id,
      categoryId: existingSubscription.categoryId // Use the existing subscription's category
    }
    
    // Emit a different event for linking to existing subscription
    emit('link-to-existing-subscription', {
      transactionId: props.transaction.id,
      subscriptionId: existingSubscription.id,
      categoryId: existingSubscription.categoryId
    })
  } else {
    // Fallback to normal creation if no existing subscription found
    emit('create-subscription')
  }
}

function handleCreateSeparate() {
  showDuplicateModal.value = false
  // User confirmed they want to create a separate subscription
  emit('create-subscription')
}

function handleCancelDuplicate() {
  showDuplicateModal.value = false
  duplicateResult.value = null
  warningMessage.value = ''
}
const currentCategoryName = computed(() => {
  if (!props.transaction.categoryId) return ''
  return props.categories.find((c) => c.id === props.transaction.categoryId)?.name || ''
})
</script>

<style scoped>
/* Category dropdown with scrollable options for long lists */
.category-dropdown {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.5rem;
}

/* Limit dropdown height when opened (browser-dependent) */
.category-dropdown option {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

/* Firefox-specific scrollbar for dropdown */
@-moz-document url-prefix() {
  .category-dropdown {
    scrollbar-width: thin;
    scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
  }
}

/* Webkit browsers - style the dropdown when opened */
.category-dropdown:focus {
  max-height: 300px;
}

/* Highlight the "Create New Category" option */
.category-dropdown option[value="__create_new__"] {
  font-weight: 600;
  color: var(--color-primary);
  border-top: 1px solid rgba(15, 23, 42, 0.1);
  margin-top: 0.25rem;
  padding-top: 0.75rem;
}
</style>

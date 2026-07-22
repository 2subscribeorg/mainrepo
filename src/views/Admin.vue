<template>
  <div v-if="authStore.isSuperAdmin">
    <!-- Success Message Announcement -->
    <div 
      v-if="showSuccess" 
      role="status" 
      aria-live="polite"
      class="fixed top-4 right-4 z-toast bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 fade-in"
    >
      <span aria-hidden="true" class="text-green-600">✓</span>
      <span class="font-medium">{{ successMessage }}</span>
    </div>

    <h2 class="text-3xl font-bold text-gray-900">Superadmin</h2>
    <p class="mt-2 text-sm text-gray-600">Manage merchant categorisation rules and system data</p>

    <LoadingSpinner v-if="loading" />

    <div v-else class="mt-6 space-y-6">
      <!-- Merchant Rules -->
      <div class="rounded-lg bg-white p-6 shadow">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Merchant Categorisation Rules</h3>
          <button
            class="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 transition-colors"
            @click="showAddRule = true"
          >
            Add Rule
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="rule in adminStore.merchantRules"
            :key="rule.id"
            class="flex items-center justify-between rounded border p-3"
          >
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ rule.merchantPattern }}</p>
              <p class="text-sm text-gray-500">
                Category: {{ getCategoryName(rule.categoryId) }} | Priority: {{ rule.priority }}
              </p>
            </div>
            <button
              class="text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
              @click="handleDeleteRule(rule)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Add Rule Modal -->
      <div
        v-if="showAddRule"
        class="fixed inset-0 z-modal flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="showAddRule = false"
      >
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
          <h3 class="text-xl font-bold text-gray-900 mb-4">Add Merchant Rule</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Merchant Pattern</label>
              <input
                v-model="newRule.pattern"
                type="text"
                placeholder="e.g., spotify"
                class="block w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                v-model="newRule.categoryId"
                class="block w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                <option value="">Select category</option>
                <option v-for="cat in categoriesStore.categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <!-- Validation Errors -->
            <ValidationErrors v-if="validationErrors.length" :errors="validationErrors" />

            <div class="flex gap-3 pt-4">
              <button
                :disabled="saving"
                class="flex-1 rounded-xl bg-primary px-4 py-3 text-white font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98]"
                @click="saveRule"
              >
                {{ saving ? 'Saving...' : 'Save Rule' }}
              </button>
              <button
                class="rounded-xl border border-gray-200 px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-all active:scale-[0.98]"
                @click="showAddRule = false"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Confirm Dialog for deletions -->
    <ConfirmDialog
      :is-open="showDeleteConfirm"
      :title="`Delete Rule?`"
      :message="`Are you sure you want to delete the rule for '${ruleToDelete?.merchantPattern}'?`"
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="executeDelete"
      @cancel="cancelDelete"
    />
  </div>
  <div v-else class="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
    <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0-6V9m0-6a9 9 0 110 18 9 9 0 010-18z" />
      </svg>
    </div>
    <h2 class="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
    <p class="text-gray-600 mb-6 max-w-md">You do not have the required permissions to access the Superadmin dashboard.</p>
    <button @click="router.push('/')" class="bg-primary text-white px-6 py-2 rounded-xl font-semibold hover:bg-primary/90 transition-all">
      Return to Home
    </button>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { useCategoriesStore } from '@/stores/categories'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ValidationErrors from '@/components/ValidationErrors.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { MerchantCategoryRule } from '@/domain/models'
import { validateMerchantRuleForm } from '@/schemas/form-validation.schema'
import { checkRateLimit, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'
import { useLoadingStates } from '@/composables/useLoadingStates'

const router = useRouter()
const adminStore = useAdminStore()
const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()
const toast = useToast()

// Unified loading states
const { isLoading } = useLoadingStates()
const loading = isLoading('admin')
const saving = isLoading('admin')
const showAddRule = ref(false)
const successMessage = ref('')
const showSuccess = ref(false)
const newRule = ref({
  pattern: '',
  categoryId: '',
})
const validationErrors = ref<string[]>([])

// Custom confirm dialog state
const showDeleteConfirm = ref(false)
const ruleToDelete = ref<MerchantCategoryRule | null>(null)

let successTimeout: ReturnType<typeof setTimeout> | null = null

function showSuccessMessage(message: string) {
  successMessage.value = message
  showSuccess.value = true
  
  if (successTimeout) clearTimeout(successTimeout)
  // Auto-hide after 3 seconds
  successTimeout = setTimeout(() => {
    showSuccess.value = false
    successMessage.value = ''
  }, 3000)
}

function getCategoryName(categoryId: string): string {
  const cat = categoriesStore.categoriesById.get(categoryId)
  return cat?.name || 'Unknown'
}

async function saveRule() {
  validationErrors.value = []
  
  // Rate limiting
  if (!checkRateLimit('save-merchant-rule', RATE_LIMITS.SAVE_DATA)) {
    validationErrors.value = [getRateLimitMessage('save-merchant-rule', RATE_LIMITS.SAVE_DATA)]
    return
  }

  // Validate with Zod (schema auto-sanitizes)
  const input = {
    merchantPattern: newRule.value.pattern,
    categoryId: newRule.value.categoryId,
  }

  const validation = validateMerchantRuleForm(input)
  if (!validation.success) {
    validationErrors.value = validation.error?.issues?.map((err) => err.message) || ['Validation failed']
    return
  }

  try {
    await adminStore.fetchRules()
    const maxPriority = Math.max(...(adminStore.merchantRules.map((r: MerchantCategoryRule) => r.priority) || [0]), 0)

    // Use validated & sanitized data from Zod schema
    const rule: MerchantCategoryRule = {
      id: crypto.randomUUID(),
      merchantPattern: validation.data.merchantPattern,
      categoryId: validation.data.categoryId,
      priority: maxPriority + 1,
    }

    await adminStore.saveRule(rule)
    showAddRule.value = false
    newRule.value = { pattern: '', categoryId: '' }
    validationErrors.value = []
    
    // Show success message
    showSuccessMessage(`Merchant rule "${rule.merchantPattern}" saved successfully!`)
  } catch (_error) {
    validationErrors.value = ['Failed to save rule. Please try again.']
  }
}

function handleDeleteRule(rule: MerchantCategoryRule) {
  ruleToDelete.value = rule
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (!ruleToDelete.value) return

  try {
    await adminStore.deleteRule(ruleToDelete.value.id)
    showDeleteConfirm.value = false
    ruleToDelete.value = null
    showSuccessMessage('Merchant rule deleted successfully!')
  } catch (_error) {
    toast.error('Failed to delete rule')
    showDeleteConfirm.value = false
    ruleToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  ruleToDelete.value = null
}

onMounted(async () => {
  if (!authStore.isSuperAdmin) {
    return
  }

  try {
    await Promise.all([
      adminStore.fetchRules(),
      categoriesStore.fetchAll(),
    ])
  } catch (error) {
    // Handle error gracefully
  }
})

onUnmounted(() => {
  if (successTimeout) clearTimeout(successTimeout)
})
</script>


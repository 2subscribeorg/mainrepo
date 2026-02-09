<template>
  <div>
    <!-- Success Message Announcement -->
    <div 
      v-if="showSuccess" 
      role="status" 
      aria-live="polite"
      class="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 fade-in"
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
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
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
              class="text-red-600 hover:text-red-800"
              @click="deleteRule(rule.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Add Rule Modal -->
      <div
        v-if="showAddRule"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        @click.self="showAddRule = false"
      >
        <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h3 class="text-xl font-bold text-gray-900 mb-4">Add Merchant Rule</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Merchant Pattern</label>
              <input
                v-model="newRule.pattern"
                type="text"
                placeholder="e.g., spotify"
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Category</label>
              <select
                v-model="newRule.categoryId"
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Select category</option>
                <option v-for="cat in categoriesStore.categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <!-- Validation Errors -->
            <ValidationErrors :errors="validationErrors" />

            <div class="flex gap-3 pt-4">
              <button
                :disabled="saving"
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
                @click="saveRule"
              >
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button
                class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                @click="showAddRule = false"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'
import { useCategoriesStore } from '@/stores/categories'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ValidationErrors from '@/components/ValidationErrors.vue'
import type { MerchantCategoryRule } from '@/domain/models'
import { validateMerchantRuleForm } from '@/schemas/form-validation.schema'
import { checkRateLimit, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'

const adminStore = useAdminStore()
const categoriesStore = useCategoriesStore()

const loading = ref(true)
const saving = ref(false)
const showAddRule = ref(false)
const successMessage = ref('')
const showSuccess = ref(false)
const newRule = ref({
  pattern: '',
  categoryId: '',
})
const validationErrors = ref<string[]>([])

function showSuccessMessage(message: string) {
  successMessage.value = message
  showSuccess.value = true
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
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

  saving.value = true
  try {
    await adminStore.fetchRules()
    const maxPriority = Math.max(...(adminStore.merchantRules.map((r) => r.priority) || [0]), 0)

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
  } finally {
    saving.value = false
  }
}

async function deleteRule(id: string) {
  if (!confirm('Delete this rule?')) return

  try {
    await adminStore.deleteRule(id)
    
    // Show success message
    showSuccessMessage('Merchant rule deleted successfully!')
  } catch (_error) {
    alert('Failed to delete rule')
  }
}

onMounted(async () => {
  await Promise.all([
    adminStore.fetchRules(),
    categoriesStore.fetchAll(),
  ])
  loading.value = false
})
</script>

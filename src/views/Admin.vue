<template>
  <div>
    <h2 class="text-3xl font-bold text-gray-900">Superadmin</h2>
    <p class="mt-2 text-sm text-gray-600">Manage merchant categorisation rules and system data</p>

    <LoadingSpinner v-if="loading" />

    <div v-else class="mt-6 space-y-6">
      <!-- Merchant Rules -->
      <div class="rounded-lg bg-white p-6 shadow">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Merchant Categorisation Rules</h3>
          <button
            @click="showAddRule = true"
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
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
              @click="deleteRule(rule.id)"
              class="text-red-600 hover:text-red-800"
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
            <div v-if="validationErrors.length > 0" class="rounded-lg bg-red-50 p-3 border border-red-200">
              <p class="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
              <ul class="list-disc list-inside text-sm text-red-700">
                <li v-for="(error, index) in validationErrors" :key="index">{{ error }}</li>
              </ul>
            </div>

            <div class="flex gap-3 pt-4">
              <button
                @click="saveRule"
                :disabled="saving"
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button
                @click="showAddRule = false"
                class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
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
import type { MerchantCategoryRule } from '@/domain/models'
import { validateMerchantRule, type MerchantRuleInput } from '@/utils/validation'
import { sanitizeMerchantPattern } from '@/utils/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'

const adminStore = useAdminStore()
const categoriesStore = useCategoriesStore()

const loading = ref(true)
const saving = ref(false)
const showAddRule = ref(false)
const newRule = ref({
  pattern: '',
  categoryId: '',
})
const validationErrors = ref<string[]>([])

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

  // Sanitize inputs
  const sanitizedPattern = sanitizeMerchantPattern(newRule.value.pattern)

  // Validate
  const input: MerchantRuleInput = {
    merchantPattern: sanitizedPattern,
    categoryId: newRule.value.categoryId,
  }

  const validation = validateMerchantRule(input)
  if (!validation.isValid) {
    validationErrors.value = validation.errors
    return
  }

  saving.value = true
  try {
    await adminStore.fetchRules()
    const maxPriority = Math.max(...(adminStore.merchantRules.map((r) => r.priority) || [0]), 0)

    const rule: MerchantCategoryRule = {
      id: crypto.randomUUID(),
      merchantPattern: sanitizedPattern,
      categoryId: newRule.value.categoryId,
      priority: maxPriority + 1,
    }

    await adminStore.saveRule(rule)
    showAddRule.value = false
    newRule.value = { pattern: '', categoryId: '' }
    validationErrors.value = []
  } catch (error) {
    validationErrors.value = ['Failed to save rule. Please try again.']
  } finally {
    saving.value = false
  }
}

async function deleteRule(id: string) {
  if (!confirm('Delete this rule?')) return

  try {
    await adminStore.deleteRule(id)
  } catch (error) {
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

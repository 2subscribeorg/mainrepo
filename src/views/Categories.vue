<template>
  <div>
    <div class="flex items-center justify-between">
      <h2 class="text-3xl font-bold text-gray-900">Categories</h2>
      <button
        @click="showAddModal = true"
        class="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
      >
        Add Category
      </button>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="category in categoriesStore.categories"
        :key="category.id"
        class="rounded-lg border bg-white p-4 shadow-sm"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div
              class="h-8 w-8 rounded-full"
              :style="{ backgroundColor: category.colour }"
            />
            <div>
              <h3 class="font-semibold text-gray-900">{{ category.name }}</h3>
              <p v-if="category.monthlyLimit" class="text-sm text-gray-500">
                Limit: {{ formatMoney(category.monthlyLimit) }}
              </p>
            </div>
          </div>
          <button
            @click="editCategory(category)"
            class="text-gray-400 hover:text-gray-600"
          >
            ✎
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div
      v-if="showAddModal || editingCategory"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      @click.self="closeModal"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 class="text-xl font-bold text-gray-900 mb-4">
          {{ editingCategory ? 'Edit Category' : 'Add Category' }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="formData.name"
              type="text"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Color</label>
            <div class="mt-2 flex gap-2 flex-wrap">
              <button
                v-for="color in DEFAULT_COLORS"
                :key="color"
                @click="formData.colour = color"
                class="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                :class="formData.colour === color ? 'border-gray-900' : 'border-transparent'"
                :style="{ backgroundColor: color }"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              Monthly Limit (£) - Optional
            </label>
            <input
              v-model.number="monthlyLimitAmount"
              type="number"
              step="0.01"
              placeholder="No limit"
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

          <div class="flex gap-3 pt-4">
            <button
              @click="saveCategory"
              :disabled="saving"
              class="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
            <button
              v-if="editingCategory"
              @click="deleteCategory"
              class="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Delete
            </button>
            <button
              @click="closeModal"
              class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCategoriesStore } from '@/stores/categories'
import { formatMoney } from '@/utils/formatters'
import { DEFAULT_COLORS } from '@/utils/colors'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { Category } from '@/domain/models'
import { validateCategory, type CategoryInput } from '@/utils/validation'
import { sanitizeCategoryName, sanitizeHexColor, sanitizeAmount } from '@/utils/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'

const categoriesStore = useCategoriesStore()

const loading = ref(true)
const saving = ref(false)
const showAddModal = ref(false)
const editingCategory = ref<Category | null>(null)
const formData = ref({
  name: '',
  colour: DEFAULT_COLORS[0],
})
const monthlyLimitAmount = ref<number | undefined>()
const validationErrors = ref<string[]>([])

function editCategory(category: Category) {
  editingCategory.value = category
  formData.value = {
    name: category.name,
    colour: category.colour || DEFAULT_COLORS[0],
  }
  monthlyLimitAmount.value = category.monthlyLimit?.amount
}

function closeModal() {
  showAddModal.value = false
  editingCategory.value = null
  formData.value = {
    name: '',
    colour: DEFAULT_COLORS[0],
  }
  monthlyLimitAmount.value = undefined
  validationErrors.value = []
}

async function saveCategory() {
  validationErrors.value = []
  
  // Rate limiting
  const rateLimitKey = `save-category-${editingCategory.value?.id || 'new'}`
  if (!checkRateLimit(rateLimitKey, RATE_LIMITS.SAVE_DATA)) {
    validationErrors.value = [getRateLimitMessage(rateLimitKey, RATE_LIMITS.SAVE_DATA)]
    return
  }

  // Sanitize inputs
  const sanitizedName = sanitizeCategoryName(formData.value.name)
  const sanitizedColour = sanitizeHexColor(formData.value.colour)
  const sanitizedLimit = monthlyLimitAmount.value !== undefined 
    ? sanitizeAmount(monthlyLimitAmount.value) 
    : undefined

  // Validate
  const input: CategoryInput = {
    name: sanitizedName,
    colour: sanitizedColour,
    monthlyLimit: sanitizedLimit,
  }

  const validation = validateCategory(input)
  if (!validation.isValid) {
    validationErrors.value = validation.errors
    return
  }

  saving.value = true
  try {
    const category: Category = {
      id: editingCategory.value?.id || crypto.randomUUID(),
      name: sanitizedName,
      colour: sanitizedColour,
      monthlyLimit: sanitizedLimit
        ? { amount: sanitizedLimit, currency: 'GBP' }
        : undefined,
    }

    await categoriesStore.save(category)
    closeModal()
  } catch (error) {
    validationErrors.value = ['Failed to save category. Please try again.']
  } finally {
    saving.value = false
  }
}

async function deleteCategory() {
  if (!editingCategory.value) return
  if (!confirm(`Delete category "${editingCategory.value.name}"?`)) return

  try {
    await categoriesStore.remove(editingCategory.value.id)
    closeModal()
  } catch (error) {
    alert('Failed to delete category')
  }
}

onMounted(async () => {
  await categoriesStore.fetchAll()
  loading.value = false
})
</script>

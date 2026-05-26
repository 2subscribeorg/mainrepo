<template>
  <div class="min-height-screen bg-surface-elevated pb-20">
    <!-- Header -->
    <header class="sticky top-0 z-10 bg-surface border-b border-border-light px-4 py-4 safe-top">
      <div class="flex items-center justify-between max-w-lg mx-auto">
        <button 
          @click="router.back()" 
          class="p-2 -ml-2 rounded-full hover:bg-surface-elevated transition-colors"
          aria-label="Back"
        >
          <ArrowLeft class="w-6 h-6 text-text-primary" />
        </button>
        <h1 class="text-lg font-bold text-text-primary">Subscription Details</h1>
        <button 
          @click="handleEdit" 
          class="p-2 -mr-2 rounded-full hover:bg-surface-elevated transition-colors"
          aria-label="Edit"
        >
          <Edit2 class="w-5 h-5 text-primary" />
        </button>
      </div>
    </header>

    <div class="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <LoadingSpinner />
        <p class="mt-4 text-text-secondary animate-pulse">Loading details...</p>
      </div>

      <div v-else-if="subscription" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Hero Section -->
        <div class="bg-surface rounded-3xl p-8 text-center shadow-sm border border-border-light">
          <div 
            class="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 text-3xl font-bold text-white shadow-inner"
            :style="{ backgroundColor: categoryColor }"
          >
            {{ subscription.merchantName.charAt(0) }}
          </div>
          <h2 class="text-2xl font-bold text-text-primary">{{ subscription.merchantName }}</h2>
          <p class="text-text-secondary font-medium">{{ categoryName }}</p>
          
          <div class="mt-6">
            <p class="text-4xl font-black text-text-primary">{{ formattedAmount }}</p>
            <p class="text-text-secondary font-medium uppercase tracking-wider text-sm mt-1">
              {{ formattedRecurrence }}
            </p>
          </div>
        </div>

        <!-- Info Cards -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-surface rounded-2xl p-4 shadow-sm border border-border-light">
            <p class="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Status</p>
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" :class="statusDotClass"></div>
              <span class="font-bold text-text-primary capitalize">{{ subscription.status }}</span>
            </div>
          </div>
          <div class="bg-surface rounded-2xl p-4 shadow-sm border border-border-light">
            <p class="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Next Payment</p>
            <p class="font-bold text-text-primary">{{ formattedNextDate }}</p>
          </div>
        </div>

        <!-- Payment History Placeholder -->
        <div class="bg-surface rounded-3xl p-6 shadow-sm border border-border-light">
          <h3 class="font-bold text-text-primary mb-4 flex items-center gap-2">
            <History class="w-5 h-5 text-text-secondary" />
            Payment History
          </h3>
          <div class="space-y-4">
            <div v-if="subscription.lastPaymentDate" class="flex items-center justify-between py-2 border-b border-border-light last:border-0">
              <div>
                <p class="font-semibold text-text-primary">Previous Payment</p>
                <p class="text-xs text-text-secondary">{{ formatDate(subscription.lastPaymentDate) }}</p>
              </div>
              <p class="font-bold text-text-primary">{{ formattedAmount }}</p>
            </div>
            <div class="flex items-center justify-center py-8 text-text-secondary italic text-sm">
              More history will appear as transactions are processed.
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-3 pt-4">
          <button 
            v-if="subscription.status === 'active'"
            @click="handlePause"
            class="w-full py-4 bg-surface rounded-2xl font-bold text-text-primary border border-border-light hover:bg-surface-elevated transition-colors flex items-center justify-center gap-2"
          >
            <Pause class="w-5 h-5" />
            Pause Subscription
          </button>
          <button 
            @click="showDeleteConfirm = true"
            class="w-full py-4 bg-error-bg/10 rounded-2xl font-bold text-error-text hover:bg-error-bg/20 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 class="w-5 h-5" />
            Remove Subscription
          </button>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-20 text-center px-6">
        <div class="w-20 h-20 bg-surface-elevated rounded-full flex items-center justify-center mb-4">
          <AlertCircle class="w-10 h-10 text-text-secondary" />
        </div>
        <h2 class="text-xl font-bold text-text-primary">Subscription Not Found</h2>
        <p class="mt-2 text-text-secondary">We couldn't find the subscription details you're looking for.</p>
        <button 
          @click="router.push('/')" 
          class="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30"
        >
          Back to Dashboard
        </button>
      </div>
    </div>

    <ConfirmDialog
      :is-open="showDeleteConfirm"
      title="Remove Subscription?"
      message="Are you sure you want to remove this subscription from your list? This won't cancel the service with the provider."
      confirm-text="Remove"
      variant="danger"
      @confirm="handleDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Edit2, 
  History, 
  Pause, 
  Trash2, 
  AlertCircle 
} from 'lucide-vue-next'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useCategoriesStore } from '@/stores/categories'
import { formatMoney, formatDate, formatRelativeDate, formatRecurrence } from '@/utils/formatters'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { Subscription } from '@/domain/models'

const route = useRoute()
const router = useRouter()
const subscriptionsStore = useSubscriptionsStore()
const categoriesStore = useCategoriesStore()

const subscription = ref<Subscription | null>(null)
const loading = ref(true)
const showDeleteConfirm = ref(false)

const category = computed(() => 
  subscription.value ? categoriesStore.categoriesById.get(subscription.value.categoryId) : null
)

const categoryName = computed(() => category.value?.name || 'Uncategorised')
const categoryColor = computed(() => category.value?.colour || '#9E9E9E')

const formattedAmount = computed(() => 
  subscription.value ? formatMoney(subscription.value.amount) : ''
)

const formattedRecurrence = computed(() => 
  subscription.value ? formatRecurrence(subscription.value.recurrence) : ''
)

const formattedNextDate = computed(() => 
  subscription.value ? formatRelativeDate(subscription.value.nextPaymentDate) : ''
)

const statusDotClass = computed(() => {
  if (!subscription.value) return ''
  switch (subscription.value.status) {
    case 'active': return 'bg-success'
    case 'paused': return 'bg-warning'
    case 'cancelled': return 'bg-error'
    default: return 'bg-text-secondary'
  }
})

onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    try {
      subscription.value = await subscriptionsStore.getById(id)
    } catch (error) {
      console.error('Failed to load subscription:', error)
    } finally {
      loading.value = false
    }
  } else {
    loading.value = false
  }
})

function handleEdit() {
  // Placeholder for edit functionality
  alert('Edit functionality coming soon!')
}

function handlePause() {
  // Placeholder for pause functionality
  alert('Pause functionality coming soon!')
}

async function handleDelete() {
  if (subscription.value) {
    try {
      await subscriptionsStore.remove(subscription.value.id)
      showDeleteConfirm.value = false
      router.push('/')
    } catch (error) {
      alert('Failed to delete subscription')
    }
  }
}
</script>

<style scoped>
.safe-top {
  padding-top: max(1rem, env(safe-area-inset-top));
}
</style>

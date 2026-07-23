<template>
  <div class="onboarding-step">
    <!-- Icon -->
    <div class="flex justify-center mb-6">
      <div class="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary-dark">
        <Sparkles :size="40" class="text-white" />
      </div>
    </div>

    <h2 class="text-2xl font-bold text-text-primary text-center mb-2">Upgrade to 2Subscribe Pro</h2>
    <p class="text-text-secondary text-center mb-8">Unlock the full power of subscription management.</p>

    <!-- Feature comparison -->
    <div class="mb-8 space-y-4">
      <div class="p-5 rounded-2xl bg-surface border border-border-light shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">Free</span>
          <span class="text-sm text-text-secondary">Always included</span>
        </div>
        <ul class="space-y-2">
          <li class="flex items-center gap-2 text-sm text-text-secondary">
            <Check :size="16" class="text-success flex-shrink-0" />
            Track up to 5 subscriptions
          </li>
          <li class="flex items-center gap-2 text-sm text-text-secondary">
            <Check :size="16" class="text-success flex-shrink-0" />
            Renewal reminders
          </li>
          <li class="flex items-center gap-2 text-sm text-text-secondary">
            <Check :size="16" class="text-success flex-shrink-0" />
            1 bank connection
          </li>
        </ul>
      </div>

      <div class="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs font-bold uppercase tracking-wide text-white bg-primary px-2 py-0.5 rounded-full">Pro</span>
          <span class="text-sm font-semibold text-primary">{{ proPrice }}</span>
        </div>
        <ul class="space-y-2">
          <li class="flex items-center gap-2 text-sm text-text-primary">
            <Check :size="16" class="text-primary flex-shrink-0" />
            Unlimited subscriptions
          </li>
          <li class="flex items-center gap-2 text-sm text-text-primary">
            <Check :size="16" class="text-primary flex-shrink-0" />
            Unlimited bank connections
          </li>
          <li class="flex items-center gap-2 text-sm text-text-primary">
            <Check :size="16" class="text-primary flex-shrink-0" />
            Advanced renewal warnings (7 & 14 days)
          </li>
          <li class="flex items-center gap-2 text-sm text-text-primary">
            <Check :size="16" class="text-primary flex-shrink-0" />
            Duplicate subscription detection
          </li>
          <li class="flex items-center gap-2 text-sm text-text-primary">
            <Check :size="16" class="text-primary flex-shrink-0" />
            Spending insights & trends
          </li>
        </ul>
      </div>
    </div>

    <!-- Actions -->
    <div class="space-y-3">
      <button
        class="w-full bg-gradient-to-r from-primary to-primary-dark text-white font-semibold py-3.5 rounded-2xl touch-target-comfortable transition-all active:scale-[0.98] disabled:opacity-50"
        :disabled="loading"
        @click="handleUpgrade"
      >
        {{ loading ? 'Loading...' : 'Start Free Trial' }}
      </button>
      <button
        class="w-full text-text-secondary text-sm font-medium py-2"
        @click="$emit('skip')"
      >
        Continue with Free
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Sparkles, Check } from 'lucide-vue-next'
import { useHaptics } from '@/composables/useHaptics'
import { revenueCat } from '@/services/revenueCat'
import { Purchases } from '@revenuecat/purchases-capacitor'
import type { PurchasesPackage } from '@revenuecat/purchases-typescript-internal-esm'
import { useRouter } from 'vue-router'

defineEmits<{
  skip: []
}>()

const router = useRouter()
const { notification } = useHaptics()

const loading = ref(false)
const proPrice = ref('£2.99/mo')

onMounted(async () => {
  try {
    const { isConfigured } = await Purchases.isConfigured().catch(() => ({ isConfigured: false }))
    if (!isConfigured) return

    const offerings = await Purchases.getOfferings()
    const monthly = offerings?.current?.availablePackages.find((p: PurchasesPackage) => p.identifier === 'monthly')
    if (monthly?.product.priceString) {
      proPrice.value = `${monthly.product.priceString}/mo`
    }
  } catch {
    // Keep default price
  }
})

async function handleUpgrade() {
  loading.value = true
  try {
    const offerings = await Purchases.getOfferings()
    const monthly = offerings?.current?.availablePackages.find((p: PurchasesPackage) => p.identifier === 'monthly')
    if (monthly) {
      await revenueCat.purchase(monthly)
      notification('success')
      router.push('/platform-subscription')
      return
    }
  } catch {
    // User cancelled or purchase failed — fall through
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.onboarding-step {
  max-width: 28rem;
  margin: 0 auto;
  --color-primary-dark: #4A2FB0;
}
</style>

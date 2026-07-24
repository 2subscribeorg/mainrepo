import { computed } from 'vue'
import { billingService } from '@/services/billingService'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useBankAccountsStore } from '@/stores/bankAccounts'

export const FREE_SUBSCRIPTION_LIMIT = 5
export const FREE_BANK_CONNECTION_LIMIT = 1

export const PLAN_LIMIT_ERROR = 'PLAN_LIMIT_REACHED'

export function usePlanLimits() {
  const isPro = computed(() => billingService.isProReactive.value)

  const subscriptionLimit = computed(() =>
    isPro.value ? Infinity : FREE_SUBSCRIPTION_LIMIT
  )

  const bankConnectionLimit = computed(() =>
    isPro.value ? Infinity : FREE_BANK_CONNECTION_LIMIT
  )

  const subscriptionsStore = useSubscriptionsStore()
  const bankAccountsStore = useBankAccountsStore()

  const activeSubscriptionCount = computed(
    () => subscriptionsStore.subscriptions.filter(s => s.status === 'active').length
  )

  const activeBankConnectionCount = computed(
    () => bankAccountsStore.connections.filter(c => c.status !== 'disconnected').length
  )

  function canAddSubscription(): boolean {
    if (isPro.value) return true
    return activeSubscriptionCount.value < FREE_SUBSCRIPTION_LIMIT
  }

  function canConnectBank(): boolean {
    if (isPro.value) return true
    return activeBankConnectionCount.value < FREE_BANK_CONNECTION_LIMIT
  }

  return {
    isPro,
    subscriptionLimit,
    bankConnectionLimit,
    activeSubscriptionCount,
    activeBankConnectionCount,
    canAddSubscription,
    canConnectBank,
  }
}

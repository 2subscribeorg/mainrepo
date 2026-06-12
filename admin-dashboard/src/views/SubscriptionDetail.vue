<template>
  <div>
    <n-page-header style="margin-bottom: 24px" @back="router.back()">
      <template #title>{{ user?.displayName || user?.email || 'User' }}</template>
      <template #subtitle>{{ user?.email }}</template>
      <template #extra>
        <n-space>
          <n-tag v-if="user" :type="planTagTypes[user.appPlan]" size="small">
            {{ planLabels[user.appPlan] }}
          </n-tag>
          <n-tag v-if="sub?.pendingCancellation" type="warning" size="small">Cancellation Pending</n-tag>
        </n-space>
      </template>
    </n-page-header>

    <n-spin :show="loading">
      <n-grid v-if="user" :cols="1" :y-gap="16">

        <!-- Subscription -->
        <n-gi>
          <n-card title="Subscription">
            <n-spin :show="subLoading">
              <template v-if="sub">
                <n-descriptions :column="2" label-placement="top" label-style="color: #999; font-size: 12px">
                  <n-descriptions-item label="Status">
                    <n-tag size="small" :type="sub.subscriptionStatus === 'active' ? 'success' : 'default'">
                      {{ sub.subscriptionStatus }}
                    </n-tag>
                  </n-descriptions-item>
                  <n-descriptions-item label="Product ID">
                    {{ sub.subscriptionProductId || '—' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="Expires At">
                    {{ sub.subscriptionExpiresAt ? formatDate(sub.subscriptionExpiresAt) : '—' }}
                  </n-descriptions-item>
                  <n-descriptions-item label="RevenueCat User ID">
                    <n-ellipsis style="max-width: 240px">{{ sub.revenueCatUserId || '—' }}</n-ellipsis>
                  </n-descriptions-item>
                </n-descriptions>

                <template v-if="sub.subscriptionStatus === 'active'">
                  <n-divider style="margin: 16px 0 12px" />
                  <n-button
                    v-if="canWriteSubscriptions && !sub.pendingCancellation"
                    type="error"
                    ghost
                    :loading="cancelling"
                    @click="showCancelConfirm = true"
                  >
                    Cancel Subscription
                  </n-button>
                  <n-tag v-else-if="sub.pendingCancellation" type="warning">
                    Cancels at billing period end ({{ sub.subscriptionExpiresAt ? formatDateShort(sub.subscriptionExpiresAt) : '—' }})
                  </n-tag>
                </template>
              </template>
              <n-empty v-else-if="!subLoading" description="No subscription data" size="small" />
            </n-spin>
          </n-card>
        </n-gi>

        <!-- Recent Invoices -->
        <n-gi>
          <n-card title="Recent Invoices">
            <n-spin :show="subLoading">
              <n-data-table
                v-if="sub && sub.invoices.length > 0"
                :columns="invoiceColumns"
                :data="sub.invoices"
                size="small"
                :pagination="false"
              />
              <n-empty v-else-if="!subLoading" description="No invoices found" size="small" />
            </n-spin>
          </n-card>
        </n-gi>

      </n-grid>

      <n-empty v-else-if="!loading" description="User not found">
        <template #extra>
          <n-button @click="router.back()">Go Back</n-button>
        </template>
      </n-empty>
    </n-spin>

    <!-- Cancel confirm modal -->
    <n-modal
      v-model:show="showCancelConfirm"
      preset="dialog"
      type="warning"
      title="Cancel Subscription"
      positive-text="Yes, Cancel"
      negative-text="Keep Subscription"
      :loading="cancelling"
      @positive-click="handleCancelSubscription"
    >
      The subscription will remain active until the current billing period ends
      ({{ sub?.subscriptionExpiresAt ? formatDateShort(sub.subscriptionExpiresAt) : 'billing end date' }}).
      A cancellation email will be sent to the user.
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, NEllipsis, NTag } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types/api'
import { usersApi, type SubscriptionDetails, type SubscriptionInvoice } from '@/api/users'
import { format } from 'date-fns'

type AppPlan = 'free' | 'monthly' | 'annual' | 'lifetime'

const planLabels: Record<AppPlan, string> = {
  free: 'Free', monthly: 'Pro Monthly', annual: 'Pro Annual', lifetime: 'Lifetime',
}
const planTagTypes: Record<AppPlan, 'default' | 'info' | 'success' | 'warning'> = {
  free: 'default', monthly: 'info', annual: 'success', lifetime: 'warning',
}

const router = useRouter()
const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()

const canWriteSubscriptions = computed(() => authStore.permissions.includes('subscriptions_write'))

const user = ref<User | null>(null)
const sub = ref<SubscriptionDetails | null>(null)
const loading = ref(true)
const subLoading = ref(false)
const cancelling = ref(false)
const showCancelConfirm = ref(false)

function formatDate(val: string) {
  try { return format(new Date(val), 'dd MMM yyyy, HH:mm') } catch { return '—' }
}
function formatDateShort(val: string) {
  try { return format(new Date(val), 'dd MMM yyyy') } catch { return '—' }
}

const invoiceColumns: DataTableColumns<SubscriptionInvoice> = [
  {
    title: 'Transaction ID',
    key: 'transactionId',
    width: 200,
    render: (row) => h(NEllipsis, { style: 'max-width: 190px' }, { default: () => row.transactionId }),
  },
  {
    title: 'Product',
    key: 'productId',
    width: 150,
    render: (row) => row.productId || '—',
  },
  {
    title: 'Amount',
    key: 'amount',
    width: 100,
    render: (row) => row.amount ? `${row.currency} ${(row.amount / 100).toFixed(2)}` : '—',
  },
  {
    title: 'Type',
    key: 'type',
    width: 100,
    render: (row) => h(NTag, { size: 'small', type: row.type === 'cancellation' ? 'error' : 'success' }, { default: () => row.type }),
  },
  {
    title: 'Auto Renews',
    key: 'autoRenews',
    width: 100,
    render: (row) => h(NTag, { size: 'small', type: row.autoRenews ? 'success' : 'default' }, { default: () => row.autoRenews ? 'Yes' : 'No' }),
  },
  {
    title: 'Date',
    key: 'purchasedAt',
    width: 150,
    render: (row) => row.purchasedAt ? formatDate(row.purchasedAt) : '—',
  },
]

async function load() {
  loading.value = true
  try {
    const res = await usersApi.getUser(route.params.userId as string)
    user.value = res.user as User
  } catch {
    message.error('Failed to load user')
  } finally {
    loading.value = false
  }
  loadSubscription()
}

async function loadSubscription() {
  subLoading.value = true
  try {
    sub.value = await usersApi.getUserSubscription(route.params.userId as string)
  } catch (err: any) {
    console.error('Failed to load subscription:', err?.response?.data || err?.message)
  } finally {
    subLoading.value = false
  }
}

async function handleCancelSubscription() {
  if (!user.value) return
  cancelling.value = true
  try {
    await usersApi.cancelSubscription(user.value.id)
    message.success('Subscription cancelled — user will be notified by email')
    await loadSubscription()
  } catch (err: any) {
    message.error(err?.response?.data?.error?.message || 'Failed to cancel subscription')
  } finally {
    cancelling.value = false
    showCancelConfirm.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="subscription-manager">
    <h2 class="title">Platform Subscription</h2>
    <p class="subtitle">Manage your 2Subscribe subscription</p>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading subscription details...</p>
    </div>

    <div v-else-if="error" class="error-banner">
      <p>{{ error }}</p>
      <button class="btn-retry" @click="initialize">Retry</button>
    </div>

    <div v-if="isPro" class="pro-badge-banner">
      <div class="pro-badge">
        <span class="pro-icon">👑</span>
        <span class="pro-text">Pro User</span>
      </div>
      <p>You have access to all premium features!</p>
    </div>

    <!-- Pricing plans — shown whether free OR pro (pro plans are disabled/labelled) -->
    <div class="pricing-section">
      <h3>{{ isPro ? 'Your Plan' : 'Upgrade to Premium' }}</h3>
      <div v-if="availablePlans.length === 0" class="empty-plans">
        No subscription plans are available right now. Please try again later.
      </div>
      <div class="pricing-cards">
        <div
          v-for="plan in availablePlans"
          :key="plan.id"
          class="pricing-card"
          :class="{
            recommended: plan.id === '$rc_annual' && !isPro,
            'pricing-card--active': isActivePlan(plan.id),
          }"
        >
          <div v-if="isActivePlan(plan.id)" class="active-badge">Your Plan</div>
          <div v-else-if="plan.id === '$rc_annual' && !isPro" class="recommended-badge">Best Value</div>
          <h4>{{ plan.name }}</h4>
          <div class="price">
            <span class="currency">{{ currencySymbol(plan.currency) }}</span>
            <span class="amount">{{ plan.price.toFixed(2) }}</span>
            <span class="interval">/ {{ plan.interval }}</span>
          </div>
          <ul class="features">
            <li v-for="feature in plan.features" :key="feature">
              <span class="checkmark">✓</span> {{ feature }}
            </li>
          </ul>
          <button
            :disabled="purchasing || isActivePlan(plan.id)"
            class="btn-subscribe"
            :class="{ 'btn-subscribe--active': isActivePlan(plan.id) }"
            @click="purchase(plan.id)"
          >
            <template v-if="isActivePlan(plan.id)">✓ Active</template>
            <template v-else-if="purchasing && purchasingPlanId === plan.id">Processing...</template>
            <template v-else>Subscribe</template>
          </button>
        </div>
      </div>
    </div>

    <!-- Active subscription management — only shown when pro -->
    <div v-if="isPro" class="active-subscription">
      <div class="subscription-card">
        <div class="subscription-header">
          <div>
            <h3>{{ currentPlan?.name || 'Premium' }} — Active</h3>
            <span class="status-badge status-active">Active</span>
          </div>
        </div>

        <div class="subscription-details">
          <div class="detail-row">
            <span class="label">Plan:</span>
            <span class="value">{{ currentPlan ? `${currencySymbol(currentPlan.currency)}${currentPlan.price}/${currentPlan.interval}` : 'Premium' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value">Premium features unlocked</span>
          </div>
        </div>

        <div class="subscription-actions">
          <button @click="restorePurchases" :disabled="actionInProgress" class="btn-secondary-action">
            <span v-if="actionInProgress && activeAction === 'restore'">Refreshing...</span>
            <span v-else>Restore / Renew</span>
          </button>
          <button @click="manageSubscription" :disabled="actionInProgress" class="btn-secondary-action">
            <span v-if="actionInProgress && activeAction === 'manage'">Opening...</span>
            <span v-else>Manage / Pause</span>
          </button>
          <button @click="showCancelConfirm = true" :disabled="actionInProgress" class="btn-cancel">
            Cancel Subscription
          </button>
        </div>
      </div>

      <div v-if="successMessage" class="success-banner">
        {{ successMessage }}
      </div>
    </div>

    <!-- Free plan restore section (shown when not pro) -->
    <div v-if="!isPro" class="restore-section">
      <p class="restore-hint">Already purchased a plan? Restore it to this device.</p>
      <button @click="restorePurchases" :disabled="actionInProgress" class="btn-secondary-action">
        <span v-if="actionInProgress && activeAction === 'restore'">Refreshing...</span>
        <span v-else>Restore Purchases</span>
      </button>
      <div v-if="successMessage" class="success-banner" style="margin-top: 1rem;">
        {{ successMessage }}
      </div>
    </div>

    <!-- Cancel Confirmation Dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCancelConfirm" class="modal-overlay" @click.self="showCancelConfirm = false">
          <div class="modal-content">
            <h3>Cancel Subscription</h3>
            <p class="warning-text">
              Are you sure you want to cancel? You will lose access to all premium features.
            </p>
            <div class="modal-actions">
              <button class="btn-modal-secondary" @click="showCancelConfirm = false">
                Keep Subscription
              </button>
              <button class="btn-modal-danger" :disabled="actionInProgress" @click="cancelSubscription">
                <span v-if="actionInProgress && activeAction === 'cancel'">Cancelling...</span>
                <span v-else>Yes, Cancel</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div v-if="!loading && transactions.length > 0" class="transaction-history">
      <button class="transaction-history-toggle" @click="showHistory = !showHistory">
        <h3>Transaction History</h3>
        <span class="toggle-icon">{{ showHistory ? '▲' : '▼' }}</span>
      </button>

      <template v-if="showHistory">
        <p class="transaction-subtitle">Your billing history from RevenueCat</p>

        <div class="transactions-list">
          <div
            v-for="transaction in transactions"
            :key="transaction.id"
            class="transaction-item"
            :class="{ 'transaction-failed': transaction.status === 'failed' }"
          >
            <div class="transaction-main">
              <div class="transaction-info">
                <div class="transaction-type">{{ formatTransactionType(transaction.type) }}</div>
                <div class="transaction-date">{{ formatDate(transaction.timestamp) }}</div>
              </div>
              <div class="transaction-amount" :class="{ refund: transaction.type === 'refund' }">
                {{ transaction.type === 'refund' ? '-' : '+' }}{{ formatCurrency(transaction.amount) }}
              </div>
            </div>

            <div class="transaction-details">
              <div class="detail">
                <span class="detail-label">Product:</span>
                <span class="detail-value">{{ formatProductName(transaction.productId) }}</span>
              </div>
              <div class="detail">
                <span class="detail-label">Status:</span>
                <span class="detail-value" :class="`status-${transaction.status}`">
                  {{ transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) }}
                </span>
              </div>
              <div v-if="transaction.autoRenews" class="detail">
                <span class="detail-label">Auto-Renew:</span>
                <span class="detail-value auto-renew">Enabled</span>
              </div>
            </div>
          </div>
        </div>

        <div class="transaction-summary">
          <div class="summary-item">
            <span class="summary-label">Total Spent:</span>
            <span class="summary-value">{{ formatCurrency(totalSpent) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Transactions:</span>
            <span class="summary-value">{{ transactions.length }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { billingService } from '@/services/billingService'
import { revenueCat, type PurchaseTransaction } from '@/services/revenueCat'
import { useAuth } from '@/composables/useAuth'

const { userId } = useAuth()

const loading = ref(true)
const error = ref<string | null>(null)
const purchasing = ref(false)
const purchasingPlanId = ref<string | null>(null)
const actionInProgress = ref(false)
const activeAction = ref<'restore' | 'cancel' | 'manage' | null>(null)
const successMessage = ref<string | null>(null)
const transactions = ref<PurchaseTransaction[]>([])
const showHistory = ref(false)
const showCancelConfirm = ref(false)

const isPro = billingService.isProReactive
const currentPlan = billingService.activePlan

const availablePlans = computed(() =>
  billingService.getPricingPlans().filter(p => p.id !== 'free')
)

function isActivePlan(planId: string): boolean {
  return isPro.value && currentPlan.value?.id === planId
}

function currencySymbol(currency: string): string {
  try {
    return (0).toLocaleString('en', { style: 'currency', currency, minimumFractionDigits: 0 }).replace(/\d/g, '').trim()
  } catch {
    return currency
  }
}

const totalSpent = computed(() =>
  transactions.value
    .filter(t => t.type !== 'refund' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)
)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTransactionType(type: PurchaseTransaction['type']): string {
  const labels: Record<PurchaseTransaction['type'], string> = {
    purchase: 'Purchase',
    refund: 'Refund',
    subscription: 'New Subscription',
    renewal: 'Renewal',
  }
  return labels[type]
}

function formatProductName(productId: string): string {
  return billingService.getPricingPlans().find(p => p.id === productId)?.name ?? productId
}

onMounted(initialize)

async function initialize(): Promise<void> {
  if (!userId.value) {
    error.value = 'User not authenticated'
    loading.value = false
    return
  }
  try {
    loading.value = true
    error.value = null
    await billingService.initialize()
    transactions.value = await revenueCat.fetchTransactionHistory()
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to initialize billing service'
  } finally {
    loading.value = false
  }
}

async function purchase(planId: string): Promise<void> {
  if (purchasing.value) return
  // Block re-purchase of already active plan
  if (isActivePlan(planId)) {
    error.value = 'You are already subscribed to this plan.'
    setTimeout(() => { error.value = null }, 4000)
    return
  }
  try {
    purchasing.value = true
    purchasingPlanId.value = planId
    error.value = null
    const result = await billingService.purchase(planId)
    if (result.success) {
      successMessage.value = 'Subscription updated successfully!'
      await reloadBillingState()
      setTimeout(() => { successMessage.value = null }, 5000)
    } else {
      error.value = result.error ?? 'Purchase failed'
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Purchase failed'
  } finally {
    purchasing.value = false
    purchasingPlanId.value = null
  }
}

async function cancelSubscription(): Promise<void> {
  if (actionInProgress.value) return
  showCancelConfirm.value = false
  try {
    actionInProgress.value = true
    activeAction.value = 'cancel'
    error.value = null
    const result = await billingService.cancelSubscription()
    if (result.openedManagement) {
      successMessage.value = 'Subscription management opened. Use your app store to cancel or pause.'
    } else {
      // Do NOT flip local state — let RC confirm cancellation on next refresh
      successMessage.value = 'Cancellation request sent. Your plan stays active until the current period ends.'
      await reloadBillingState()
    }
    setTimeout(() => { successMessage.value = null }, 7000)
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to cancel subscription'
  } finally {
    actionInProgress.value = false
    activeAction.value = null
  }
}

async function manageSubscription(): Promise<void> {
  if (actionInProgress.value) return
  try {
    actionInProgress.value = true
    activeAction.value = 'manage'
    error.value = null
    const opened = await billingService.openSubscriptionManagement()
    if (opened) {
      successMessage.value = 'Subscription management opened in your browser.'
    } else {
      successMessage.value = 'No management link available. Use your device\'s app store to manage your subscription.'
    }
    setTimeout(() => { successMessage.value = null }, 6000)
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to open subscription management'
  } finally {
    actionInProgress.value = false
    activeAction.value = null
  }
}

async function restorePurchases(): Promise<void> {
  if (actionInProgress.value) return
  try {
    actionInProgress.value = true
    activeAction.value = 'restore'
    error.value = null
    const result = await billingService.restorePurchases()
    if (result.success) {
      successMessage.value = isPro.value
        ? 'Purchases verified — your plan is active.'
        : 'Purchases restored successfully!'
      await reloadBillingState()
      setTimeout(() => { successMessage.value = null }, 5000)
    } else {
      error.value = 'No active purchases found for this account. If you purchased on a different account, sign in with that account and try again.'
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to restore purchases'
  } finally {
    actionInProgress.value = false
    activeAction.value = null
  }
}

async function reloadBillingState(): Promise<void> {
  await billingService.refreshSubscriptionStatus()
  transactions.value = await revenueCat.fetchTransactionHistory()
}
</script>

<style scoped>
.subscription-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--color-text-primary);
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
}

.pro-badge-banner {
  background: linear-gradient(135deg, var(--color-primary) 0%, #1e3a8a 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  color: #fff;
  text-align: center;
}

.pro-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.pro-icon { font-size: 1.2rem; }

.pro-text {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(31, 41, 55, 0.1);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: var(--color-expense);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-retry {
  background: var(--color-expense);
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.success-banner {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 8px;
  padding: 1rem;
  color: var(--color-income);
  margin-top: 1rem;
}

.current-plan-card {
  background: var(--color-bg-primary);
  border: 1px solid rgba(31, 41, 55, 0.08);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.current-plan-card h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.plan-description { color: var(--color-text-secondary); }

.pricing-section h3 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.pricing-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.pricing-card {
  background: var(--color-bg-primary);
  border: 2px solid rgba(31, 41, 55, 0.08);
  border-radius: 12px;
  padding: 2rem;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1);
}

.pricing-card.recommended {
  border-color: var(--color-primary);
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.2);
}

.recommended-badge {
  position: absolute;
  top: -12px;
  right: 1rem;
  background: var(--color-primary);
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.active-badge {
  position: absolute;
  top: -12px;
  right: 1rem;
  background: var(--color-income);
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.pricing-card--active {
  border-color: var(--color-income);
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.15);
}

.btn-subscribe--active {
  background: var(--color-income) !important;
  cursor: default;
}

.restore-section {
  margin-top: 1.5rem;
  text-align: center;
}

.restore-hint {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
}

/* Cancel confirmation modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 100%;
}

.modal-content h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #1a1a1a;
}

.warning-text {
  color: #555;
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-modal-secondary {
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  background: #f3f4f6;
  color: #1a1a1a;
  border: none;
  transition: background 0.2s;
}

.btn-modal-secondary:hover { background: #e5e7eb; }

.btn-modal-danger {
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  background: #dc2626;
  color: #fff;
  border: none;
  transition: background 0.2s;
}

.btn-modal-danger:hover:not(:disabled) { background: #b91c1c; }
.btn-modal-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.subscription-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(31, 41, 55, 0.08);
}

.pricing-card h4 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.price {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.currency {
  font-size: 1.5rem;
  vertical-align: super;
}

.interval {
  font-size: 1rem;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.features {
  list-style: none;
  padding: 0;
  margin-bottom: 1.5rem;
}

.features li {
  padding: 0.5rem 0;
  color: var(--color-text-secondary);
}

.checkmark {
  color: var(--color-income);
  font-weight: 700;
  margin-right: 0.5rem;
}

.btn-subscribe {
  width: 100%;
  background: var(--color-primary);
  color: #fff;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-subscribe:hover:not(:disabled) { background: #1d4ed8; }
.btn-subscribe:disabled { opacity: 0.5; cursor: not-allowed; }

.subscription-card {
  background: var(--color-bg-primary);
  border: 1px solid rgba(31, 41, 55, 0.08);
  border-radius: 12px;
  padding: 2rem;
}

.subscription-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(31, 41, 55, 0.08);
}

.subscription-header h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-active {
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-income);
}

.subscription-details { margin-bottom: 2rem; }

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.detail-row .label {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.detail-row .value { color: var(--color-text-primary); }

.subscription-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn-secondary-action {
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid rgba(31, 41, 55, 0.16);
}

.btn-secondary-action:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-secondary-action:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-cancel {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-expense);
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.btn-cancel:hover:not(:disabled) {
  background: var(--color-expense);
  color: #fff;
}

.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.upgrade-section {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(31, 41, 55, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.plan-switch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}

.empty-plans {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  padding: 1rem;
}

.upgrade-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.btn-upgrade {
  flex: none;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: var(--color-income);
  color: #fff;
  white-space: nowrap;
}

.btn-upgrade:hover:not(:disabled) { background: #0d9665; }
.btn-upgrade:disabled { opacity: 0.5; cursor: not-allowed; }

.transaction-history {
  background: var(--color-bg-primary);
  border: 1px solid rgba(31, 41, 55, 0.08);
  border-radius: 12px;
  padding: 1.5rem 2rem;
  margin-top: 2rem;
}

.transaction-history-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.transaction-history-toggle h3 {
  font-size: 1.25rem;
  margin: 0;
  color: var(--color-text-primary);
}

.toggle-icon {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.transaction-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
  font-style: italic;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.transaction-item {
  background: var(--color-bg-secondary);
  border: 1px solid rgba(31, 41, 55, 0.08);
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s;
}

.transaction-item:hover {
  border-color: rgba(31, 41, 55, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.transaction-item.transaction-failed {
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.05);
}

.transaction-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.transaction-info { flex: 1; }

.transaction-type {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.transaction-date {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.transaction-amount {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-income);
}

.transaction-amount.refund { color: var(--color-expense); }

.transaction-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(31, 41, 55, 0.08);
}

.detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.detail-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.detail-value {
  color: var(--color-text-primary);
  font-weight: 600;
}

.detail-value.status-completed {
  color: var(--color-income);
  background: rgba(16, 185, 129, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.detail-value.status-failed {
  color: var(--color-expense);
  background: rgba(239, 68, 68, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.detail-value.status-pending {
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.detail-value.auto-renew {
  color: var(--color-income);
  background: rgba(16, 185, 129, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.transaction-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(31, 41, 55, 0.08);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: 0.875rem;
}

.summary-value {
  color: var(--color-text-primary);
  font-weight: 700;
  font-size: 1.125rem;
}
</style>

<template>
  <div class="subscription-manager">
    <h2 class="title">Platform Subscription</h2>
    <p class="subtitle">Manage your 2Subscribe subscription</p>

    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading subscription details...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-banner">
      <p>{{ error }}</p>
      <button @click="initialize" class="btn-retry">Retry</button>
    </div>

    <!-- Pro User Badge -->
    <div v-if="isPro" class="pro-badge-banner">
      <div class="pro-badge">
        <span class="pro-icon">👑</span>
        <span class="pro-text">Pro User</span>
      </div>
      <p>You have access to all premium features!</p>
    </div>

    <!-- No subscription (Free plan) -->
    <div v-if="!isPro" class="no-subscription">
      <div class="current-plan-card">
        <h3>Current Plan: Free</h3>
        <p class="plan-description">You're currently on the free plan with limited features.</p>
      </div>

      <div class="pricing-section">
        <h3>Upgrade to Premium</h3>
        <div class="pricing-cards">
          <div
            v-for="plan in availablePlans"
            :key="plan.id"
            class="pricing-card"
            :class="{ recommended: plan.id === 'annual' }"
          >
            <div v-if="plan.id === 'annual'" class="recommended-badge">Best Value</div>
            <h4>{{ plan.name }}</h4>
            <div class="price">
              <span class="currency">£</span>
              <span class="amount">{{ plan.price.toFixed(2) }}</span>
              <span class="interval">/ {{ plan.interval }}</span>
            </div>
            <ul class="features">
              <li v-for="feature in plan.features" :key="feature">
                <span class="checkmark">✓</span> {{ feature }}
              </li>
            </ul>
            <button
              @click="purchase(plan.id)"
              :disabled="purchasing"
              class="btn-subscribe"
            >
              {{ purchasing ? 'Processing...' : 'Subscribe' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Active subscription -->
    <div v-else class="active-subscription">
      <div class="subscription-card">
        <div class="subscription-header">
          <div>
            <h3>Pro Plan Active</h3>
            <span class="status-badge status-active">Active</span>
          </div>
          <div class="subscription-actions">
            <button
              @click="cancelSubscription"
              :disabled="actionInProgress"
              class="btn-cancel"
            >
              {{ actionInProgress ? 'Processing...' : 'Cancel Subscription' }}
            </button>
          </div>
        </div>

        <div class="subscription-details">
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value">Premium features unlocked</span>
          </div>
          <div class="detail-row">
            <span class="label">Access:</span>
            <span class="value">All features available</span>
          </div>
        </div>
      </div>

      <!-- Success message -->
      <div v-if="successMessage" class="success-banner">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { billingService } from '@/services/billingService'
import { useAuth } from '@/composables/useAuth'

const { userId } = useAuth()

const loading = ref(true)
const error = ref<string | null>(null)
const purchasing = ref(false)
const actionInProgress = ref(false)
const successMessage = ref<string | null>(null)

// Reactive pro status from billing service
const isPro = billingService.isProReactive

// Available plans (excluding free)
const availablePlans = computed(() => 
  billingService.getPricingPlans().filter(plan => plan.id !== 'free')
)

onMounted(async () => {
  await initialize()
})

async function initialize() {
  if (!userId.value) {
    error.value = 'User not authenticated'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null
    await billingService.initialize(userId.value)
  } catch (err: any) {
    error.value = err.message || 'Failed to initialize billing service'
  } finally {
    loading.value = false
  }
}

async function purchase(planId: string) {
  if (purchasing.value) return

  try {
    purchasing.value = true
    error.value = null
    
    const result = await billingService.purchase(planId)
    
    if (result.success) {
      successMessage.value = 'Successfully upgraded to Pro! 🎉'
      setTimeout(() => successMessage.value = null, 5000)
    } else {
      error.value = result.error || 'Purchase failed'
    }
  } catch (err: any) {
    error.value = err.message || 'Purchase failed'
  } finally {
    purchasing.value = false
  }
}

async function cancelSubscription() {
  if (actionInProgress.value) return

  try {
    actionInProgress.value = true
    error.value = null
    
    await billingService.cancelSubscription()
    successMessage.value = 'Subscription cancelled successfully'
    setTimeout(() => successMessage.value = null, 5000)
  } catch (err: any) {
    error.value = err.message || 'Failed to cancel subscription'
  } finally {
    actionInProgress.value = false
  }
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
  color: var(--color-text-primary);
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

.pro-icon {
  font-size: 1.2rem;
}

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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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

.plan-description {
  color: var(--color-text-secondary);
}

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

.pricing-card h4 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.price {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--color-text-primary);
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

.btn-subscribe:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-subscribe:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

.status-cancelled {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-expense);
}

.status-past-due {
  background: rgba(249, 250, 251, 0.9);
  color: var(--color-text-secondary);
}

.status-trialing {
  background: rgba(37, 99, 235, 0.15);
  color: var(--color-primary);
}

.subscription-details {
  margin-bottom: 2rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.detail-row.warning {
  background: rgba(249, 250, 251, 0.8);
  padding: 0.75rem;
  border-radius: 6px;
  border: none;
  margin-top: 0.5rem;
}

.detail-row .label {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.detail-row .value {
  color: var(--color-text-primary);
}

.subscription-actions {
  display: flex;
  gap: 1rem;
}

.btn-cancel,
.btn-reactivate,
.btn-upgrade {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-expense);
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.btn-cancel:hover:not(:disabled) {
  background: var(--color-expense);
  color: #fff;
}

.btn-reactivate {
  background: var(--color-primary);
  color: #fff;
}

.btn-reactivate:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-upgrade {
  background: var(--color-income);
  color: #fff;
}

.btn-upgrade:hover:not(:disabled) {
  background: #0d9665;
}

.btn-cancel:disabled,
.btn-reactivate:disabled,
.btn-upgrade:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-bg-primary);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
}

.modal-content h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--color-text-primary);
}

.modal-content p {
  margin-bottom: 1rem;
  color: var(--color-text-secondary);
}

.savings {
  color: var(--color-income);
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.btn-secondary:hover {
  background: rgba(15, 23, 42, 0.05);
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

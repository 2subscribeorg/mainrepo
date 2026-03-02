<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-warning/10 to-warning/5 px-6 py-4 border-b border-warning/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <span class="text-xl">🔗</span>
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900">Reconnect Your Bank</h2>
              <p class="text-sm text-gray-600">{{ connection?.institutionName }}</p>
            </div>
          </div>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close wizard"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Step 1: Why Reconnect -->
        <div v-if="currentStep === 'why'" class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="font-semibold text-blue-900 mb-2">Why do I need to reconnect?</h3>
            <p class="text-sm text-blue-800">
              For security, bank connections expire every 90 days. Reconnecting ensures we can continue tracking your subscriptions and transactions.
            </p>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 class="font-medium text-gray-900">Secure & Private</h4>
                <p class="text-sm text-gray-600">Your credentials are never stored. We use bank-level encryption.</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 class="font-medium text-gray-900">Quick Process</h4>
                <p class="text-sm text-gray-600">Takes less than 2 minutes to reconnect.</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 class="font-medium text-gray-900">No Data Loss</h4>
                <p class="text-sm text-gray-600">We'll backfill any missed transactions automatically.</p>
              </div>
            </div>
          </div>

          <!-- Disconnection Info -->
          <div v-if="connection?.disconnectedAt" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div class="flex items-start gap-2">
              <span class="text-amber-600">⚠️</span>
              <div>
                <h4 class="font-semibold text-amber-900">Connection Lost</h4>
                <p class="text-sm text-amber-800 mt-1">
                  Disconnected {{ formatTimeAgo(connection.disconnectedAt) }}. 
                  Transactions have not been syncing during this time.
                </p>
              </div>
            </div>
          </div>

          <div v-else-if="connection?.expiresAt" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div class="flex items-start gap-2">
              <span class="text-amber-600">⏰</span>
              <div>
                <h4 class="font-semibold text-amber-900">Expiring Soon</h4>
                <p class="text-sm text-amber-800 mt-1">
                  Connection expires {{ formatTimeAgo(connection.expiresAt) }}. 
                  Reconnect now to avoid interruption.
                </p>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-4">
            <button
              @click="$emit('close')"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Maybe Later
            </button>
            <button
              @click="currentStep = 'reconnect'"
              class="flex-1 px-4 py-2 bg-warning text-white rounded-lg hover:bg-warning/90 transition-colors font-medium"
            >
              Continue
            </button>
          </div>
        </div>

        <!-- Step 2: Reconnect -->
        <div v-else-if="currentStep === 'reconnect'" class="space-y-4">
          <div class="text-center py-6">
            <div class="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Ready to Reconnect</h3>
            <p class="text-sm text-gray-600 mb-6">
              Click the button below to securely reconnect your {{ connection?.institutionName }} account.
            </p>

            <PlaidLinkButton
              v-if="!reconnecting"
              @success="handleReconnectSuccess"
              @error="handleReconnectError"
              class="inline-flex items-center gap-2 px-6 py-3 bg-warning text-white rounded-lg hover:bg-warning/90 transition-colors font-medium"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Reconnect Bank Account
            </PlaidLinkButton>

            <div v-else class="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-lg">
              <div class="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Reconnecting...
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-2">What happens next?</h4>
            <ol class="space-y-2 text-sm text-gray-600">
              <li class="flex items-start gap-2">
                <span class="font-semibold text-warning">1.</span>
                <span>You'll be redirected to your bank's secure login page</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-semibold text-warning">2.</span>
                <span>Log in with your bank credentials (we never see these)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-semibold text-warning">3.</span>
                <span>Authorize 2Subscribe to access your transaction data</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-semibold text-warning">4.</span>
                <span>We'll automatically sync any missed transactions</span>
              </li>
            </ol>
          </div>

          <button
            @click="currentStep = 'why'"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            ← Back
          </button>
        </div>

        <!-- Step 3: Success -->
        <div v-else-if="currentStep === 'success'" class="space-y-4">
          <div class="text-center py-6">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Successfully Reconnected!</h3>
            <p class="text-sm text-gray-600 mb-6">
              Your {{ connection?.institutionName }} account is now connected and syncing.
            </p>
          </div>

          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <div>
                <h4 class="font-semibold text-green-900">What we're doing now:</h4>
                <ul class="text-sm text-green-800 mt-2 space-y-1">
                  <li>✓ Connection restored and active</li>
                  <li v-if="backfillInProgress">🔄 Backfilling missed transactions...</li>
                  <li v-else>✓ Transaction backfill complete</li>
                  <li>✓ Subscription tracking resumed</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start gap-2">
              <span class="text-blue-600">💡</span>
              <div>
                <h4 class="font-semibold text-blue-900">Pro Tip</h4>
                <p class="text-sm text-blue-800 mt-1">
                  Your connection will last another 90 days. We'll remind you before it expires again.
                </p>
              </div>
            </div>
          </div>

          <button
            @click="handleClose"
            class="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Done
          </button>
        </div>

        <!-- Step 4: Error -->
        <div v-else-if="currentStep === 'error'" class="space-y-4">
          <div class="text-center py-6">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Reconnection Failed</h3>
            <p class="text-sm text-gray-600 mb-6">
              {{ errorMessage || 'We couldn\'t reconnect your bank account. Please try again.' }}
            </p>
          </div>

          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 class="font-semibold text-red-900 mb-2">Common issues:</h4>
            <ul class="text-sm text-red-800 space-y-1">
              <li>• Incorrect bank credentials</li>
              <li>• Bank maintenance or downtime</li>
              <li>• Network connectivity issues</li>
              <li>• Browser blocking pop-ups</li>
            </ul>
          </div>

          <div class="flex gap-3">
            <button
              @click="currentStep = 'reconnect'"
              class="flex-1 px-4 py-2 bg-warning text-white rounded-lg hover:bg-warning/90 transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              @click="$emit('close')"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { BankConnection } from '@/domain/models'
import PlaidLinkButton from './PlaidLinkButton.vue'

interface Props {
  show: boolean
  connection: BankConnection | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  success: []
}>()

type WizardStep = 'why' | 'reconnect' | 'success' | 'error'

const currentStep = ref<WizardStep>('why')
const reconnecting = ref(false)
const backfillInProgress = ref(false)
const errorMessage = ref('')

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

async function handleReconnectSuccess() {
  reconnecting.value = true
  backfillInProgress.value = true
  
  // Simulate backfill process
  setTimeout(() => {
    backfillInProgress.value = false
    currentStep.value = 'success'
    reconnecting.value = false
  }, 2000)
}

function handleReconnectError(error: string) {
  errorMessage.value = error
  currentStep.value = 'error'
  reconnecting.value = false
}

function handleClose() {
  emit('success')
  emit('close')
  
  // Reset wizard state
  setTimeout(() => {
    currentStep.value = 'why'
    errorMessage.value = ''
    backfillInProgress.value = false
  }, 300)
}
</script>

<style scoped>
/* Add smooth transitions */
.transition-colors {
  transition-property: background-color, border-color, color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
</style>

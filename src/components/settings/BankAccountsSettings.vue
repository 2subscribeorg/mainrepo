<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
        <svg class="h-5 w-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-text-primary">Bank Accounts</h3>
    </div>


    <!-- Loading State -->
    <div v-if="loading && connections.length === 0" class="text-center py-8">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p class="mt-2 text-sm text-text-secondary">Loading bank connections...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="connections.length === 0" class="text-center py-12">
      <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-elevated mx-auto">
        <svg class="h-8 w-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h4 class="mt-4 text-base font-semibold text-text-primary">No bank accounts connected</h4>
      <p class="mt-2 text-sm text-text-secondary max-w-sm mx-auto">
        Connect your bank to automatically track subscription payments and transactions
      </p>
      
      <!-- Connect Button in Empty State -->
      <div class="mt-6">
        <PlaidLinkButton 
          v-if="usePlaidBackend"
          @success="handlePlaidSuccess" 
          @error="handlePlaidError" 
        />
        <button
          v-else
          :disabled="loading"
          class="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] transition-all"
          @click="handleConnectBank"
        >
          Connect Bank Account
        </button>
      </div>
    </div>

    <!-- Connected Banks -->
    <div v-else class="space-y-4">
      
      <!-- Add Another Account Link -->
      <div class="text-center pb-2">
        <PlaidLinkButton 
          v-if="usePlaidBackend"
          @success="handlePlaidSuccess" 
          @error="handlePlaidError"
          class="text-sm text-primary hover:text-primary/80 font-medium"
        >
          + Add another account
        </PlaidLinkButton>
        <button
          v-else
          :disabled="loading"
          class="text-sm text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
          @click="handleConnectBank"
        >
          + Add another account
        </button>
      </div>
      <div
        v-for="connection in connections"
        :key="connection.id"
        class="border rounded-lg p-4 bg-surface-elevated border-border-light"
      >
        <!-- Bank Header -->
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <!-- Bank Icon -->
            <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg class="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
            
            <div>
              <h4 class="font-semibold text-text-primary">{{ connection.institutionName }}</h4>
              <p class="text-xs text-text-secondary">
                {{ connection.accounts.length }} account{{ connection.accounts.length !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>

          <!-- Status Badge -->
          <span
            class="inline-flex items-center px-2 py-1 rounded text-xs font-medium status-badge"
            :class="`status-${connection.status}`"
          >
            {{ formatStatus(connection.status) }}
          </span>
        </div>

        <!-- Accounts List -->
        <div class="mt-3 space-y-2">
          <div
            v-for="account in connection.accounts"
            :key="account.id"
            class="flex items-center justify-between py-2 px-3 bg-[var(--color-surface)] rounded border border-[rgba(15,23,42,0.08)]"
          >
            <div class="flex items-center gap-2">
              <div class="text-xs font-mono text-text-secondary">••{{ account.mask }}</div>
              <span class="text-sm text-text-primary">{{ account.accountName }}</span>
              <span class="text-xs text-text-secondary capitalize">({{ account.accountType }})</span>
            </div>
            
            <div v-if="account.balance" class="text-sm font-medium text-text-primary">
              {{ formatMoney(account.balance) }}
            </div>
          </div>
        </div>

        <!-- Last Synced -->
        <div v-if="connection.lastSynced" class="mt-3 text-xs text-text-secondary">
          Last synced: {{ formatDate(connection.lastSynced) }}
        </div>

        <!-- Actions -->
        <div class="mt-3 flex gap-2">
          <button
            :disabled="loading"
            class="flex-1 rounded bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
            @click="handleSync(connection.id)"
          >
            🔄 Sync Transactions
          </button>
          
          <button
            :disabled="loading"
            class="rounded bg-danger/10 px-3 py-1.5 text-sm text-danger hover:bg-danger/20 disabled:opacity-50 transition-colors flex items-center gap-1"
            aria-label="Disconnect bank account - This action cannot be undone"
            @click="handleDisconnect(connection.id)"
          >
            <span aria-hidden="true">🗑️</span>
            Disconnect
          </button>
        </div>

        <!-- Error Message -->
        <div 
          v-if="connection.error" 
          class="mt-3 text-sm text-danger flex items-start gap-2"
          role="alert"
          aria-live="polite"
        >
          <span aria-hidden="true">⚠️</span>
          <span>
            <strong>Error:</strong> {{ connection.error }}
          </span>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div 
      v-if="error" 
      class="mt-4 rounded-lg bg-danger/10 p-4 flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <span aria-hidden="true" class="text-danger text-lg">⚠️</span>
      <div>
        <strong class="text-danger">Error:</strong>
        <p class="text-danger mt-1">{{ error }}</p>
      </div>
    </div>

    <!-- Mock Bank Connection Modal -->
    <MockBankConnectionModal
      v-if="showMockModal"
      @complete="handleMockComplete"
      @cancel="showMockModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import { useTransactionsStore } from '@/stores/transactions'
import { useTransactionManagement } from '@/composables/useTransactionManagement'
import { formatMoney } from '@/utils/formatters'
import MockBankConnectionModal from '@/components/MockBankConnectionModal.vue'
import PlaidLinkButton from '@/components/PlaidLinkButton.vue'

const bankAccountsStore = useBankAccountsStore()
const transactionsStore = useTransactionsStore()
const showMockModal = ref(false)

// Check if using Plaid backend
const usePlaidBackend = import.meta.env.VITE_USE_PLAID_BACKEND === 'true'

const connections = computed(() => bankAccountsStore.connections)
const loading = computed(() => bankAccountsStore.loading)
const error = computed(() => bankAccountsStore.error)

function formatStatus(status: string): string {
  switch (status) {
    case 'connected': return 'Connected'
    case 'reauth_required': return 'Reauth Required'
    case 'error': return 'Error'
    default: return status
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  
  return date.toLocaleDateString()
}

async function handleConnectBank() {
  // Show mock modal when not using backend
  showMockModal.value = true
}

async function handleMockComplete(publicToken: string) {
  showMockModal.value = false
  try {
    await bankAccountsStore.completeConnection(publicToken)
  } catch (e) {
    console.error('Failed to complete connection:', e)
  }
}

async function handlePlaidSuccess() {
  // Refresh connections list after successful Plaid connection
  await bankAccountsStore.fetchConnections()
  console.log('✅ Bank connected via Plaid backend!')
}

function handlePlaidError(error: string) {
  console.error('❌ Plaid connection error:', error)
}

async function handleSync(connectionId: string) {
  try {
    await bankAccountsStore.syncTransactions(connectionId)
    
    // Refresh transactions and detect patterns
    await transactionsStore.fetchTransactions()
    
    // Use business logic layer for pattern detection
    const { detectPatterns } = useTransactionManagement()
    await detectPatterns()
    
    alert('✅ Transactions synced and patterns detected!')
  } catch (e) {
    console.error('Failed to sync transactions:', e)
  }
}

async function handleDisconnect(connectionId: string) {
  try {
    await bankAccountsStore.disconnectBank(connectionId)
  } catch (e) {
    console.error('Failed to disconnect bank:', e)
  }
}

onMounted(async () => {
  await bankAccountsStore.fetchConnections()
})
</script>

<style scoped>
.status-badge {
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.status-connected {
  background-color: color-mix(in srgb, var(--color-success) 20%, transparent);
  color: var(--color-success);
}

.status-reauth_required {
  background-color: color-mix(in srgb, var(--color-primary) 20%, transparent);
  color: var(--color-primary);
}

.status-error {
  background-color: color-mix(in srgb, var(--color-danger) 20%, transparent);
  color: var(--color-danger);
}
</style>

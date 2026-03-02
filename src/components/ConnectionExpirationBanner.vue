<template>
  <div
    v-if="expiringConnections.length > 0"
    class="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
    :class="hasDisconnected ? 'border-danger/30 bg-danger/10' : 'border-warning/30 bg-warning/10'"
    role="alert"
  >
    <div class="flex items-center gap-2 text-sm font-medium" :class="hasDisconnected ? 'text-danger' : 'text-warning'">
      <span aria-hidden="true">⚠️</span>
      <span v-if="hasDisconnected">
        {{ expiringConnections.length }} bank connection{{ expiringConnections.length !== 1 ? 's' : '' }} lost — transaction sync paused.
      </span>
      <span v-else>
        {{ expiringConnections.length }} bank connection{{ expiringConnections.length !== 1 ? 's' : '' }} expiring {{ soonestExpiry }} — reconnect to keep syncing.
      </span>
    </div>
    <button
      class="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-colors"
      :class="hasDisconnected ? 'bg-danger/20 text-danger hover:bg-danger/30' : 'bg-warning/20 text-warning hover:bg-warning/30'"
      @click="openReconnectionWizard"
    >
      Reconnect
    </button>
  </div>

  <!-- Bank Reconnection Wizard -->
  <BankReconnectionWizard
    :show="showWizard"
    :connection="selectedConnection"
    @close="showWizard = false"
    @success="handleReconnectionSuccess"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import { useTransactionsStore } from '@/stores/transactions'
import BankReconnectionWizard from './BankReconnectionWizard.vue'

const bankAccountsStore = useBankAccountsStore()
const transactionsStore = useTransactionsStore()
const showWizard = ref(false)
const selectedConnection = ref<any>(null)

const expiringConnections = computed(() =>
  bankAccountsStore.connections.filter(
    (c) => c.status === 'pending_expiration' || c.status === 'disconnected'
  )
)

const hasDisconnected = computed(() =>
  expiringConnections.value.some((c) => c.status === 'disconnected')
)

const soonestExpiry = computed(() => {
  const dates = expiringConnections.value
    .filter((c) => c.status === 'pending_expiration' && c.expiresAt)
    .map((c) => new Date(c.expiresAt!).getTime())

  if (dates.length === 0) return 'soon'

  const diff = Math.ceil((Math.min(...dates) - Date.now()) / 86_400_000)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return `in ${diff} days`
})

function openReconnectionWizard() {
  // Select the first expiring/disconnected connection
  selectedConnection.value = expiringConnections.value[0]
  showWizard.value = true
}

async function handleReconnectionSuccess() {
  await bankAccountsStore.fetchConnections()
  await transactionsStore.fetchTransactions()
}
</script>

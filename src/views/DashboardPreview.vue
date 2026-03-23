<template>
  <div class="preview-root">
    <div class="preview-header">
      <h1>Dashboard UI Preview</h1>
      <p>Mock data — no auth or Firestore required</p>
      <div class="preview-controls">
        <label>
          <span>Connection status:</span>
          <select v-model="connectionStatus">
            <option value="none">None (no banner)</option>
            <option value="pending_expiration">Pending Expiration</option>
            <option value="disconnected">Disconnected</option>
          </select>
        </label>
        <label>
          <input type="checkbox" v-model="showSuggestions" /> Show suggestions
        </label>
        <label>
          <input type="checkbox" v-model="showLoading" /> Loading state
        </label>
      </div>
    </div>

    <div class="dashboard-shell">
      <h2 class="text-3xl font-bold text-gray-900">Dashboard</h2>

      <!-- Loading state -->
      <div v-if="showLoading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else class="mt-6 space-y-6">

        <!-- Expiring connections banner -->
        <div
          v-if="connectionStatus !== 'none'"
          class="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 flex items-center justify-between gap-3"
          role="alert"
        >
          <div class="flex items-center gap-2 text-sm text-warning font-medium">
            <span>⚠️</span>
            <span v-if="connectionStatus === 'disconnected'">
              1 bank connection lost — transaction sync paused.
            </span>
            <span v-else>
              1 bank connection expiring soon — reconnect to keep syncing.
            </span>
          </div>
          <button class="shrink-0 rounded-lg bg-warning/20 px-3 py-1 text-xs font-semibold text-warning hover:bg-warning/30 transition-colors">
            Reconnect
          </button>
        </div>

        <!-- Donut card -->
        <div class="donut-card">
          <div class="donut-card__header">
            <div>
              <p class="donut-card__eyebrow">Subscription categories</p>
              <h3 class="donut-card__title">{{ mockTransactions.filter(t => t.subscriptionId).length }} subscription transactions</h3>
            </div>
          </div>
          <div class="donut-card__body">
            <div class="donut-card__chart-container">
              <div class="donut-card__chart" :style="{ background: mockDonutGradient }">
                <div class="donut-card__center">
                  <p class="donut-center__value">£52.97</p>
                  <p class="donut-center__label">monthly</p>
                </div>
              </div>
            </div>

            <div class="donut-card__legend-container">
              <div class="legend-list">
                <div
                  v-for="(item, index) in mockCategories"
                  :key="item.id"
                  class="legend-item"
                  :class="{ 'legend-item--highlighted': highlightedIndex === index }"
                  @click="highlightedIndex = highlightedIndex === index ? null : index"
                >
                  <div class="legend-visual">
                    <div class="legend-dot" :style="{ background: item.colour }"></div>
                  </div>
                  <div class="legend-content">
                    <div class="legend-main">
                      <p class="legend-name">{{ item.name }}</p>
                      <p class="legend-percentage">{{ item.percentage }}%</p>
                    </div>
                    <p class="legend-count">{{ item.amount }} • {{ item.count }} subscription{{ item.count !== 1 ? 's' : '' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Subscription Suggestions -->
        <div class="bg-white rounded-2xl shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Subscription Insights</h3>
            <button class="text-sm text-blue-600 hover:underline">View All</button>
          </div>

          <div v-if="!showSuggestions" class="text-center py-6 text-gray-500">
            <p>No subscription suggestions at the moment.</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="suggestion in mockSuggestions"
              :key="suggestion.merchant"
              class="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-semibold text-text-primary">{{ suggestion.merchant }}</h3>
                    <p class="text-xs text-text-secondary">Possible subscription detected</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-text-primary">£{{ suggestion.amount.toFixed(2) }}</p>
                  <p class="text-xs text-text-secondary">{{ suggestion.frequency }}</p>
                </div>
              </div>

              <div class="text-sm text-text-secondary">
                {{ suggestion.txCount }} matching transactions • {{ Math.round(suggestion.confidence * 100) }}% confidence
              </div>

              <div class="flex gap-2">
                <button class="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-fast">
                  ✓ Confirm Subscription
                </button>
                <button class="flex-1 rounded-md border border-border-light px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover transition-fast">
                  ✗ Not a Subscription
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Action card -->
        <div class="action-card">
          <div class="action-card__content">
            <p class="action-card__label">Marked as subscriptions</p>
            <p class="action-card__value">{{ mockTransactions.filter(t => t.subscriptionId).length }}</p>
            <p class="action-card__subtitle">Bank transactions already tagged</p>
          </div>
          <button class="action-card__button">Review</button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLoadingStates } from '@/composables/useLoadingStates'

const connectionStatus = ref<'none' | 'pending_expiration' | 'disconnected'>('pending_expiration')
const showSuggestions = ref(true)
const { isLoading } = useLoadingStates()
const showLoading = isLoading('dashboardPreview')
const highlightedIndex = ref<number | null>(null)

const mockTransactions = [
  { id: 'tx-1', merchantName: 'Netflix', subscriptionId: 'sub-1' },
  { id: 'tx-2', merchantName: 'Spotify', subscriptionId: 'sub-2' },
  { id: 'tx-3', merchantName: 'Disney+', subscriptionId: 'sub-3' },
  { id: 'tx-4', merchantName: 'Amazon Prime', subscriptionId: 'sub-4' },
  { id: 'tx-5', merchantName: 'Coffee Shop', subscriptionId: undefined },
]

const mockCategories = [
  { id: 'cat-1', name: 'Entertainment', colour: '#6366f1', percentage: 55, amount: '£28.97', count: 3 },
  { id: 'cat-2', name: 'Utilities',     colour: '#10b981', percentage: 28, amount: '£14.99', count: 1 },
  { id: 'cat-3', name: 'Shopping',      colour: '#f59e0b', percentage: 17, amount: '£9.01',  count: 1 },
]

const mockSuggestions = [
  { merchant: 'Apple TV+',    amount: 8.99,  frequency: 'monthly', confidence: 0.91, txCount: 6 },
  { merchant: 'YouTube Premium', amount: 11.99, frequency: 'monthly', confidence: 0.78, txCount: 4 },
]

const mockDonutGradient = computed(() => {
  const segments = [
    { color: '#6366f1', pct: 55 },
    { color: '#10b981', pct: 28 },
    { color: '#f59e0b', pct: 17 },
  ]
  let cumulative = 0
  const parts = segments.map(s => {
    const start = cumulative
    cumulative += s.pct
    return `${s.color} ${start}% ${cumulative}%`
  })
  return `conic-gradient(${parts.join(', ')})`
})
</script>

<style scoped>
.preview-root {
  min-height: 100vh;
  background: #f8fafc;
  padding: 2rem;
  font-family: inherit;
}

.preview-header {
  background: #1e293b;
  color: white;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.preview-header h1 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.preview-header p {
  font-size: 0.75rem;
  opacity: 0.6;
  margin: 0;
}

.preview-controls {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
  margin-left: auto;
}

.preview-controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.preview-controls select {
  background: #334155;
  border: 1px solid #475569;
  color: white;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.dashboard-shell {
  max-width: 800px;
  margin: 0 auto;
}

/* Reuse Dashboard styles */
.donut-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 32px;
  padding: 2rem;
  background: var(--color-surface, white);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.donut-card__header { display: flex; justify-content: space-between; align-items: flex-start; }
.donut-card__eyebrow { font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary, #64748b); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.25rem; }
.donut-card__title { font-size: 1.25rem; font-weight: 700; color: var(--color-text-primary, #0f172a); margin: 0; }
.donut-card__body { display: flex; gap: 2rem; align-items: flex-start; flex-wrap: wrap; }
.donut-card__chart-container { flex-shrink: 0; }
.donut-card__chart {
  width: 180px; height: 180px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  mask: radial-gradient(circle, transparent 45%, black 45%);
  -webkit-mask: radial-gradient(circle, transparent 45%, black 45%);
  position: relative;
}
.donut-card__center { text-align: center; }
.donut-center__value { font-size: 1.25rem; font-weight: 700; color: var(--color-text-primary, #0f172a); margin: 0; }
.donut-center__label { font-size: 0.7rem; color: var(--color-text-secondary, #64748b); margin: 0; }
.donut-card__legend-container { flex: 1; min-width: 200px; }
.legend-list { display: flex; flex-direction: column; gap: 0.5rem; }
.legend-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: 10px; cursor: pointer; transition: background 0.15s; }
.legend-item:hover, .legend-item--highlighted { background: rgba(99,102,241,0.06); }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.legend-content { flex: 1; }
.legend-main { display: flex; justify-content: space-between; }
.legend-name { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary, #0f172a); margin: 0; }
.legend-percentage { font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary, #64748b); min-width: 2.5rem; text-align: right; }
.legend-count { font-size: 0.75rem; color: var(--color-text-secondary, #64748b); margin: 0; }

.action-card {
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 24px;
  background: color-mix(in srgb, #10b981 8%, white);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.action-card__label { font-size: 0.75rem; font-weight: 600; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.25rem; }
.action-card__value { font-size: 2rem; font-weight: 800; color: var(--color-text-primary, #0f172a); margin: 0; line-height: 1; }
.action-card__subtitle { font-size: 0.75rem; color: var(--color-text-secondary, #64748b); margin: 0.25rem 0 0; }
.action-card__button {
  border-radius: 14px; background: #10b981; color: white;
  padding: 0.75rem 1.5rem; font-weight: 600; font-size: 0.875rem;
  border: none; cursor: pointer; white-space: nowrap;
  transition: background 0.15s;
}
.action-card__button:hover { background: #059669; }

.text-warning { color: #f59e0b; }
.bg-warning\/10 { background: rgba(245, 158, 11, 0.1); }
.bg-warning\/20 { background: rgba(245, 158, 11, 0.2); }
.border-warning\/30 { border-color: rgba(245, 158, 11, 0.3); }
.hover\:bg-warning\/30:hover { background: rgba(245, 158, 11, 0.3); }
.border-primary\/30 { border-color: rgba(99, 102, 241, 0.3); }
.bg-primary\/5 { background: rgba(99, 102, 241, 0.05); }
.bg-primary\/10 { background: rgba(99, 102, 241, 0.1); }
.text-primary { color: #6366f1; }
.bg-primary { background: #6366f1; }
.bg-primary\/90:hover { background: rgba(99, 102, 241, 0.9); }
.border-border-light { border-color: rgba(15, 23, 42, 0.1); }
.text-text-primary { color: #0f172a; }
.text-text-secondary { color: #64748b; }
.hover\:bg-surface-hover:hover { background: #f1f5f9; }
</style>

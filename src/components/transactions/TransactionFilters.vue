<template>
  <div ref="containerRef" class="flex flex-wrap items-center gap-3 fade-in">
    <select 
      :value="selectedAccount" 
      @change="handleAccountChange"
      class="filter-select input-animated"
    >
      <option value="">All Accounts</option>
      <option v-for="account in accounts" :key="account.id" :value="account.id">
        {{ account.institutionName }} - {{ account.accountName }}
      </option>
    </select>

    <select 
      :value="subscriptionFilter" 
      @change="handleSubscriptionFilterChange"
      class="filter-select input-animated"
    >
      <option value="all">All Transactions</option>
      <option value="subscriptions">Subscription Transactions</option>
    </select>
    
    <button 
      @click="handleButtonClick($event, () => $emit('refresh'))"
      :disabled="loading"
      class="action-button btn-animated gpu-accelerated"
    >
      {{ loading ? 'Loading...' : 'Refresh' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { BankAccount } from '@/domain/models'
import { useAnimations } from '@/utils/useAnimations'

interface Props {
  selectedAccount: string
  subscriptionFilter: string
  accounts: BankAccount[]
  loading: boolean
}

interface Emits {
  (e: 'update:selectedAccount', value: string): void
  (e: 'update:subscriptionFilter', value: string): void
  (e: 'refresh'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// Use animation utilities
const { createRipple, prefersReducedMotion } = useAnimations()
const containerRef = ref<HTMLElement>()

function handleAccountChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:selectedAccount', target.value)
}

function handleSubscriptionFilterChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:subscriptionFilter', target.value)
}

function handleButtonClick(event: MouseEvent, action: () => void) {
  // Add ripple effect for buttons
  if (!prefersReducedMotion.value && containerRef.value) {
    const button = event.currentTarget as HTMLElement
    createRipple(event, button)
  }
  action()
}
</script>

<style scoped>
.filter-select {
  @apply rounded-2xl px-3 py-2 text-sm;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: var(--color-background);
  color: var(--color-text-primary);
  transition: border-color var(--duration-micro) var(--ease-out), 
              box-shadow var(--duration-micro) var(--ease-out),
              transform var(--duration-micro) var(--ease-out);
  transform: translateZ(0); /* GPU acceleration */
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(93, 63, 211, 0.2);
  transform: scale(1.02);
}

.action-button {
  @apply rounded-2xl px-4 py-2 text-sm font-semibold;
  background: var(--color-primary);
  color: #fff;
  transition: background var(--duration-micro) var(--ease-out), 
              transform var(--duration-micro) var(--ease-out),
              box-shadow var(--duration-micro) var(--ease-out);
  transform: translateZ(0); /* GPU acceleration */
}

.action-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 90%, white);
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.action-button--secondary {
  background: var(--color-success);
}

.action-button--secondary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-success) 90%, white);
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>

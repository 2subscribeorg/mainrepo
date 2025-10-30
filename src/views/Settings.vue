<template>
  <div>
    <h2 class="text-3xl font-bold text-gray-900">Settings</h2>

    <div class="mt-6 space-y-6">
      <!-- Data Backend -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Data Backend</h3>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900">Current Backend</p>
            <p class="text-sm text-gray-500">Read-only in Phase 1</p>
          </div>
          <span class="rounded-lg bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-800">
            {{ dataBackend }}
          </span>
        </div>
      </div>

      <!-- Database Actions -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Database</h3>
        <div class="space-y-3">
          <button
            @click="handleReset"
            :disabled="resetting"
            class="w-full rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {{ resetting ? 'Resetting...' : 'Reset & Reseed Database' }}
          </button>
          <p class="text-sm text-gray-500">
            This will clear all data and regenerate mock subscriptions and transactions.
          </p>
        </div>
      </div>

      <!-- Feature Flags -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Feature Flags</h3>
        <div class="space-y-2">
          <div
            v-for="(enabled, flag) in FEATURE_FLAGS"
            :key="flag"
            class="flex items-center justify-between py-2"
          >
            <span class="text-gray-700">{{ formatFlagName(flag) }}</span>
            <span
              class="rounded px-2 py-1 text-xs font-medium"
              :class="enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
            >
              {{ enabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
        </div>
        <p class="mt-4 text-sm text-gray-500">
          These features will be enabled in future phases.
        </p>
      </div>

      <!-- App Info -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">App Information</h3>
        <dl class="space-y-2">
          <div class="flex justify-between">
            <dt class="text-gray-600">Version</dt>
            <dd class="font-medium text-gray-900">1.0.0 (Phase 1)</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-600">Environment</dt>
            <dd class="font-medium text-gray-900">{{ ENV.IS_DEV ? 'Development' : 'Production' }}</dd>
          </div>
        </dl>
      </div>

      <!-- Stats -->
      <div class="rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
        <dl v-if="stats" class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-sm text-gray-600">Subscriptions</dt>
            <dd class="text-2xl font-bold text-gray-900">{{ stats.subscriptions }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-600">Transactions</dt>
            <dd class="text-2xl font-bold text-gray-900">{{ stats.transactions }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-600">Categories</dt>
            <dd class="text-2xl font-bold text-gray-900">{{ stats.categories }}</dd>
          </div>
          <div>
            <dt class="text-sm text-gray-600">Merchant Rules</dt>
            <dd class="text-2xl font-bold text-gray-900">{{ stats.rules }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'
import { useSubscriptionsStore } from '@/stores/subscriptions'
import { useCategoriesStore } from '@/stores/categories'
import { ENV } from '@/config/env'
import { FEATURE_FLAGS } from '@/config/featureFlags'
import { repoFactory } from '@/data/repo/RepoFactory'
import { ErrorHandlers } from '@/utils/errorHandler'

const adminStore = useAdminStore()
const subscriptionsStore = useSubscriptionsStore()
const categoriesStore = useCategoriesStore()

const resetting = ref(false)
const stats = ref<any>(null)

const dataBackend = repoFactory.getBackend()

function formatFlagName(flag: string): string {
  return flag.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

async function handleReset() {
  if (!confirm('Are you sure? This will delete all data and create new mock data.')) return

  resetting.value = true
  try {
    await adminStore.resetDatabase()
    await Promise.all([
      subscriptionsStore.fetchAll(),
      categoriesStore.fetchAll(),
    ])
    stats.value = await adminStore.getStats()
    alert('✅ Database reset successfully!')
  } catch (error) {
    // Use error handler - doesn't expose technical details
    const message = ErrorHandlers.delete(error, 'database')
    alert(message)
  } finally {
    resetting.value = false
  }
}

onMounted(async () => {
  try {
    stats.value = await adminStore.getStats()
  } catch (error) {
    // Log but don't show to user - stats are non-critical
    const message = ErrorHandlers.load(error, 'statistics')
    console.warn(message)
  }
})
</script>

<template>
  <div class="space-y-4 max-w-full overflow-x-hidden">
    <!-- Account Settings -->
    <div class="rounded-3xl bg-white/95 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)] border border-slate-100">
      <AccountSettings />
    </div>

    <!-- Bank Accounts -->
    <div class="rounded-3xl bg-white/95 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)] border border-slate-100">
      <BankAccountsSettings />
    </div>

    <!-- Platform Subscription -->
    <div class="rounded-3xl bg-white/95 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)] border border-slate-100">
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
          <svg class="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-slate-900">Platform Subscription</h3>
          <p class="mt-1 text-sm text-slate-600">
            Manage your 2Subscribe subscription plan and billing.
          </p>
          <router-link
            to="/platform-subscription"
            class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition-all"
          >
            <span>Manage Plan</span>
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AccountSettings from '@/components/settings/AccountSettings.vue'
import BankAccountsSettings from '@/components/settings/BankAccountsSettings.vue'
</script>

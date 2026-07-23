<template>
  <div class="space-y-4 max-w-full overflow-x-hidden">
    <!-- Account Settings -->
    <ErrorBoundary component="AccountSettings">
      <div class="rounded-3xl bg-surface p-5 shadow-lg border border-border-light">
        <AccountSettings />
      </div>
    </ErrorBoundary>

    <!-- Bank Accounts -->
    <ErrorBoundary component="BankAccountsSettings">
      <div class="rounded-3xl bg-surface p-5 shadow-lg border border-border-light">
        <BankAccountsSettings />
      </div>
    </ErrorBoundary>

    <ErrorBoundary component="PlatformSubscription">
      <div class="rounded-3xl bg-surface p-5 shadow-lg border border-border-light">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <CreditCard :size="24" class="text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-text-primary">Platform Subscription</h3>
            <p class="mt-1 text-sm text-text-secondary">
              Manage your 2Subscribe subscription plan and billing.
            </p>
            <router-link
              to="/platform-subscription"
              class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
            >
              <span>Manage Plan</span>
              <ChevronRight :size="16" />
            </router-link>
          </div>
        </div>
      </div>
    </ErrorBoundary>

    <ErrorBoundary component="RestorePurchases">
      <div class="rounded-3xl bg-surface p-5 shadow-lg border border-border-light">
        <RestorePurchasesSettings />
      </div>
    </ErrorBoundary>
  </div>
</template>

<script setup lang="ts">
import AccountSettings from '@/components/settings/AccountSettings.vue'
import BankAccountsSettings from '@/components/settings/BankAccountsSettings.vue'
import RestorePurchasesSettings from '@/components/settings/RestorePurchasesSettings.vue'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import { CreditCard, ChevronRight } from 'lucide-vue-next'
</script>

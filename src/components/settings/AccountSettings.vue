<template>
  <div class="account-settings">
    <div class="flex items-center gap-3 mb-6">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
        <User :size="20" class="text-text-secondary" />
      </div>
      <h3 class="text-lg font-semibold text-text-primary">Account Settings</h3>
    </div>

    <!-- Firebase Only Notice -->
    <div v-if="!isFirebaseMode" class="mb-4 p-4 bg-surface-elevated border border-border-light rounded-2xl">
      <div class="flex items-start gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-info-bg">
          <Info :size="16" class="text-info-text" />
        </div>
        <div>
          <p class="text-sm font-medium text-text-primary">Development Mode</p>
          <p class="text-xs text-text-muted mt-1">
            Account management is only available in Firebase mode.
          </p>
        </div>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Current Account Info -->
      <div class="p-4 bg-info-bg border border-info-border rounded-lg">
        <p class="text-sm font-medium text-info-text mb-1">Current Email</p>
        <div class="min-w-0">
          <p class="text-lg text-info-text-emphasis truncate" :title="userEmail">{{ userEmail }}</p>
        </div>
      </div>

      <!-- Success Message -->
      <div
        v-if="successMessage"
        class="p-3 bg-success-bg border border-success-border text-success-text rounded-lg text-sm"
      >
        <CheckCircle :size="16" class="inline-block mr-1" /> {{ successMessage }}
      </div>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm"
      >
        {{ errorMessage }}
      </div>

      <!-- Change Email Section -->
      <div class="border border-border-light rounded-lg p-4">
        <h4 class="font-medium text-text-primary mb-3">Change Email</h4>
        <form class="space-y-3" novalidate @submit.prevent="handleChangeEmail">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">
              New Email
            </label>
            <input
              v-model="newEmail"
              type="email"
              required
              placeholder="newemail@example.com"
              class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :disabled="loading"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">
              Current Password (for verification)
            </label>
            <input
              v-model="emailCurrentPassword"
              type="password"
              required
              placeholder="••••••••"
              class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :disabled="loading"
            />
          </div>
          <button
            type="submit"
            :disabled="loading || !newEmail || !emailCurrentPassword"
            class="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <span v-if="loading">Updating...</span>
            <span v-else>Update Email</span>
          </button>
        </form>
      </div>

      <!-- Change Password Section -->
      <div class="border border-border-light rounded-lg p-4">
        <h4 class="font-medium text-text-primary mb-3">Change Password</h4>
        <form class="space-y-3" novalidate @submit.prevent="handleChangePassword">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">
              Current Password
            </label>
            <input
              v-model="currentPassword"
              type="password"
              required
              placeholder="••••••••"
              class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :disabled="loading"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">
              New Password
            </label>
            <input
              v-model="newPassword"
              type="password"
              required
              placeholder="••••••••"
              minlength="8"
              class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :disabled="loading"
            />
            <p class="mt-1 text-xs text-text-muted">
              Must be at least 8 characters
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">
              Confirm New Password
            </label>
            <input
              v-model="confirmNewPassword"
              type="password"
              required
              placeholder="••••••••"
              class="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :class="passwordMismatchError ? 'border-error-border' : 'border-border-light'"
              :disabled="loading"
              @input="onConfirmNewPasswordInput"
              @blur="onConfirmNewPasswordInput"
            />
            <p v-if="passwordMismatchError" class="mt-1 text-xs text-error-text">
              New Password and Confirm New Password must be the same
            </p>
          </div>
          <button
            type="submit"
            :disabled="loading || !currentPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword"
            class="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <span v-if="loading">Updating...</span>
            <span v-else>Update Password</span>
          </button>
        </form>
      </div>

      <TwoFactorSettings />

      <!-- Export Data Section (GDPR) -->
      <div class="border border-border-light rounded-lg p-4">
        <h4 class="font-medium text-text-primary mb-2">Export My Data</h4>
        <p class="text-sm text-text-secondary mb-4">
          Download a copy of all your personal data — subscriptions, transactions, categories, and bank connections — as a CSV file. This is your right under GDPR.
        </p>
        <div
          v-if="exportError"
          class="mb-3 p-3 bg-error-bg border border-error-border text-error-text rounded-lg text-sm"
        >
          {{ exportError }}
        </div>

        <!-- Saved confirmation -->
        <div
          v-if="exportStatus === 'saved'"
          class="mb-3 p-3 bg-success-bg border border-success-border text-success-text rounded-lg text-sm"
        >
          <p class="font-medium">File saved successfully.</p>
          <p class="mt-1 text-xs opacity-80">Check the location you selected in the save dialog.</p>
        </div>

        <!-- Prepare button -->
        <button
          v-if="exportStatus !== 'ready' && exportStatus !== 'saved'"
          type="button"
          :disabled="exportStatus === 'loading'"
          class="w-full bg-surface-elevated border border-border-light text-text-primary py-2 px-4 rounded-md hover:bg-surface-elevated/80 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          @click="prepareExport"
        >
          <span v-if="exportStatus === 'loading'">Preparing your data...</span>
          <span v-else>Export My Data (CSV)</span>
        </button>

        <!-- Save button -->
        <button
          v-if="exportStatus === 'ready'"
          type="button"
          class="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 font-medium transition-colors"
          @click="triggerDownload"
        >
          Save File
        </button>
        <p v-if="exportStatus === 'ready'" class="mt-2 text-xs text-text-muted text-center">
          Your data is ready — tap Save File.
        </p>
      </div>

      <!-- Delete Account Section -->
      <div class="border border-error-border rounded-lg p-4 bg-error-bg/30">
        <h4 class="font-medium text-error-text mb-2">Danger Zone</h4>
        <p class="text-sm text-text-secondary mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <router-link
          to="/delete-account-request"
          class="block w-full text-center bg-error text-white py-2 px-4 rounded-md hover:bg-error/90 font-medium transition-colors"
        >
          Delete Account
        </router-link>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle, User, Info } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import TwoFactorSettings from './TwoFactorSettings.vue'
import { validateChangeEmailForm, validateChangePasswordForm } from '@/schemas/form-validation.schema'
import { useDataExport } from '@/composables/useDataExport'

const { userEmail, updateEmail, updatePassword, loading } = useAuth()
const { prepareExport, triggerDownload, status: exportStatus, error: exportError } = useDataExport()

const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'

// Change Email Form
const newEmail = ref('')
const emailCurrentPassword = ref('')

// Change Password Form
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const passwordMismatchError = ref(false)

// Messages
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

function onConfirmNewPasswordInput() {
  passwordMismatchError.value = !!(newPassword.value && confirmNewPassword.value && newPassword.value !== confirmNewPassword.value)
}

async function handleChangeEmail() {
  successMessage.value = null
  errorMessage.value = null

  // Validate form data using Zod schema
  const validation = validateChangeEmailForm({
    newEmail: newEmail.value,
    currentPassword: emailCurrentPassword.value
  })

  if (!validation.success) {
    errorMessage.value = validation.error?.issues?.[0]?.message || 'Invalid form data'
    return
  }

  const { success, message } = await updateEmail(validation.data.newEmail, validation.data.currentPassword)

  if (success) {
    successMessage.value = message || 'Email updated successfully!'
    newEmail.value = ''
    emailCurrentPassword.value = ''
  } else {
    errorMessage.value = message || 'Failed to update email'
  }
}

async function handleChangePassword() {
  successMessage.value = null
  errorMessage.value = null

  // Validate form data using Zod schema
  const validation = validateChangePasswordForm({
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
    confirmNewPassword: confirmNewPassword.value
  })

  if (!validation.success) {
    errorMessage.value = validation.error?.issues?.[0]?.message || 'Invalid form data'
    return
  }

  const { success, message } = await updatePassword(validation.data.currentPassword, validation.data.newPassword)

  if (success) {
    successMessage.value = message || 'Password updated successfully!'
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
  } else {
    errorMessage.value = message || 'Failed to update password'
  }
}


</script>

<style scoped>
.account-settings {
  @apply max-w-2xl;
}

/* Mobile-optimized email display */
@media (max-width: 640px) {
  .account-settings {
    @apply max-w-full;
  }
  
  .account-settings .truncate {
    word-break: break-all;
    overflow-wrap: break-word;
  }
}
</style>

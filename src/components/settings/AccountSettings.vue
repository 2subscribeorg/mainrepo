<template>
  <div class="account-settings">
    <div class="flex items-center gap-3 mb-6">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
        <svg class="h-5 w-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-text-primary">Account Settings</h3>
    </div>

    <!-- Firebase Only Notice -->
    <div v-if="!isFirebaseMode" class="mb-4 p-4 bg-surface-elevated border border-border-light rounded-2xl">
      <div class="flex items-start gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-info-bg">
          <svg class="h-4 w-4 text-info-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
        ✅ {{ successMessage }}
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
        <form @submit.prevent="handleChangeEmail" class="space-y-3">
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
        <form @submit.prevent="handleChangePassword" class="space-y-3">
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
              class="w-full px-3 py-2 border border-border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-text-primary"
              :disabled="loading"
            />
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

      <!-- Delete Account Section -->
      <div class="border border-error-border rounded-lg p-4 bg-error-bg/30">
        <h4 class="font-medium text-error-text mb-2">Danger Zone</h4>
        <p class="text-sm text-text-secondary mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          type="button"
          class="w-full bg-error text-white py-2 px-4 rounded-md hover:bg-error/90 font-medium transition-colors"
          @click="showDeleteModal = true"
        >
          Delete Account
        </button>
      </div>
    </div>

    <!-- Delete Account Modal -->
    <DeleteAccountModal
      :is-open="showDeleteModal"
      :is-deleting="isDeleting"
      :error-message="deleteErrorMessage"
      @confirm="(password) => handleDeleteAccount(password)"
      @cancel="handleCancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import DeleteAccountModal from './DeleteAccountModal.vue'

const { userEmail, updateEmail, updatePassword, deleteAccount, loading } = useAuth()

const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'

// Change Email Form
const newEmail = ref('')
const emailCurrentPassword = ref('')

// Change Password Form
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')

// Delete Account
const showDeleteModal = ref(false)
const isDeleting = ref(false)
const deleteErrorMessage = ref('')

// Messages
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

async function handleChangeEmail() {
  successMessage.value = null
  errorMessage.value = null

  const { success, message } = await updateEmail(newEmail.value, emailCurrentPassword.value)

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

  // Validate password match
  if (newPassword.value !== confirmNewPassword.value) {
    errorMessage.value = 'New passwords do not match'
    return
  }

  // Validate password length
  if (newPassword.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters'
    return
  }

  const { success, message } = await updatePassword(currentPassword.value, newPassword.value)

  if (success) {
    successMessage.value = message || 'Password updated successfully!'
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
  } else {
    errorMessage.value = message || 'Failed to update password'
  }
}

async function handleDeleteAccount(password: string) {
  deleteErrorMessage.value = ''
  isDeleting.value = true

  const { success, message } = await deleteAccount(password)

  if (success) {
    // Account deleted, user will be redirected to login by useAuth
    showDeleteModal.value = false
  } else {
    deleteErrorMessage.value = message || 'Failed to delete account'
  }
  
  isDeleting.value = false
}

function handleCancelDelete() {
  showDeleteModal.value = false
  deleteErrorMessage.value = ''
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

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="handleCancel"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isOpen"
            ref="modalRef"
            class="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            @keydown.esc="handleCancel"
          >
            <!-- Warning Icon -->
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-bg">
              <svg class="h-6 w-6 text-error-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <!-- Title -->
            <h2 id="delete-account-title" class="mt-4 text-center text-xl font-bold text-text-primary">
              Delete Account?
            </h2>

            <!-- Warning Message -->
            <div class="mt-4 space-y-3 text-sm text-text-secondary">
              <p class="font-semibold text-error-text">
                This action cannot be undone.
              </p>
              <p>
                Deleting your account will permanently remove:
              </p>
              <ul class="ml-4 list-disc space-y-1">
                <li>All your subscriptions</li>
                <li>All your transactions</li>
                <li>All your categories</li>
                <li>All your bank connections</li>
                <li>Your account settings and preferences</li>
              </ul>
              <p class="font-semibold text-text-primary">
                Are you absolutely sure you want to continue?
              </p>
            </div>

            <!-- Password Input -->
            <div class="mt-6">
              <label for="delete-password" class="block text-sm font-medium text-text-primary">
                Enter your password to confirm
              </label>
              <input
                id="delete-password"
                v-model="password"
                type="password"
                class="mt-2 w-full rounded-xl border border-border-light bg-background px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-error focus:outline-none focus:ring-2 focus:ring-error/20"
                placeholder="Enter password"
                @keydown.enter="handleConfirm"
              />
            </div>

            <!-- Confirmation Input -->
            <div class="mt-4">
              <label for="confirm-delete" class="block text-sm font-medium text-text-primary">
                Type <span class="font-bold text-error-text">DELETE</span> to confirm
              </label>
              <input
                id="confirm-delete"
                v-model="confirmationText"
                type="text"
                class="mt-2 w-full rounded-xl border border-border-light bg-background px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-error focus:outline-none focus:ring-2 focus:ring-error/20"
                placeholder="Type DELETE"
                @keydown.enter="handleConfirm"
              />
            </div>

            <!-- Error Message -->
            <p v-if="errorMessage" class="mt-3 text-sm text-error-text">
              {{ errorMessage }}
            </p>

            <!-- Actions -->
            <div class="mt-6 flex gap-3">
              <button
                type="button"
                class="flex-1 rounded-xl border border-border-light bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-elevated transition-colors"
                @click="handleCancel"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="!isConfirmationValid || isDeleting"
                class="flex-1 rounded-xl bg-error px-4 py-2.5 text-sm font-semibold text-white hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                @click="handleConfirm"
              >
                {{ isDeleting ? 'Deleting...' : 'Delete Account' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Props {
  isOpen: boolean
  isDeleting?: boolean
  errorMessage?: string
}

interface Emits {
  (e: 'confirm', password: string): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isDeleting: false,
  errorMessage: ''
})

const emit = defineEmits<Emits>()

const modalRef = ref<HTMLElement>()
const password = ref('')
const confirmationText = ref('')

const isConfirmationValid = computed(() => {
  return confirmationText.value.trim() === 'DELETE' && password.value.trim().length > 0
})

function handleConfirm() {
  if (!isConfirmationValid.value || props.isDeleting) {
    return
  }
  emit('confirm', password.value)
}

function handleCancel() {
  if (props.isDeleting) {
    return
  }
  password.value = ''
  confirmationText.value = ''
  emit('cancel')
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    modalRef.value?.focus()
  } else {
    password.value = ''
    confirmationText.value = ''
  }
})
</script>

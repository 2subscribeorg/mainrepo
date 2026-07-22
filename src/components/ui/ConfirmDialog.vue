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
        class="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4"
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
            class="relative w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            @keydown.esc="handleCancel"
          >
            <!-- Icon -->
            <div
              v-if="variant === 'danger'"
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-bg"
            >
              <svg
                class="h-6 w-6 text-error-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <!-- Title -->
            <h2
              :id="titleId"
              class="mt-4 text-center text-lg font-bold text-text-primary"
            >
              {{ title }}
            </h2>

            <!-- Message -->
            <p v-if="message" class="mt-2 text-center text-sm text-text-secondary">
              {{ message }}
            </p>

            <!-- Actions -->
            <div class="mt-6 flex gap-3">
              <button
                type="button"
                class="flex-1 rounded-xl border border-border-light bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-elevated transition-colors"
                @click="handleCancel"
              >
                {{ cancelText }}
              </button>
              <button
                type="button"
                :class="[
                  'flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors',
                  variant === 'danger'
                    ? 'bg-error hover:bg-error/90'
                    : 'bg-primary hover:bg-primary/90',
                ]"
                @click="handleConfirm"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onUnmounted } from 'vue'

interface Props {
  isOpen: boolean
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'primary',
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const modalRef = ref<HTMLElement>()
const titleId = computed(() => `confirm-dialog-title-${Math.random().toString(36).slice(2, 9)}`)

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}

let savedOverflow = ''

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      if (typeof document !== 'undefined') {
        savedOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      }
      await nextTick()
      modalRef.value?.focus()
    } else {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = savedOverflow
      }
    }
  }
)

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = savedOverflow
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="toastClasses(toast.type)"
          class="rounded-xl shadow-lg p-4 flex items-center justify-between gap-3 min-w-[300px] backdrop-blur-sm"
        >
          <div class="flex items-center gap-3 flex-1">
            <div :class="iconClasses(toast.type)">
              <component :is="getIcon(toast.type)" :size="20" />
            </div>
            <p class="text-sm font-medium text-text-primary">{{ toast.message }}</p>
          </div>
          
          <div class="flex items-center gap-2">
            <button
              v-if="toast.action"
              class="px-3 py-1 text-sm font-semibold rounded-lg transition-colors duration-150"
              :class="actionButtonClasses(toast.type)"
              @click="handleAction(toast)"
            >
              {{ toast.action.label }}
            </button>
            
            <button
              class="p-1 rounded-lg hover:bg-interactive-hover transition-colors duration-150"
              aria-label="Dismiss notification"
              @click="dismiss(toast.id)"
            >
              <X :size="16" class="text-text-secondary" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-vue-next'
import { useToast, type Toast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

function toastClasses(type: Toast['type']) {
  const base = 'border-2'
  const variants = {
    success: 'bg-success-bg border-success-border',
    error: 'bg-error-bg border-error-border',
    info: 'bg-info-bg border-info-border',
    warning: 'bg-warning-bg border-warning-border'
  }
  return `${base} ${variants[type]}`
}

function iconClasses(type: Toast['type']) {
  const variants = {
    success: 'text-success-text-emphasis',
    error: 'text-error-text-emphasis',
    info: 'text-info-text-emphasis',
    warning: 'text-warning-text-emphasis'
  }
  return variants[type]
}

function actionButtonClasses(type: Toast['type']) {
  const variants = {
    success: 'bg-success-text-emphasis text-white hover:bg-success-text-emphasis/90',
    error: 'bg-error-text-emphasis text-white hover:bg-error-text-emphasis/90',
    info: 'bg-info-text-emphasis text-white hover:bg-info-text-emphasis/90',
    warning: 'bg-warning-text-emphasis text-white hover:bg-warning-text-emphasis/90'
  }
  return variants[type]
}

function getIcon(type: Toast['type']) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle
  }
  return icons[type]
}

function handleAction(toast: Toast) {
  if (toast.action?.onClick) {
    toast.action.onClick()
    dismiss(toast.id)
  }
}
</script>

<style scoped>
/* Toast animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease-out;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-move {
  transition: transform 0.3s ease-out;
}
</style>

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
            <p class="text-sm font-medium text-gray-900">{{ toast.message }}</p>
          </div>
          
          <div class="flex items-center gap-2">
            <button
              v-if="toast.action"
              @click="handleAction(toast)"
              class="px-3 py-1 text-sm font-semibold rounded-lg transition-colors duration-150"
              :class="actionButtonClasses(toast.type)"
            >
              {{ toast.action.label }}
            </button>
            
            <button
              @click="dismiss(toast.id)"
              class="p-1 rounded-lg hover:bg-gray-100 transition-colors duration-150"
            >
              <X :size="16" class="text-gray-500" />
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
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200'
  }
  return `${base} ${variants[type]}`
}

function iconClasses(type: Toast['type']) {
  const variants = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-yellow-600'
  }
  return variants[type]
}

function actionButtonClasses(type: Toast['type']) {
  const variants = {
    success: 'bg-green-600 text-white hover:bg-green-700',
    error: 'bg-red-600 text-white hover:bg-red-700',
    info: 'bg-blue-600 text-white hover:bg-blue-700',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700'
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

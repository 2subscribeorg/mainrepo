import { ref } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

const toasts = ref<Toast[]>([])

export function useToast() {
  function show(toast: Omit<Toast, 'id'>): string {
    const id = crypto.randomUUID()
    const newToast: Toast & { duration: number } = {
      id,
      ...toast,
      duration: toast.duration ?? 5000
    }
    
    toasts.value.push(newToast)
    
    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, newToast.duration)
    }
    
    return id
  }
  
  function dismiss(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }
  
  function success(message: string, action?: Toast['action']) {
    return show({ message, type: 'success', action })
  }
  
  function error(message: string, action?: Toast['action']) {
    return show({ message, type: 'error', action })
  }
  
  function info(message: string, action?: Toast['action']) {
    return show({ message, type: 'info', action })
  }
  
  function warning(message: string, action?: Toast['action']) {
    return show({ message, type: 'warning', action })
  }
  
  return {
    toasts,
    show,
    dismiss,
    success,
    error,
    info,
    warning
  }
}

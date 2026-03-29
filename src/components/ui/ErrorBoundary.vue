<template>
  <div class="error-boundary">
    <!-- Show fallback UI when error occurs -->
    <div v-if="error" class="error-fallback">
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>Something went wrong</h2>
        <p>{{ errorMessage }}</p>
        
        <div class="error-actions">
          <button @click="retry" class="retry-button">
            Try Again
          </button>
          <button @click="reportError" class="report-button">
            Report Issue
          </button>
          <button @click="goHome" class="home-button">
            Go Home
          </button>
        </div>
        
        <!-- Error details for development -->
        <details v-if="isDevelopment" class="error-details">
          <summary>Error Details</summary>
          <pre>{{ error.stack }}</pre>
        </details>
      </div>
    </div>
    
    <!-- Show normal content when no error -->
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { ref, computed, onErrorCaptured, onMounted } from 'vue'
import { useRouter } from 'vue-router'

interface ErrorBoundaryProps {
  fallbackMessage?: string
  onError?: (error: Error, errorInfo: any) => void
  enableRetry?: boolean
}

const props = withDefaults(defineProps<ErrorBoundaryProps>(), {
  fallbackMessage: 'An unexpected error occurred. Please try again.',
  enableRetry: true
})

const router = useRouter()
const error = ref<Error | null>(null)
const errorInfo = ref<any>(null)
const retryKey = ref(0)

const isDevelopment = computed(() => import.meta.env.DEV)

const errorMessage = computed(() => {
  if (!error.value) return ''
  
  // User-friendly error messages
  const message = error.value.message.toLowerCase()
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Connection error. Please check your internet connection and try again.'
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'You don\'t have permission to access this feature.'
  }
  
  if (message.includes('not found')) {
    return 'The requested resource was not found.'
  }
  
  return props.fallbackMessage
})

// Catch errors from child components
onErrorCaptured((err: Error, instance: any, info: string) => {
  logger.error('ErrorBoundary caught an error:', err)
  logger.error('Component instance:', instance)
  logger.error('Error info:', info)
  
  error.value = err
  errorInfo.value = { instance, info }
  
  // Call custom error handler if provided
  if (props.onError) {
    props.onError(err, { instance, info })
  }
  
  // Prevent error from propagating further
  return false
})

function retry() {
  if (!props.enableRetry) return
  
  error.value = null
  errorInfo.value = null
  retryKey.value += 1
}

function reportError() {
  // In production, send to error reporting service
  if (error.value) {
    const errorData = {
      message: error.value.message,
      stack: error.value.stack,
      component: errorInfo.value?.instance?.$options?.name || 'Unknown',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
    logger.debug('Error reported:', errorData)
    
    // Show feedback to user
    alert('Error has been reported. Thank you for your feedback!')
  }
}

function goHome() {
  router.push('/')
  error.value = null
  errorInfo.value = null
}

// Expose retry method for parent components
defineExpose({
  retry,
  error: error.value,
  clearError: () => {
    error.value = null
    errorInfo.value = null
  }
})
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
}

.error-container {
  max-width: 500px;
  text-align: center;
  padding: 2rem;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-container h2 {
  color: #dc2626;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.error-container p {
  color: #7f1d1d;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.retry-button {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #b91c1c;
}

.report-button {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.report-button:hover {
  background: #4b5563;
}

.home-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.home-button:hover {
  background: #2563eb;
}

.error-details {
  margin-top: 1rem;
  text-align: left;
  background: #f3f4f6;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.error-details pre {
  font-size: 0.875rem;
  color: #6b7280;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}
</style>

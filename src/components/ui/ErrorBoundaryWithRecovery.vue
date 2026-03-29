<template>
  <div class="error-boundary">
    <!-- Show fallback UI when error occurs -->
    <div v-if="error" class="error-fallback">
      <div class="error-container" :class="{ 'error-container--retrying': isRetrying }">
        <div class="error-icon">{{ errorIcon }}</div>
        <h2>{{ errorTitle }}</h2>
        <p>{{ errorMessage }}</p>
        
        <!-- Retry progress indicator -->
        <div v-if="isRetrying" class="retry-progress">
          <div class="spinner"></div>
          <p>Retrying{{ retryCount > 0 ? ` (attempt ${retryCount + 1}/${maxRetries})` : '' }}...</p>
        </div>
        
        <!-- Auto-retry countdown -->
        <div v-if="autoRetryCountdown > 0 && !isRetrying" class="auto-retry-countdown">
          <p>Automatically retrying in {{ autoRetryCountdown }}s...</p>
          <button @click="cancelAutoRetry" class="cancel-button">Cancel</button>
        </div>
        
        <div v-if="!isRetrying && autoRetryCountdown === 0" class="error-actions">
          <button 
            @click="retry" 
            class="retry-button"
            :disabled="retryCount >= maxRetries"
          >
            {{ retryCount >= maxRetries ? 'Max Retries Reached' : 'Try Again' }}
          </button>
          
          <button 
            v-if="enablePartialRecovery && component"
            @click="reloadComponent" 
            class="reload-button"
          >
            Reload {{ component }}
          </button>
          
          <button @click="reportError" class="report-button">
            Report Issue
          </button>
          
          <button @click="goHome" class="home-button">
            Go Home
          </button>
        </div>
        
        <!-- Retry history -->
        <div v-if="retryHistory.length > 0 && isDevelopment" class="retry-history">
          <details>
            <summary>Retry History ({{ retryHistory.length }} attempts)</summary>
            <ul>
              <li v-for="(attempt, index) in retryHistory" :key="index">
                <strong>Attempt {{ index + 1 }}:</strong> {{ attempt.timestamp }} - {{ attempt.result }}
              </li>
            </ul>
          </details>
        </div>
        
        <!-- Error details for development -->
        <details v-if="isDevelopment" class="error-details">
          <summary>Error Details</summary>
          <div class="error-info">
            <p><strong>Component:</strong> {{ component || 'Unknown' }}</p>
            <p><strong>Error Type:</strong> {{ errorType }}</p>
            <p><strong>Transient:</strong> {{ isTransientError ? 'Yes' : 'No' }}</p>
            <p><strong>Retry Count:</strong> {{ retryCount }}/{{ maxRetries }}</p>
          </div>
          <pre>{{ error.stack }}</pre>
        </details>
      </div>
    </div>
    
    <!-- Show normal content when no error -->
    <slot v-else :key="retryKey" />
  </div>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { ref, computed, onErrorCaptured, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

interface ErrorBoundaryProps {
  fallbackMessage?: string
  onError?: (error: Error, errorInfo: any) => void
  enableRetry?: boolean
  maxRetries?: number
  enableAutoRetry?: boolean
  autoRetryDelay?: number
  enablePartialRecovery?: boolean
  component?: string
  retryStrategy?: 'immediate' | 'exponential' | 'linear'
}

const props = withDefaults(defineProps<ErrorBoundaryProps>(), {
  fallbackMessage: 'An unexpected error occurred. Please try again.',
  enableRetry: true,
  maxRetries: 3,
  enableAutoRetry: true,
  autoRetryDelay: 3,
  enablePartialRecovery: true,
  retryStrategy: 'exponential'
})

const emit = defineEmits<{
  error: [error: Error, errorInfo: any]
  retry: [retryCount: number]
  recovered: []
}>()

const router = useRouter()
const error = ref<Error | null>(null)
const errorInfo = ref<any>(null)
const retryKey = ref(0)
const retryCount = ref(0)
const isRetrying = ref(false)
const autoRetryCountdown = ref(0)
const retryHistory = ref<Array<{ timestamp: string; result: string }>>([])
let autoRetryTimer: ReturnType<typeof setTimeout> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

const isDevelopment = computed(() => import.meta.env.DEV)

// Determine if error is transient (network, timeout, etc.)
const isTransientError = computed(() => {
  if (!error.value) return false
  const message = error.value.message.toLowerCase()
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  )
})

const errorType = computed(() => {
  if (!error.value) return 'Unknown'
  if (isTransientError.value) return 'Transient'
  if (error.value.message.includes('permission')) return 'Permission'
  if (error.value.message.includes('not found')) return 'NotFound'
  return 'Application'
})

const errorIcon = computed(() => {
  if (isRetrying.value) return '🔄'
  if (isTransientError.value) return '📡'
  if (errorType.value === 'Permission') return '🔒'
  if (errorType.value === 'NotFound') return '🔍'
  return '⚠️'
})

const errorTitle = computed(() => {
  if (isRetrying.value) return 'Retrying...'
  if (isTransientError.value) return 'Connection Issue'
  if (errorType.value === 'Permission') return 'Access Denied'
  if (errorType.value === 'NotFound') return 'Not Found'
  return 'Something went wrong'
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  
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
  
  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.'
  }
  
  return props.fallbackMessage
})

// Calculate retry delay based on strategy
function getRetryDelay(): number {
  switch (props.retryStrategy) {
    case 'immediate':
      return 0
    case 'linear':
      return retryCount.value * 1000
    case 'exponential':
    default:
      // Exponential backoff: 1s, 2s, 4s, 8s...
      return Math.min(Math.pow(2, retryCount.value) * 1000, 10000)
  }
}

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
  
  emit('error', err, { instance, info })
  
  // Auto-retry for transient errors
  if (props.enableAutoRetry && isTransientError.value && retryCount.value < props.maxRetries) {
    startAutoRetry()
  }
  
  // Prevent error from propagating further
  return false
})

function startAutoRetry() {
  autoRetryCountdown.value = props.autoRetryDelay
  
  countdownTimer = setInterval(() => {
    autoRetryCountdown.value--
    if (autoRetryCountdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
      retry()
    }
  }, 1000)
}

function cancelAutoRetry() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  autoRetryCountdown.value = 0
}

async function retry() {
  if (!props.enableRetry || retryCount.value >= props.maxRetries) return
  
  cancelAutoRetry()
  isRetrying.value = true
  
  const delay = getRetryDelay()
  const startTime = new Date().toISOString()
  
  try {
    // Wait for retry delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // Clear error and increment retry key to force re-render
    error.value = null
    errorInfo.value = null
    retryKey.value += 1
    retryCount.value += 1
    
    // Log successful retry
    retryHistory.value.push({
      timestamp: startTime,
      result: 'Success - Component reloaded'
    })
    
    emit('retry', retryCount.value)
    emit('recovered')
    
    // Reset retry count after successful recovery
    setTimeout(() => {
      retryCount.value = 0
      retryHistory.value = []
    }, 5000)
    
  } catch (err) {
    // Log failed retry
    retryHistory.value.push({
      timestamp: startTime,
      result: `Failed - ${err instanceof Error ? err.message : 'Unknown error'}`
    })
  } finally {
    isRetrying.value = false
  }
}

function reloadComponent() {
  // Partial recovery: just reload the failed component
  error.value = null
  errorInfo.value = null
  retryKey.value += 1
  retryCount.value = 0
  retryHistory.value = []
  emit('recovered')
}

function reportError() {
  if (error.value) {
    const errorData = {
      message: error.value.message,
      stack: error.value.stack,
      component: props.component || errorInfo.value?.instance?.$options?.name || 'Unknown',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: retryCount.value,
      errorType: errorType.value,
      isTransient: isTransientError.value
    }
    
    // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
    logger.debug('Error reported:', errorData)
    
    alert('Error has been reported. Thank you for your feedback!')
  }
}

function goHome() {
  router.push('/')
  error.value = null
  errorInfo.value = null
  retryCount.value = 0
  retryHistory.value = []
  cancelAutoRetry()
}

// Cleanup timers on unmount
onUnmounted(() => {
  cancelAutoRetry()
  if (autoRetryTimer) {
    clearTimeout(autoRetryTimer)
  }
})

// Expose methods for parent components
defineExpose({
  retry,
  reloadComponent,
  error: computed(() => error.value),
  retryCount: computed(() => retryCount.value),
  clearError: () => {
    error.value = null
    errorInfo.value = null
    retryCount.value = 0
    retryHistory.value = []
    cancelAutoRetry()
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
  max-width: 600px;
  text-align: center;
  padding: 2rem;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.error-container--retrying {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.error-container h2 {
  color: #dc2626;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.error-container--retrying h2 {
  color: #2563eb;
}

.error-container p {
  color: #7f1d1d;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.error-container--retrying p {
  color: #1e40af;
}

.retry-progress {
  margin: 1.5rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auto-retry-countdown {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.auto-retry-countdown p {
  color: #92400e;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.cancel-button {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button:hover {
  background: #4b5563;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.retry-button,
.reload-button,
.report-button,
.home-button {
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.retry-button {
  background: #dc2626;
  color: white;
}

.retry-button:hover:not(:disabled) {
  background: #b91c1c;
}

.retry-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.reload-button {
  background: #10b981;
  color: white;
}

.reload-button:hover {
  background: #059669;
}

.report-button {
  background: #6b7280;
  color: white;
}

.report-button:hover {
  background: #4b5563;
}

.home-button {
  background: #3b82f6;
  color: white;
}

.home-button:hover {
  background: #2563eb;
}

.retry-history {
  margin-top: 1rem;
  text-align: left;
  background: #f9fafb;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.retry-history summary {
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.retry-history ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
}

.retry-history li {
  font-size: 0.875rem;
  color: #6b7280;
  padding: 0.25rem 0;
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

.error-info {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #d1d5db;
}

.error-info p {
  font-size: 0.875rem;
  color: #4b5563;
  margin: 0.25rem 0;
}

.error-details pre {
  font-size: 0.875rem;
  color: #6b7280;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
}
</style>

<template>
  <div class="async-error-boundary">
    <!-- Show loading state -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
    
    <!-- Show error state -->
    <div v-else-if="error" class="async-error">
      <div class="async-error-container">
        <div class="error-icon">⚠️</div>
        <h3>{{ errorTitle }}</h3>
        <p>{{ errorMessage }}</p>
        
        <div class="async-error-actions">
          <button @click="retry" class="retry-button" :disabled="isRetrying">
            <span v-if="isRetrying">Retrying...</span>
            <span v-else>🔄 Retry</span>
          </button>
          <button @click="dismiss" class="dismiss-button">
            ✕ Dismiss
          </button>
        </div>
        
        <!-- Progress indicator for retry -->
        <div v-if="isRetrying" class="retry-progress">
          <div class="progress-bar"></div>
        </div>
      </div>
    </div>
    
    <!-- Show normal content -->
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { ref, computed, onErrorCaptured } from 'vue'

interface AsyncErrorBoundaryProps {
  loadingMessage?: string
  fallbackMessage?: string
  maxRetries?: number
  retryDelay?: number
}

const props = withDefaults(defineProps<AsyncErrorBoundaryProps>(), {
  loadingMessage: 'Loading...',
  fallbackMessage: 'Failed to load content. Please try again.',
  maxRetries: 3,
  retryDelay: 1000
})

const error = ref<Error | null>(null)
const isLoading = ref(false)
const isRetrying = ref(false)
const retryCount = ref(0)

const errorTitle = computed(() => {
  if (!error.value) return ''
  
  const message = error.value.message.toLowerCase()
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Connection Error'
  }
  
  if (message.includes('timeout')) {
    return 'Request Timeout'
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'Access Error'
  }
  
  return 'Loading Error'
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  
  const message = error.value.message.toLowerCase()
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.'
  }
  
  if (message.includes('timeout')) {
    return 'The request took too long to complete. Please try again.'
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'You don\'t have permission to access this content.'
  }
  
  return props.fallbackMessage
})

onErrorCaptured((err: Error) => {
  logger.error('AsyncErrorBoundary caught error:', err)
  error.value = err
  return false
})

async function retry() {
  if (retryCount.value >= props.maxRetries) {
    return
  }
  
  isRetrying.value = true
  retryCount.value += 1
  
  // Simulate retry delay
  await new Promise(resolve => setTimeout(resolve, props.retryDelay))
  
  // Clear error and retry
  error.value = null
  isRetrying.value = false
}

function dismiss() {
  error.value = null
  retryCount.value = 0
}

// Expose methods for parent components
defineExpose({
  retry,
  dismiss,
  setLoading: (loading: boolean) => {
    isLoading.value = loading
  },
  setError: (err: Error) => {
    error.value = err
  }
})
</script>

<style scoped>
.async-error-boundary {
  width: 100%;
  position: relative;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 200px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  color: #6b7280;
  font-size: 0.875rem;
}

.async-error {
  padding: 1.5rem;
}

.async-error-container {
  max-width: 400px;
  text-align: center;
  padding: 1.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 0 auto;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.async-error-container h3 {
  color: #dc2626;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.async-error-container p {
  color: #7f1d1d;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  line-height: 1.4;
}

.async-error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.retry-button {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.retry-button:hover:not(:disabled) {
  background: #b91c1c;
}

.retry-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.dismiss-button {
  background: #6b7280;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dismiss-button:hover {
  background: #4b5563;
}

.retry-progress {
  margin-top: 1rem;
}

.progress-bar {
  height: 3px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar::after {
  content: '';
  display: block;
  height: 100%;
  width: 30%;
  background: #3b82f6;
  border-radius: 2px;
  animation: progress 1s ease-in-out infinite;
}

@keyframes progress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
</style>

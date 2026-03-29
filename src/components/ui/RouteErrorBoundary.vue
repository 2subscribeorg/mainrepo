<template>
  <div class="route-error-boundary">
    <div v-if="error" class="route-error">
      <div class="route-error-container">
        <h1>🚫 Page Error</h1>
        <h2>{{ errorTitle }}</h2>
        <p>{{ errorMessage }}</p>
        
        <div class="route-actions">
          <button @click="goBack" class="action-button back-button">
            ← Go Back
          </button>
          <button @click="goHome" class="action-button home-button">
            🏠 Home
          </button>
          <button @click="retry" class="action-button retry-button">
            🔄 Retry
          </button>
        </div>
        
        <!-- Navigation suggestions -->
        <div class="navigation-suggestions">
          <h3>Try these pages:</h3>
          <div class="suggested-links">
            <router-link to="/" class="suggested-link">Dashboard</router-link>
            <router-link to="/transactions" class="suggested-link">Transactions</router-link>
            <router-link to="/categories" class="suggested-link">Categories</router-link>
            <router-link to="/settings" class="suggested-link">Settings</router-link>
          </div>
        </div>
      </div>
    </div>
    
    <slot v-else :key="retryKey" />
  </div>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { ref, computed, onErrorCaptured, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const error = ref<Error | null>(null)
const retryKey = ref(0)

const errorTitle = computed(() => {
  if (!error.value) return ''
  
  const message = error.value.message.toLowerCase()
  
  if (message.includes('not found') || message.includes('404')) {
    return 'Page Not Found'
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'Access Denied'
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Connection Error'
  }
  
  return 'Page Error'
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  
  const message = error.value.message.toLowerCase()
  
  if (message.includes('not found') || message.includes('404')) {
    return `The page "${route.path}" could not be found. It may have been moved or deleted.`
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'You don\'t have permission to access this page. Please sign in with the correct account.'
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to load this page due to connection issues. Please check your internet connection.'
  }
  
  return 'An error occurred while loading this page. Please try again.'
})

onErrorCaptured((err: Error) => {
  logger.error('RouteErrorBoundary caught error:', err)
  error.value = err
  return false
})

// Watch for route changes and clear errors
watch(route, () => {
  error.value = null
})

function retry() {
  error.value = null
  retryKey.value += 1
}

function goBack() {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
  error.value = null
}

function goHome() {
  router.push('/')
  error.value = null
}
</script>

<style scoped>
.route-error-boundary {
  width: 100%;
  min-height: 100vh;
}

.route-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.route-error-container {
  max-width: 600px;
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.route-error-container h1 {
  font-size: 4rem;
  margin-bottom: 1rem;
  line-height: 1;
}

.route-error-container h2 {
  color: #1f2937;
  margin-bottom: 1rem;
  font-size: 2rem;
  font-weight: 600;
}

.route-error-container p {
  color: #6b7280;
  margin-bottom: 2rem;
  font-size: 1.1rem;
  line-height: 1.6;
}

.route-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.back-button {
  background: #6b7280;
  color: white;
}

.back-button:hover {
  background: #4b5563;
}

.home-button {
  background: #3b82f6;
  color: white;
}

.home-button:hover {
  background: #2563eb;
}

.retry-button {
  background: #10b981;
  color: white;
}

.retry-button:hover {
  background: #059669;
}

.navigation-suggestions {
  border-top: 1px solid #e5e7eb;
  padding-top: 2rem;
}

.navigation-suggestions h3 {
  color: #374151;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.suggested-links {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.suggested-link {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  color: #374151;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s;
  font-weight: 500;
}

.suggested-link:hover {
  background: #3b82f6;
  color: white;
}
</style>
